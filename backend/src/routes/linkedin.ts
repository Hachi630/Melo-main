import { Router } from "express";
import qs from "qs";
import axios from "axios";

import LinkedInToken from "../models/LinkedInToken";
import { generateToken } from "../utils/jwt";
import { requireAuth } from "../middleware/auth";
import {
  getLinkedInMemberId,
  getTotalConnections,
  getLinkedInFollowers,
  getProfileViews,
  getLinkedInProfile,
  getAdministeredOrganizations,
  createLinkedInPost,
  createLinkedInPostWithImage,
  initializeImageUpload,
  uploadImageToLinkedIn,
  deleteLinkedInPost,
  // Events API
  getOrganizationEvents,
  getMyEvents,
  getEventById,
  createLinkedInEvent,
  updateLinkedInEvent,
  deleteLinkedInEvent,
  // Comments API
  getPostComments,
  createComment,
  editComment,
  deleteComment,
  // Reactions API
  getPostReactions,
  addReaction,
  removeReaction,
  ReactionType,
  // Video & Link posts
  initializeVideoUpload,
  uploadVideoToLinkedIn,
  createLinkedInPostWithVideo,
  createLinkedInPostWithLink,
} from "../services/linkedinService";

const router = Router();

// STEP 1 — Redirect to LinkedIn OAuth
// Bug 1 Fix: Accept userId as query param and encode it in state
router.get("/auth", (req, res) => {
  const userId = req.query.userId as string;
  
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  // Encode userId in state so we can retrieve it in callback
  const state = JSON.stringify({ userId, nonce: Math.random().toString(36) });
  const encodedState = Buffer.from(state).toString('base64');

  // LinkedIn API scopes
  // - openid, profile, email: Sign In with LinkedIn using OpenID Connect
  // - w_member_social: Share on LinkedIn (required for posting)
  // - r_events: Read organization events
  // - rw_events: Create/update/delete organization events
  const scopes = "openid profile email w_member_social r_events rw_events";
  
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LI_CLIENT_ID!,
    redirect_uri: process.env.LI_REDIRECT_URI!,
    scope: scopes,
    state: encodedState,
  });
  
  console.log("LinkedIn OAuth redirect URL:", `https://www.linkedin.com/oauth/v2/authorization?${params}`);

  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

// STEP 2 — Receive LinkedIn code, exchange for token
// Bug 2 Fix: Add try-catch error handling
router.get("/callback", async (req, res) => {
  const code = req.query.code as string;
  const stateParam = req.query.state as string;
  const error = req.query.error as string;
  const errorDescription = req.query.error_description as string;

  // Handle LinkedIn authorization errors (user denied, etc.)
  if (error) {
    console.error("LinkedIn OAuth denied:", error, errorDescription);
    return res.redirect(`${process.env.CLIENT_URL}/socialdashboard?linkedin=error&reason=${encodeURIComponent(error)}`);
  }

  // Check if code is present
  if (!code) {
    console.error("LinkedIn OAuth: No authorization code received");
    return res.redirect(`${process.env.CLIENT_URL}/socialdashboard?linkedin=error&reason=no_code`);
  }

  // Bug 1 Fix: Decode userId from state parameter
  let userId: string | undefined;
  try {
    const decodedState = Buffer.from(stateParam, 'base64').toString('utf-8');
    const stateData = JSON.parse(decodedState);
    userId = stateData.userId;
  } catch {
    return res.redirect(`${process.env.CLIENT_URL}/socialdashboard?linkedin=error&reason=invalid_state`);
  }

  if (!userId) {
    return res.redirect(`${process.env.CLIENT_URL}/socialdashboard?linkedin=error&reason=missing_user`);
  }

  try {
    const body = qs.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.LI_REDIRECT_URI!,
      client_id: process.env.LI_CLIENT_ID!,
      client_secret: process.env.LI_CLIENT_SECRET!,
    });

    const { data } = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      body,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = data.access_token;

    // Get LinkedIn user ID
    const liMemberId = await getLinkedInMemberId(accessToken);

    await LinkedInToken.findOneAndUpdate(
      { userId },
      {
        userId,
        liMemberId,
        accessToken,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
      { upsert: true }
    );

    res.redirect(`${process.env.CLIENT_URL}/socialdashboard?linkedin=connected`);
  } catch (error: any) {
    console.error("LinkedIn OAuth error:", error?.response?.data || error.message || error);
    res.redirect(`${process.env.CLIENT_URL}/socialdashboard?linkedin=error&reason=token_exchange_failed`);
  }
});

