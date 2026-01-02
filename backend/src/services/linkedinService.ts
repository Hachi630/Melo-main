import axios from "axios";

const li = (token: string) =>
  axios.create({
    baseURL: "https://api.linkedin.com",
    headers: { Authorization: `Bearer ${token}` }
  });

export async function getLinkedInMemberId(token: string) {
  try {
    // Use OpenID Connect userinfo endpoint (works with openid profile email scopes)
    const { data } = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data.sub; // 'sub' is the member ID in OpenID Connect
  } catch (error: any) {
    console.error("Failed to get LinkedIn member ID:", error?.response?.data || error.message);
    return null;
  }
}

export async function getLinkedInFollowers(token: string) {
  try {
    // Note: This endpoint requires specific LinkedIn products (Marketing API or similar)
    // It may not work with basic Sign In with LinkedIn permissions
    const { data } = await li(token).get("/v2/networkSizes/urn:li:person:me", {
      params: { edgeType: "CompanyFollowedByMember" },
      headers: { "X-Restli-Protocol-Version": "2.0.0" },
    });
    return data?.firstDegreeSize ?? null;
  } catch (error: any) {
    console.log("Follower count not available (requires Marketing API):", error?.response?.status);
    return null;
  }
}

export async function getTotalConnections(token: string, memberId: string) {
  try {
    // Note: This endpoint requires r_1st_connections_size scope which needs partner approval
    const { data } = await li(token).get(
      `/v2/networkSizes/${memberId ? `urn:li:person:${memberId}` : 'urn:li:person:me'}`,
      { 
        params: { edgeType: "CompanyFollowedByMember" },
        headers: { "X-Restli-Protocol-Version": "2.0.0" }
      }
    );
    return data?.firstDegreeSize ?? null;
  } catch (error: any) {
    console.log("Connection count not available (requires special permissions):", error?.response?.status);
    return null;
  }
}

export function getProfileViews() {
  return null; // LinkedIn does NOT expose this API publicly
}

// Get basic profile info (works with openid profile email scopes)
export async function getLinkedInProfile(token: string) {
  try {
    // Use OpenID Connect userinfo endpoint
    const { data } = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log("LinkedIn profile data:", data);
    
    return {
      id: data.sub,
      name: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
      email: data.email,
      picture: data.picture,
    };
  } catch (error: any) {
    console.error("Failed to get LinkedIn profile:", error?.response?.data || error.message);
    return null;
  }
}

// ============================================
// Organization / Company Page APIs
// ============================================

// Get organizations the user can post to (admin access required)
export async function getAdministeredOrganizations(token: string) {
  try {
    // First, get the organization access control for the current user
    const { data } = await axios.get(
      "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(localizedName,vanityName,logoV2(original~:playableStreams))))",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    console.log("Organization ACLs:", JSON.stringify(data, null, 2));
    
    // Extract organization info
    const organizations = data.elements?.map((element: any) => {
      const org = element["organization~"];
      const orgUrn = element.organization;
      const orgId = orgUrn?.split(":").pop();
      
      // Get logo URL if available
      let logoUrl = null;
      try {
        const logoElements = org?.logoV2?.["original~"]?.elements;
        if (logoElements && logoElements.length > 0) {
          logoUrl = logoElements[0].identifiers?.[0]?.identifier;
        }
      } catch (e) {
        // Logo not available
      }
      
      return {
        id: orgId,
        urn: orgUrn,
        name: org?.localizedName || "Unknown Organization",
        vanityName: org?.vanityName,
        logoUrl
      };
    }) || [];
    
    return { success: true, organizations };
  } catch (error: any) {
    console.error("Failed to get administered organizations:", error?.response?.data || error.message);
    return { success: false, organizations: [], error: error?.response?.data?.message || error.message };
  }
}

// ============================================
// Share on LinkedIn API - Posts
// ============================================

// Create a text post on LinkedIn (supports both personal and organization pages)
export async function createLinkedInPost(
  token: string, 
  authorId: string, 
  text: string,
  isOrganization: boolean = false
) {
  try {
    // Determine the author URN based on whether it's a personal or organization post
    const authorUrn = isOrganization 
      ? `urn:li:organization:${authorId}` 
      : `urn:li:person:${authorId}`;
    
    console.log(`Creating LinkedIn post as ${isOrganization ? 'organization' : 'person'}: ${authorUrn}`);
    
    // Use the v2 UGC Posts API (legacy but stable)
    const { data } = await axios.post(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: text
            },
            shareMediaCategory: "NONE"
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    console.log("LinkedIn post created:", data);
    return { success: true, postId: data.id, data };
  } catch (error: any) {
    console.error("Failed to create LinkedIn post:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// Create a post with an image on LinkedIn (supports both personal and organization pages)
export async function createLinkedInPostWithImage(
  token: string, 
  authorId: string, 
  text: string, 
  imageUrn: string,
  isOrganization: boolean = false
) {
  try {
    // Determine the author URN
    const authorUrn = isOrganization 
      ? `urn:li:organization:${authorId}` 
      : `urn:li:person:${authorId}`;
    
    console.log(`Creating LinkedIn post with image as ${isOrganization ? 'organization' : 'person'}: ${authorUrn}`);
    
    // Use the v2 UGC Posts API with image
    const { data } = await axios.post(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: text
            },
            shareMediaCategory: "IMAGE",
            media: [
              {
                status: "READY",
                media: imageUrn
              }
            ]
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    console.log("LinkedIn post with image created:", data);
    return { success: true, postId: data.id, data };
  } catch (error: any) {
    console.error("Failed to create LinkedIn post with image:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// ============================================
// Share on LinkedIn API - Images
// ============================================

// Initialize image upload to get upload URL (using v2 assets API)
// Supports both personal and organization uploads
export async function initializeImageUpload(
  token: string, 
  ownerId: string, 
  isOrganization: boolean = false
) {
  try {
    // Determine the owner URN
    const ownerUrn = isOrganization 
      ? `urn:li:organization:${ownerId}` 
      : `urn:li:person:${ownerId}`;
    
    // Register the image upload using v2 assets API
    const { data } = await axios.post(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: ownerUrn,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent"
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    console.log("Image upload registered:", data);
    
    // Extract upload URL and asset URN
    const uploadUrl = data.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
    const asset = data.value.asset;
    
    return {
      success: true,
      uploadUrl: uploadUrl,
      imageUrn: asset
    };
  } catch (error: any) {
    console.error("Failed to initialize image upload:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// Upload image binary to LinkedIn
export async function uploadImageToLinkedIn(uploadUrl: string, imageBuffer: Buffer, contentType: string) {
  try {
    await axios.put(uploadUrl, imageBuffer, {
      headers: {
        "Content-Type": contentType
      }
    });
    
    console.log("Image uploaded successfully");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to upload image:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || error.message };
  }
}

// ============================================
// Share on LinkedIn API - Documents
// ============================================

// Initialize document upload (using v2 assets API)
export async function initializeDocumentUpload(token: string, memberId: string) {
  try {
    const { data } = await axios.post(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-document"],
          owner: `urn:li:person:${memberId}`,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent"
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    const uploadUrl = data.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
    const asset = data.value.asset;
    
    return {
      success: true,
      uploadUrl: uploadUrl,
      documentUrn: asset
    };
  } catch (error: any) {
    console.error("Failed to initialize document upload:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// Delete a post (using v2 ugcPosts API)
export async function deleteLinkedInPost(token: string, postUrn: string) {
  try {
    await axios.delete(
      `https://api.linkedin.com/v2/ugcPosts/${encodeURIComponent(postUrn)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete LinkedIn post:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// ============================================
// LinkedIn Events API (r_events, rw_events scopes)
// ============================================

export interface LinkedInEvent {
  id: string;
  urn: string;
  name: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  eventUrl?: string;
  organizerName?: string;
  organizerUrn?: string;
  eventType?: string;
  format?: string;
  locale?: string;
  logoUrl?: string;
}

// Helper to parse event response
function parseEventResponse(event: any): LinkedInEvent {
  return {
    id: event.id || event.eventUrn?.split(":").pop() || event.urn?.split(":").pop(),
    urn: event.eventUrn || event.urn || `urn:li:event:${event.id}`,
    name: typeof event.name === 'string' ? event.name : (event.name?.localized?.en_US || event.name?.localized?.[Object.keys(event.name?.localized || {})[0]] || "Untitled Event"),
    description: typeof event.description === 'string' ? event.description : (event.description?.localized?.en_US || event.description?.localized?.[Object.keys(event.description?.localized || {})[0]]),
    startAt: event.startsAt ? new Date(event.startsAt).toISOString() : (event.eventTime?.startAt ? new Date(event.eventTime.startAt).toISOString() : undefined),
    endAt: event.endsAt ? new Date(event.endsAt).toISOString() : (event.eventTime?.endAt ? new Date(event.eventTime.endAt).toISOString() : undefined),
    eventUrl: event.eventUrl || event.externalEventUrl,
    organizerName: event.organizerName || event.organizer?.["organizer~"]?.localizedName,
    organizerUrn: event.organizer,
    eventType: event.eventType || event.format,
    format: event.eventFormat || event.attendanceType,
    locale: event.locale?.language || event.defaultLocale
  };
}

// Get organization events using FINDER eventsByOrganizer (requires r_events or rw_events scope)
export async function getOrganizationEvents(token: string, organizationId: string) {
  try {
    // Use the correct REST API endpoint with FINDER eventsByOrganizer
    const { data } = await axios.get(
      `https://api.linkedin.com/rest/events`,
      {
        params: {
          q: "eventsByOrganizer",
          organizer: `urn:li:organization:${organizationId}`
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "LinkedIn-Version": "202411",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    console.log("Organization events (REST API):", JSON.stringify(data, null, 2));
    
    const events: LinkedInEvent[] = (data.elements || []).map(parseEventResponse);
    return { success: true, events };
  } catch (error: any) {
    console.error("Failed to get organization events:", error?.response?.data || error.message);
    return { success: false, events: [], error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// Get all events the user has access to using FINDER organizerLeadGenFormEnabledEvents
export async function getMyEvents(token: string) {
  try {
    // Use the REST API with FINDER organizerLeadGenFormEnabledEvents (requires r_events)
    const { data } = await axios.get(
      `https://api.linkedin.com/rest/events`,
      {
        params: {
          q: "organizerLeadGenFormEnabledEvents"
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "LinkedIn-Version": "202411",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    console.log("My events (REST API):", JSON.stringify(data, null, 2));
    const events: LinkedInEvent[] = (data.elements || []).map(parseEventResponse);
    return { success: true, events };
  } catch (error: any) {
    console.error("Failed to get my events:", error?.response?.data || error.message);
    return { success: false, events: [], error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// Get a single event by ID (GET /rest/events/{id} - requires r_events or rw_events)
export async function getEventById(token: string, eventId: string) {
  try {
    const { data } = await axios.get(
      `https://api.linkedin.com/rest/events/${eventId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "LinkedIn-Version": "202411",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    console.log("Event by ID response:", JSON.stringify(data, null, 2));
    
    const event: LinkedInEvent = parseEventResponse(data);
    return { success: true, event };
  } catch (error: any) {
    console.error("Failed to get event:", error?.response?.data || error.message);
    return { success: false, event: null, error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// Create a new event (CREATE /rest/events - requires rw_events scope)
export async function createLinkedInEvent(
  token: string,
  organizationId: string,
  eventData: {
    name: string;
    description?: string;
    startAt: number; // Unix timestamp in milliseconds
    endAt?: number; // Unix timestamp in milliseconds
    eventUrl?: string;
    eventType?: "ONLINE" | "IN_PERSON";
    locale?: string;
  }
) {
  try {
    // Use the REST API endpoint POST /rest/events (requires rw_events)
    const requestBody: any = {
      organizer: `urn:li:organization:${organizationId}`,
      name: eventData.name,
      startsAt: eventData.startAt,
      eventType: eventData.eventType || "ONLINE",
      defaultLocale: eventData.locale || "en_US"
    };
    
    if (eventData.description) {
      requestBody.description = eventData.description;
    }
    
    if (eventData.endAt) {
      requestBody.endsAt = eventData.endAt;
    }
    
    if (eventData.eventUrl) {
      requestBody.externalEventUrl = eventData.eventUrl;
    }
    
    console.log("Creating event with REST API:", JSON.stringify(requestBody, null, 2));
    
    const { data } = await axios.post(
      "https://api.linkedin.com/rest/events",
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202411",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    console.log("Event created:", data);
    return { success: true, eventId: data.id || data.eventUrn, data };
  } catch (error: any) {
    console.error("Failed to create event:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// Update an event (PARTIAL_UPDATE /rest/events/{id} - requires rw_events scope)
export async function updateLinkedInEvent(
  token: string,
  eventId: string,
  updates: {
    name?: string;
    description?: string;
    startAt?: number;
    endAt?: number;
    eventUrl?: string;
    eventType?: "ONLINE" | "IN_PERSON";
    locale?: string;
  }
) {
  try {
    const requestBody: any = {};
    
    if (updates.name) {
      requestBody.name = updates.name;
    }
    
    if (updates.description) {
      requestBody.description = updates.description;
    }
    
    if (updates.startAt) {
      requestBody.startsAt = updates.startAt;
    }
    
    if (updates.endAt) {
      requestBody.endsAt = updates.endAt;
    }
    
    if (updates.eventUrl) {
      requestBody.externalEventUrl = updates.eventUrl;
    }
    
    if (updates.eventType) {
      requestBody.eventType = updates.eventType;
    }
    
    if (updates.locale) {
      requestBody.defaultLocale = updates.locale;
    }
    
    console.log("Updating event:", JSON.stringify(requestBody, null, 2));
    
    const { data } = await axios.post(
      `https://api.linkedin.com/rest/events/${eventId}`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202411",
          "X-Restli-Protocol-Version": "2.0.0",
          "X-HTTP-Method-Override": "PATCH"
        }
      }
    );
    
    console.log("Event updated:", data);
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to update event:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// Delete an event - Note: LinkedIn Events API may not support DELETE
// Events typically need to be cancelled/updated rather than deleted
export async function deleteLinkedInEvent(token: string, eventId: string) {
  try {
    // Try to delete the event
    await axios.delete(
      `https://api.linkedin.com/rest/events/${eventId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "LinkedIn-Version": "202411",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete event:", error?.response?.data || error.message);
    // If delete is not supported, suggest updating/cancelling instead
    const errorMessage = error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message;
    if (error?.response?.status === 405 || error?.response?.status === 404) {
      return { success: false, error: "Delete is not supported for events. Events must be cancelled by updating their status." };
    }
    return { success: false, error: errorMessage };
  }
}

// ============================================
// LinkedIn Comments API (w_member_social scope)
// ============================================

export interface LinkedInComment {
  id: string;
  urn: string;
  text: string;
  authorUrn: string;
  authorName?: string;
  createdAt?: string;
  parentUrn?: string;
}

// Get comments on a post
export async function getPostComments(token: string, postUrn: string) {
  try {
    const encodedUrn = encodeURIComponent(postUrn);
    const { data } = await axios.get(
      `https://api.linkedin.com/v2/socialActions/${encodedUrn}/comments`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    console.log("Post comments:", JSON.stringify(data, null, 2));
    
    const comments: LinkedInComment[] = (data.elements || []).map((comment: any) => ({
      id: comment["$URN"]?.split(":").pop() || comment.id,
      urn: comment["$URN"] || `urn:li:comment:${comment.id}`,
      text: comment.message?.text || comment.comment || "",
      authorUrn: comment.actor || comment.commenter,
      createdAt: comment.created?.time ? new Date(comment.created.time).toISOString() : undefined,
      parentUrn: comment.parentComment
    }));
    
    return { success: true, comments };
  } catch (error: any) {
    console.error("Failed to get post comments:", error?.response?.data || error.message);
    return { success: false, comments: [], error: error?.response?.data?.message || error.message };
  }
}

// Create a comment on a post (w_member_social scope)
export async function createComment(
  token: string, 
  postUrn: string, 
  text: string,
  actorUrn: string
) {
  try {
    const encodedUrn = encodeURIComponent(postUrn);
    
    const requestBody = {
      actor: actorUrn,
      message: {
        text: text
      }
    };
    
    console.log("Creating comment:", JSON.stringify(requestBody, null, 2));
    
    const { data } = await axios.post(
      `https://api.linkedin.com/v2/socialActions/${encodedUrn}/comments`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    console.log("Comment created:", data);
    return { success: true, commentUrn: data["$URN"] || data.id, data };
  } catch (error: any) {
    console.error("Failed to create comment:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// Edit a comment (w_member_social scope)
export async function editComment(
  token: string,
  postUrn: string,
  commentUrn: string,
  newText: string
) {
  try {
    const encodedPostUrn = encodeURIComponent(postUrn);
    const encodedCommentUrn = encodeURIComponent(commentUrn);
    
    const requestBody = {
      message: {
        text: newText
      }
    };
    
    const { data } = await axios.post(
      `https://api.linkedin.com/v2/socialActions/${encodedPostUrn}/comments/${encodedCommentUrn}`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
          "X-HTTP-Method-Override": "PATCH"
        }
      }
    );
    
    console.log("Comment edited:", data);
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to edit comment:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// Delete a comment (w_member_social scope)
export async function deleteComment(
  token: string,
  postUrn: string,
  commentUrn: string
) {
  try {
    const encodedPostUrn = encodeURIComponent(postUrn);
    const encodedCommentUrn = encodeURIComponent(commentUrn);
    
    await axios.delete(
      `https://api.linkedin.com/v2/socialActions/${encodedPostUrn}/comments/${encodedCommentUrn}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete comment:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// ============================================
// LinkedIn Reactions API (w_member_social scope)
// ============================================

export type ReactionType = "LIKE" | "CELEBRATE" | "SUPPORT" | "LOVE" | "INSIGHTFUL" | "CURIOUS";

export interface LinkedInReaction {
  reactionType: ReactionType;
  actorUrn: string;
  createdAt?: string;
}

// Get reactions on a post
export async function getPostReactions(token: string, postUrn: string) {
  try {
    const encodedUrn = encodeURIComponent(postUrn);
    const { data } = await axios.get(
      `https://api.linkedin.com/v2/socialActions/${encodedUrn}/likes`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    console.log("Post reactions:", JSON.stringify(data, null, 2));
    
    const reactions: LinkedInReaction[] = (data.elements || []).map((reaction: any) => ({
      reactionType: reaction.reactionType || "LIKE",
      actorUrn: reaction.actor,
      createdAt: reaction.created?.time ? new Date(reaction.created.time).toISOString() : undefined
    }));
    
    return { success: true, reactions, totalCount: data.paging?.total || reactions.length };
  } catch (error: any) {
    console.error("Failed to get post reactions:", error?.response?.data || error.message);
    return { success: false, reactions: [], error: error?.response?.data?.message || error.message };
  }
}

// Add a reaction to a post (w_member_social scope)
export async function addReaction(
  token: string, 
  postUrn: string, 
  actorUrn: string,
  reactionType: ReactionType = "LIKE"
) {
  try {
    const encodedUrn = encodeURIComponent(postUrn);
    
    const requestBody = {
      actor: actorUrn,
      reactionType: reactionType
    };
    
    console.log("Adding reaction:", JSON.stringify(requestBody, null, 2));
    
    const { data } = await axios.post(
      `https://api.linkedin.com/v2/socialActions/${encodedUrn}/likes`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    console.log("Reaction added:", data);
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to add reaction:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// Remove a reaction from a post (w_member_social scope)
export async function removeReaction(
  token: string,
  postUrn: string,
  actorUrn: string
) {
  try {
    const encodedPostUrn = encodeURIComponent(postUrn);
    const encodedActorUrn = encodeURIComponent(actorUrn);
    
    await axios.delete(
      `https://api.linkedin.com/v2/socialActions/${encodedPostUrn}/likes/${encodedActorUrn}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to remove reaction:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// ============================================
// LinkedIn Video Upload API (w_member_social scope)
// ============================================

// Initialize video upload
export async function initializeVideoUpload(
  token: string,
  ownerId: string,
  isOrganization: boolean = false,
  fileSizeBytes: number
) {
  try {
    const ownerUrn = isOrganization 
      ? `urn:li:organization:${ownerId}`
      : `urn:li:person:${ownerId}`;
    
    const requestBody = {
      registerUploadRequest: {
        owner: ownerUrn,
        recipes: ["urn:li:digitalmediaRecipe:feedshare-video"],
        serviceRelationships: [
          {
            identifier: "urn:li:userGeneratedContent",
            relationshipType: "OWNER"
          }
        ],
        supportedUploadMechanism: ["SINGLE_REQUEST_UPLOAD"],
        fileSize: fileSizeBytes
      }
    };
    
    console.log("Initializing video upload:", JSON.stringify(requestBody, null, 2));
    
    const { data } = await axios.post(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );
    
    console.log("Video upload initialized:", data);
    
    const uploadUrl = data.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
    const videoUrn = data.value?.asset;
    
    return { success: true, uploadUrl, videoUrn };
  } catch (error: any) {
    console.error("Failed to initialize video upload:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// Upload video binary
export async function uploadVideoToLinkedIn(
  uploadUrl: string,
  videoBuffer: Buffer,
  contentType: string = "video/mp4"
) {
  try {
    await axios.put(uploadUrl, videoBuffer, {
      headers: {
        "Content-Type": contentType,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to upload video:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || error.message };
  }
}

// Create post with video
export async function createLinkedInPostWithVideo(
  token: string,
  authorId: string,
  text: string,
  videoUrn: string,
  isOrganization: boolean = false
) {
  try {
    const authorUrn = isOrganization 
      ? `urn:li:organization:${authorId}` 
      : `urn:li:person:${authorId}`;

    const requestBody = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: text
          },
          shareMediaCategory: "VIDEO",
          media: [
            {
              status: "READY",
              media: videoUrn
            }
          ]
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    };

    console.log("Creating video post:", JSON.stringify(requestBody, null, 2));

    const { data } = await axios.post(
      "https://api.linkedin.com/v2/ugcPosts",
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );

    console.log("Video post created:", data);
    return { success: true, postId: data.id };
  } catch (error: any) {
    console.error("Failed to create video post:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

// Create post with link/article
export async function createLinkedInPostWithLink(
  token: string,
  authorId: string,
  text: string,
  linkUrl: string,
  linkTitle?: string,
  linkDescription?: string,
  isOrganization: boolean = false
) {
  try {
    const authorUrn = isOrganization 
      ? `urn:li:organization:${authorId}` 
      : `urn:li:person:${authorId}`;

    const mediaItem: any = {
      status: "READY",
      originalUrl: linkUrl
    };

    if (linkTitle) {
      mediaItem.title = { text: linkTitle };
    }

    if (linkDescription) {
      mediaItem.description = { text: linkDescription };
    }

    const requestBody = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: text
          },
          shareMediaCategory: "ARTICLE",
          media: [mediaItem]
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    };

    console.log("Creating link post:", JSON.stringify(requestBody, null, 2));

    const { data } = await axios.post(
      "https://api.linkedin.com/v2/ugcPosts",
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );

    console.log("Link post created:", data);
    return { success: true, postId: data.id };
  } catch (error: any) {
    console.error("Failed to create link post:", error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message };
  }
}