// STEP 3 — Disconnect LinkedIn account
router.delete("/disconnect", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  
  try {
    const result = await LinkedInToken.findOneAndDelete({ userId });
    
    if (!result) {
      return res.json({ success: true, message: "No LinkedIn account was connected" });
    }
    
    console.log(`LinkedIn disconnected for user ${userId}`);
    res.json({ success: true, message: "LinkedIn account disconnected successfully" });
  } catch (error: any) {
    console.error("Error disconnecting LinkedIn:", error.message);
    res.status(500).json({ success: false, error: "Failed to disconnect LinkedIn account" });
  }
});

// STEP 4 — Fetch metrics
router.get("/metrics", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken) {
    return res.json({
      connected: false,
      followers: { available: false },
      connections: { available: false },
      profileViews: { available: false },
      profile: null,
    });
  }

  // Get profile info and metrics in parallel
  const [profile, followers, connections, profileViews] = await Promise.all([
    getLinkedInProfile(token.accessToken),
    getLinkedInFollowers(token.accessToken),
    getTotalConnections(token.accessToken, token.liMemberId!),
    getProfileViews(),
  ]);

  res.json({
    connected: true,
    profile: profile,
    followers: followers !== null ? { available: true, value: followers } : { available: false, reason: "Requires Marketing API permissions" },
    connections: connections !== null ? { available: true, value: connections } : { available: false, reason: "Requires r_1st_connections_size scope" },
    profileViews: { available: false, reason: "Not exposed by LinkedIn API" },
  });
});

// ============================================
// Organization / Company Page Routes
// ============================================

// STEP 5 — Get administered organizations (company pages)
router.get("/organizations", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken) {
    return res.json({ success: false, organizations: [], error: "LinkedIn account not connected" });
  }

  const result = await getAdministeredOrganizations(token.accessToken);
  res.json(result);
});

// ============================================
// Share on LinkedIn API Routes
// ============================================

// STEP 6 — Create a text post on LinkedIn (supports personal and organization)
router.post("/posts", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { text, organizationId } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ success: false, error: "Post text is required" });
  }

  if (text.length > 3000) {
    return res.status(400).json({ success: false, error: "Post text cannot exceed 3000 characters" });
  }

  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken || !token?.liMemberId) {
    return res.status(401).json({ success: false, error: "LinkedIn account not connected" });
  }

  // Determine if posting to organization or personal
  const isOrganization = !!organizationId;
  const authorId = isOrganization ? organizationId : token.liMemberId;

  const result = await createLinkedInPost(token.accessToken, authorId, text, isOrganization);
  
  if (result.success) {
    res.json({ success: true, postId: result.postId, message: `Post created successfully on ${isOrganization ? 'company page' : 'personal profile'}!` });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// STEP 7 — Initialize image upload (supports personal and organization)
router.post("/images/initialize", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { organizationId } = req.body;
  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken || !token?.liMemberId) {
    return res.status(401).json({ success: false, error: "LinkedIn account not connected" });
  }

  // Determine if uploading for organization or personal
  const isOrganization = !!organizationId;
  const ownerId = isOrganization ? organizationId : token.liMemberId;

  const result = await initializeImageUpload(token.accessToken, ownerId, isOrganization);
  
  if (result.success) {
    res.json({ success: true, uploadUrl: result.uploadUrl, imageUrn: result.imageUrn });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// STEP 7 — Upload image binary (proxy to LinkedIn)
router.post("/images/upload", requireAuth, async (req: any, res) => {
  const { uploadUrl } = req.body;
  
  if (!uploadUrl) {
    return res.status(400).json({ success: false, error: "uploadUrl is required" });
  }

  // Get the raw image data from the request body
  const contentType = req.headers["content-type"] || "image/jpeg";
  
  // For binary uploads, we need to handle raw body
  // This route expects the image to be sent as base64 in the body
  const { imageData } = req.body;
  
  if (!imageData) {
    return res.status(400).json({ success: false, error: "imageData (base64) is required" });
  }

  try {
    const imageBuffer = Buffer.from(imageData, "base64");
    const result = await uploadImageToLinkedIn(uploadUrl, imageBuffer, "image/jpeg");
    
    if (result.success) {
      res.json({ success: true, message: "Image uploaded successfully" });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// STEP 9 — Create post with image (supports personal and organization)
router.post("/posts/with-image", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { text, imageUrn, organizationId } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ success: false, error: "Post text is required" });
  }

  if (!imageUrn) {
    return res.status(400).json({ success: false, error: "imageUrn is required" });
  }

  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken || !token?.liMemberId) {
    return res.status(401).json({ success: false, error: "LinkedIn account not connected" });
  }

  // Determine if posting to organization or personal
  const isOrganization = !!organizationId;
  const authorId = isOrganization ? organizationId : token.liMemberId;

  const result = await createLinkedInPostWithImage(token.accessToken, authorId, text, imageUrn, isOrganization);
  
  if (result.success) {
    res.json({ success: true, postId: result.postId, message: "Post with image created successfully!" });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// STEP 9 — Delete a post
router.delete("/posts/:postUrn", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { postUrn } = req.params;

  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken) {
    return res.status(401).json({ success: false, error: "LinkedIn account not connected" });
  }

  const result = await deleteLinkedInPost(token.accessToken, postUrn);
  
  if (result.success) {
    res.json({ success: true, message: "Post deleted successfully" });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// ============================================
// LinkedIn Events API Routes (r_events, rw_events)
// ============================================

// STEP 10 — Get my events (viewer's events)
router.get("/events", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken) {
    return res.json({ success: false, events: [], error: "LinkedIn account not connected" });
  }

  const result = await getMyEvents(token.accessToken);
  res.json(result);
});

// STEP 11 — Get organization events
router.get("/events/organization/:organizationId", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { organizationId } = req.params;
  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken) {
    return res.json({ success: false, events: [], error: "LinkedIn account not connected" });
  }

  const result = await getOrganizationEvents(token.accessToken, organizationId);
  res.json(result);
});

// STEP 12 — Get a single event by ID
router.get("/events/:eventId", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { eventId } = req.params;
  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken) {
    return res.status(401).json({ success: false, error: "LinkedIn account not connected" });
  }

  const result = await getEventById(token.accessToken, eventId);
  res.json(result);
});

// STEP 13 — Create a new event
router.post("/events", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { organizationId, name, description, startAt, endAt, eventUrl, eventType, locale } = req.body;

  if (!organizationId) {
    return res.status(400).json({ success: false, error: "organizationId is required" });
  }

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ success: false, error: "Event name is required" });
  }

  if (!startAt) {
    return res.status(400).json({ success: false, error: "Event start time is required" });
  }

  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken) {
    return res.status(401).json({ success: false, error: "LinkedIn account not connected" });
  }

  const result = await createLinkedInEvent(token.accessToken, organizationId, {
    name,
    description,
    startAt,
    endAt,
    eventUrl,
    eventType,
    locale
  });

  if (result.success) {
    res.json({ success: true, eventId: result.eventId, message: "Event created successfully!" });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// STEP 14 — Update an event
router.patch("/events/:eventId", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { eventId } = req.params;
  const { name, description, startAt, endAt, eventUrl, eventType, locale } = req.body;

  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken) {
    return res.status(401).json({ success: false, error: "LinkedIn account not connected" });
  }

  const result = await updateLinkedInEvent(token.accessToken, eventId, {
    name,
    description,
    startAt,
    endAt,
    eventUrl,
    eventType,
    locale
  });

  if (result.success) {
    res.json({ success: true, message: "Event updated successfully!" });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// STEP 15 — Delete an event
router.delete("/events/:eventId", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { eventId } = req.params;

  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken) {
    return res.status(401).json({ success: false, error: "LinkedIn account not connected" });
  }

  const result = await deleteLinkedInEvent(token.accessToken, eventId);

  if (result.success) {
    res.json({ success: true, message: "Event deleted successfully" });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// ============================================
// LinkedIn Comments API Routes (w_member_social)
// ============================================

// STEP 16 — Get comments on a post
router.get("/posts/:postUrn/comments", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { postUrn } = req.params;

  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken) {
    return res.json({ success: false, comments: [], error: "LinkedIn account not connected" });
  }

  const result = await getPostComments(token.accessToken, decodeURIComponent(postUrn));
  res.json(result);
});

// STEP 17 — Create a comment on a post
router.post("/posts/:postUrn/comments", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { postUrn } = req.params;
  const { text, organizationId } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ success: false, error: "Comment text is required" });
  }

  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken || !token?.liMemberId) {
    return res.status(401).json({ success: false, error: "LinkedIn account not connected" });
  }

  // Determine actor (organization or personal)
  const actorUrn = organizationId 
    ? `urn:li:organization:${organizationId}` 
    : `urn:li:person:${token.liMemberId}`;

  const result = await createComment(
    token.accessToken, 
    decodeURIComponent(postUrn), 
    text, 
    actorUrn
  );
  
  if (result.success) {
    res.json({ success: true, commentUrn: result.commentUrn, message: "Comment created successfully!" });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// STEP 18 — Edit a comment
router.patch("/posts/:postUrn/comments/:commentUrn", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { postUrn, commentUrn } = req.params;
  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ success: false, error: "Comment text is required" });
  }

  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken) {
    return res.status(401).json({ success: false, error: "LinkedIn account not connected" });
  }

  const result = await editComment(
    token.accessToken,
    decodeURIComponent(postUrn),
    decodeURIComponent(commentUrn),
    text
  );
  
  if (result.success) {
    res.json({ success: true, message: "Comment updated successfully!" });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// STEP 19 — Delete a comment
router.delete("/posts/:postUrn/comments/:commentUrn", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { postUrn, commentUrn } = req.params;

  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken) {
    return res.status(401).json({ success: false, error: "LinkedIn account not connected" });
  }

  const result = await deleteComment(
    token.accessToken,
    decodeURIComponent(postUrn),
    decodeURIComponent(commentUrn)
  );
  
  if (result.success) {
    res.json({ success: true, message: "Comment deleted successfully" });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// ============================================
// LinkedIn Reactions API Routes (w_member_social)
// ============================================

// STEP 20 — Get reactions on a post
router.get("/posts/:postUrn/reactions", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { postUrn } = req.params;

  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken) {
    return res.json({ success: false, reactions: [], error: "LinkedIn account not connected" });
  }

  const result = await getPostReactions(token.accessToken, decodeURIComponent(postUrn));
  res.json(result);
});

// STEP 21 — Add a reaction to a post
router.post("/posts/:postUrn/reactions", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { postUrn } = req.params;
  const { reactionType, organizationId } = req.body;

  const validReactions: ReactionType[] = ["LIKE", "CELEBRATE", "SUPPORT", "LOVE", "INSIGHTFUL", "CURIOUS"];
  
  if (reactionType && !validReactions.includes(reactionType)) {
    return res.status(400).json({ 
      success: false, 
      error: `Invalid reaction type. Must be one of: ${validReactions.join(", ")}` 
    });
  }

  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken || !token?.liMemberId) {
    return res.status(401).json({ success: false, error: "LinkedIn account not connected" });
  }

  // Determine actor (organization or personal)
  const actorUrn = organizationId 
    ? `urn:li:organization:${organizationId}` 
    : `urn:li:person:${token.liMemberId}`;

  const result = await addReaction(
    token.accessToken, 
    decodeURIComponent(postUrn), 
    actorUrn,
    reactionType || "LIKE"
  );
  
  if (result.success) {
    res.json({ success: true, message: `${reactionType || "LIKE"} reaction added!` });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// STEP 22 — Remove a reaction from a post
router.delete("/posts/:postUrn/reactions", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { postUrn } = req.params;
  const { organizationId } = req.query;

  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken || !token?.liMemberId) {
    return res.status(401).json({ success: false, error: "LinkedIn account not connected" });
  }

  // Determine actor (organization or personal)
  const actorUrn = organizationId 
    ? `urn:li:organization:${organizationId}` 
    : `urn:li:person:${token.liMemberId}`;

  const result = await removeReaction(
    token.accessToken,
    decodeURIComponent(postUrn),
    actorUrn
  );
  
  if (result.success) {
    res.json({ success: true, message: "Reaction removed" });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// ============================================
// LinkedIn Video & Link Post Routes (w_member_social)
// ============================================

// STEP 23 — Initialize video upload
router.post("/videos/initialize", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { organizationId, fileSizeBytes } = req.body;

  if (!fileSizeBytes) {
    return res.status(400).json({ success: false, error: "fileSizeBytes is required" });
  }

  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken || !token?.liMemberId) {
    return res.status(401).json({ success: false, error: "LinkedIn account not connected" });
  }

  const isOrganization = !!organizationId;
  const ownerId = isOrganization ? organizationId : token.liMemberId;

  const result = await initializeVideoUpload(token.accessToken, ownerId, isOrganization, fileSizeBytes);
  
  if (result.success) {
    res.json({ success: true, uploadUrl: result.uploadUrl, videoUrn: result.videoUrn });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// STEP 24 — Upload video binary
router.post("/videos/upload", requireAuth, async (req: any, res) => {
  const { uploadUrl, videoData } = req.body;
  
  if (!uploadUrl) {
    return res.status(400).json({ success: false, error: "uploadUrl is required" });
  }

  if (!videoData) {
    return res.status(400).json({ success: false, error: "videoData (base64) is required" });
  }

  try {
    const videoBuffer = Buffer.from(videoData, "base64");
    const result = await uploadVideoToLinkedIn(uploadUrl, videoBuffer, "video/mp4");
    
    if (result.success) {
      res.json({ success: true, message: "Video uploaded successfully" });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// STEP 25 — Create post with video
router.post("/posts/with-video", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { text, videoUrn, organizationId } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ success: false, error: "Post text is required" });
  }

  if (!videoUrn) {
    return res.status(400).json({ success: false, error: "videoUrn is required" });
  }

  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken || !token?.liMemberId) {
    return res.status(401).json({ success: false, error: "LinkedIn account not connected" });
  }

  const isOrganization = !!organizationId;
  const authorId = isOrganization ? organizationId : token.liMemberId;

  const result = await createLinkedInPostWithVideo(token.accessToken, authorId, text, videoUrn, isOrganization);
  
  if (result.success) {
    res.json({ success: true, postId: result.postId, message: "Video post created successfully!" });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// STEP 26 — Create post with link/article
router.post("/posts/with-link", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { text, linkUrl, linkTitle, linkDescription, organizationId } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ success: false, error: "Post text is required" });
  }

  if (!linkUrl) {
    return res.status(400).json({ success: false, error: "linkUrl is required" });
  }

  const token = await LinkedInToken.findOne({ userId });

  if (!token?.accessToken || !token?.liMemberId) {
    return res.status(401).json({ success: false, error: "LinkedIn account not connected" });
  }

  const isOrganization = !!organizationId;
  const authorId = isOrganization ? organizationId : token.liMemberId;

  const result = await createLinkedInPostWithLink(
    token.accessToken, 
    authorId, 
    text, 
    linkUrl, 
    linkTitle, 
    linkDescription, 
    isOrganization
  );
  
  if (result.success) {
    res.json({ success: true, postId: result.postId, message: "Link post created successfully!" });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

export default router;
