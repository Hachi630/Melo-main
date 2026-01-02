import express, { Request, Response } from "express";
import axios from "axios";
import { protect } from "../middleware/auth.js";
import { AuthRequest } from "../types/index.js";
import User from "../models/User.js";
import {
  getFacebookAuthUrl,
  exchangeCodeForToken,
  getLongLivedToken,
  getFacebookPages,
  shareToFacebook,
} from "../services/facebookService.js";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file uploads (images and videos)
const UPLOADS_DIR = path.join(__dirname, '../../uploads/images');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `facebook-${timestamp}-${random}${ext}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images and videos
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit (Facebook video limit)
  },
});

// Store OAuth states temporarily (in production, use Redis or similar)
const oauthStates = new Map<string, string>();

/**
 * @desc    Initiate Facebook OAuth flow (for Facebook Page sharing only)
 * @route   GET /api/facebook/auth
 * @access  Private
 */
router.get(
  "/auth",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Generate state for CSRF protection
      const state = crypto.randomBytes(32).toString("hex");
      oauthStates.set(
        state,
        JSON.stringify({ userId: user._id.toString() })
      );

      // Generate Facebook OAuth URL (without business_management scope)
      // This allows personal accounts to connect and use Facebook sharing
      const authUrl = getFacebookAuthUrl(state);

      res.json({
        success: true,
        authUrl,
        state,
      });
    } catch (error: any) {
      console.error("[Facebook OAuth] Initiation error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to initiate Facebook OAuth",
      });
    }
  }
);

/**
 * @desc    Facebook OAuth callback (independent from Instagram)
 * @route   GET /api/facebook/callback
 * @access  Public (called by Facebook) or Private (called by frontend)
 */
router.get("/callback", async (req: Request, res: Response) => {
  try {
    console.log("[Facebook OAuth Callback] Received callback:", {
      query: req.query,
      url: req.url,
      headers: req.headers.host,
    });

    // Check if this is a frontend callback (has Authorization header) or backend callback (from Facebook)
    const isFrontendCallback = !!req.headers.authorization;
    console.log(
      "[Facebook OAuth Callback] Callback type:",
      isFrontendCallback ? "frontend" : "backend (from Facebook)"
    );

    const { code, state, error } = req.query;

    if (error) {
      console.error("[Facebook OAuth Callback] Error from Facebook:", error);
      if (isFrontendCallback) {
        return res.json({ success: false, message: error as string });
      }
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/facebook/callback?error=${encodeURIComponent(error as string)}`
      );
    }

    if (!code || !state) {
      console.error("[Facebook OAuth Callback] Missing code or state:", {
        code: !!code,
        state: !!state,
      });
      if (isFrontendCallback) {
        return res.json({ success: false, message: "Missing code or state" });
      }
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/facebook/callback?error=missing_code_or_state`
      );
    }

    // Verify state
    const stateString = state as string;
    const stateData = oauthStates.get(stateString);
    if (!stateData) {
      console.error(
        "[Facebook OAuth Callback] Invalid state - state not found:",
        {
          state: stateString?.substring(0, 20) + "...",
          stateLength: stateString?.length,
          oauthStatesSize: oauthStates.size,
        }
      );
      // Silently redirect without error (invalid state is common during OAuth flow)
      console.log(
        "[Facebook OAuth Callback] Invalid state - but connection may already be successful, redirecting silently"
      );
      if (isFrontendCallback) {
        return res.json({
          success: true,
          message: "Redirecting to social dashboard",
          redirectUrl: `${process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:3000"}/socialdashboard`,
        });
      }
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/socialdashboard`
      );
    }

    // Parse state data
    let userId: string;
    try {
      const parsed = JSON.parse(stateData as string);
      userId = parsed.userId || parsed;
    } catch (e) {
      console.warn(
        "[Facebook OAuth Callback] State data is not JSON, treating as userId string"
      );
      userId = stateData as string;
    }

    console.log(
      "[Facebook OAuth Callback] State verified, userId:",
      userId
    );

    // Delete state AFTER successful parsing to prevent reuse
    oauthStates.delete(stateString);

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      if (isFrontendCallback) {
        return res.json({ success: false, message: "User not found" });
      }
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/facebook/callback?error=user_not_found`
      );
    }

    // Exchange code for short-lived token
    console.log("[Facebook OAuth Callback] Exchanging code for token...");
    const tokenData = await exchangeCodeForToken(code as string);
    console.log("[Facebook OAuth Callback] Got short-lived token");

    // Exchange for long-lived token
    console.log(
      "[Facebook OAuth Callback] Exchanging for long-lived token..."
    );
    const longLivedToken = await getLongLivedToken(tokenData.accessToken);
    console.log("[Facebook OAuth Callback] Got long-lived token");

    // Get user's Facebook Pages
    console.log("[Facebook OAuth Callback] Getting Facebook Pages...");
    const pages = await getFacebookPages(longLivedToken.accessToken);
    console.log("[Facebook OAuth Callback] Found pages:", pages.length);

    if (pages.length > 0) {
      const firstPage = pages[0];
      console.log(
        "[Facebook OAuth Callback] Saving Facebook connection for page:",
        firstPage.name
      );

      try {
        // Get page name
        const pageNameResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${firstPage.id}?fields=name&access_token=${firstPage.accessToken || longLivedToken.accessToken}`
        );

        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setSeconds(
          expiresAt.getSeconds() + longLivedToken.expiresIn
        );

        // Save to user - Facebook only
        if (!user.socialConnections) {
          user.socialConnections = {};
        }

        // Save Facebook Page connection with Page access token
        const pageToken = firstPage.accessToken || longLivedToken.accessToken;
        user.socialConnections.facebook = {
          accessToken: pageToken, // Save Page access token for posting
          userId: firstPage.id, // Save Page ID
          expiresAt,
        };

        // IMPORTANT: Do NOT touch Instagram connection - keep them independent
        await user.save();

        console.log(
          "[Facebook OAuth Callback] Saved Facebook connection:",
          {
            userId: user._id,
            facebookPageId: firstPage.id,
          }
        );

        const clientUrl =
          process.env.CLIENT_URL ||
          process.env.FRONTEND_URL ||
          "http://localhost:3000";
        const redirectUrl = `${clientUrl}/socialdashboard?facebook=connected`;

        if (isFrontendCallback) {
          return res.json({
            success: true,
            message: "Successfully connected Facebook Page",
            redirectUrl,
            facebook: {
              pageId: firstPage.id,
              pageName: pageNameResponse.data.name,
            },
          });
        } else {
          return res.redirect(redirectUrl);
        }
      } catch (saveError: any) {
        console.error(
          "[Facebook OAuth Callback] Failed to save Facebook connection:",
          saveError.response?.data || saveError.message
        );
        // Fall through to error
      }
    } else {
      // No pages found
      if (isFrontendCallback) {
        return res.json({
          success: false,
          message:
            "No Facebook Pages found. Please create a Facebook Page first.",
        });
      } else {
        return res.redirect(
          `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/facebook/callback?error=no_pages`
        );
      }
    }
  } catch (error: any) {
    console.error("[Facebook OAuth Callback] Error:", error);
    console.error("[Facebook OAuth Callback] Error stack:", error.stack);
    const errorMessage =
      error.response?.data?.error?.message || error.message || "oauth_failed";
    console.error(
      "[Facebook OAuth Callback] Redirecting with error:",
      errorMessage
    );
    const clientUrl =
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000";
    if (req.headers.authorization) {
      return res.json({
        success: false,
        message: errorMessage,
      });
    }
    res.redirect(
      `${clientUrl}/auth/facebook/callback?error=${encodeURIComponent(errorMessage)}`
    );
  }
});

/**
 * @desc    Share calendar item to Facebook
 * @route   POST /api/facebook/share
 * @access  Private
 */
router.post(
  "/share",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // IMPORTANT: Reload user from database to get latest socialConnections
      const freshUser = await User.findById(user._id);
      if (!freshUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const { calendarItemId, content, imageUrl } = req.body;

      console.log("[Facebook Share] Request received:", {
        userId: freshUser._id,
        calendarItemId,
        hasContent: !!content,
        hasImageUrl: !!imageUrl,
        socialConnections: freshUser.socialConnections ? "exists" : "null",
        facebookToken: freshUser.socialConnections?.facebook?.accessToken
          ? "exists"
          : "missing",
      });

      if (!calendarItemId || !content) {
        return res.status(400).json({
          success: false,
          message: "calendarItemId and content are required",
        });
      }

      // Check if user has Facebook connected
      const facebook = freshUser.socialConnections?.facebook;

      if (!facebook?.accessToken || !facebook?.userId) {
        return res.status(400).json({
          success: false,
          message:
            "Facebook account not connected. Please connect your Facebook Page first.",
          requiresAuth: true,
        });
      }

      // Check if token is expired
      if (facebook.expiresAt && new Date() > facebook.expiresAt) {
        return res.status(401).json({
          success: false,
          message:
            "Facebook access token expired. Please reconnect your account.",
          requiresAuth: true,
        });
      }

      // Use the saved token directly (should already be a Page token)
      // If it's a user token, we would need to exchange it, but since we save Page tokens
      // during OAuth, we can use it directly
      const pageAccessToken = facebook.accessToken;
      
      // Note: If the token is a user token and /me/accounts fails, we'll try using it directly
      // The token should already be a Page token saved during OAuth callback

      // Share to Facebook using Graph API
      const result = await shareToFacebook(
        facebook.userId,
        pageAccessToken,
        {
          text: content,
          imageUrl: imageUrl,
        }
      );

      res.json({
        success: true,
        message: "Successfully shared to Facebook",
        postId: result.postId,
        permalink: result.permalink,
      });
    } catch (error: any) {
      console.error("Facebook share error:", error);

      // Check if it's an authentication error
      if (
        error.response?.status === 401 ||
        error.response?.data?.error?.code === 190
      ) {
        return res.status(401).json({
          success: false,
          message: "Facebook access token expired or invalid. Please reconnect your account.",
          requiresAuth: true,
        });
      }

      res.status(500).json({
        success: false,
        message:
          error.response?.data?.error?.message ||
          error.message ||
          "Failed to share to Facebook",
      });
    }
  }
);

/**
 * @desc    Create a Facebook post (text, image, video, or link)
 * @route   POST /api/facebook/posts
 * @access  Private
 */
router.post(
  "/posts",
  protect,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // IMPORTANT: Reload user from database to get latest socialConnections
      const freshUser = await User.findById(user._id);
      if (!freshUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const { text, postType, linkUrl, linkName, linkDescription } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const imageFile = files?.image?.[0];
      const videoFile = files?.video?.[0];

      console.log("[Facebook Post] Request received:", {
        userId: freshUser._id,
        postType,
        hasText: !!text,
        hasImage: !!imageFile,
        hasVideo: !!videoFile,
        hasLink: !!linkUrl,
      });

      // Validate text content
      if (!text || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Post text is required",
        });
      }

      if (text.length > 5000) {
        return res.status(400).json({
          success: false,
          message: "Post text cannot exceed 5000 characters",
        });
      }

      // Validate post type specific requirements
      if (postType === "image" && !imageFile) {
        return res.status(400).json({
          success: false,
          message: "Image is required for image posts",
        });
      }

      if (postType === "video" && !videoFile) {
        return res.status(400).json({
          success: false,
          message: "Video is required for video posts",
        });
      }

      if (postType === "link" && !linkUrl) {
        return res.status(400).json({
          success: false,
          message: "Link URL is required for link posts",
        });
      }

      // Check if user has Facebook connected
      const facebook = freshUser.socialConnections?.facebook;

      if (!facebook?.accessToken || !facebook?.userId) {
        return res.status(400).json({
          success: false,
          message:
            "Facebook account not connected. Please connect your Facebook Page first.",
          requiresAuth: true,
        });
      }

      // Check if token is expired
      if (facebook.expiresAt && new Date() > facebook.expiresAt) {
        return res.status(401).json({
          success: false,
          message:
            "Facebook access token expired. Please reconnect your account.",
          requiresAuth: true,
        });
      }

      const pageAccessToken = facebook.accessToken;

      // Prepare content for Facebook API - use file paths for direct upload
      let imagePath: string | undefined;
      let videoPath: string | undefined;

      // Handle image upload
      if (imageFile) {
        // Validate file size (Facebook image limit is typically 8MB, but we'll use 10MB for safety)
        const maxImageSize = 10 * 1024 * 1024; // 10MB
        if (imageFile.size > maxImageSize) {
          // Clean up uploaded file
          const filePath = path.join(UPLOADS_DIR, imageFile.filename);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (cleanupError) {
              console.warn('Failed to delete oversized image file:', cleanupError);
            }
          }
          return res.status(400).json({
            success: false,
            message: `Image file size (${(imageFile.size / 1024 / 1024).toFixed(2)}MB) exceeds Facebook's limit of 10MB`,
          });
        }
        // Use file path for direct upload to Facebook
        imagePath = path.join(UPLOADS_DIR, imageFile.filename);
        console.log('[Facebook Post] Image file path:', imagePath);
      }

      // Handle video upload
      if (videoFile) {
        // Validate file size (Facebook video limit is 200MB)
        const maxVideoSize = 200 * 1024 * 1024; // 200MB
        if (videoFile.size > maxVideoSize) {
          // Clean up uploaded file
          const filePath = path.join(UPLOADS_DIR, videoFile.filename);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (cleanupError) {
              console.warn('Failed to delete oversized video file:', cleanupError);
            }
          }
          return res.status(400).json({
            success: false,
            message: `Video file size (${(videoFile.size / 1024 / 1024).toFixed(2)}MB) exceeds Facebook's limit of 200MB`,
          });
        }
        // Use file path for direct upload to Facebook
        videoPath = path.join(UPLOADS_DIR, videoFile.filename);
        console.log('[Facebook Post] Video file path:', videoPath);
      }

      // Share to Facebook using Graph API with direct file upload
      const result = await shareToFacebook(
        facebook.userId,
        pageAccessToken,
        {
          text: text.trim(),
          imagePath,
          videoPath,
          linkUrl: linkUrl || undefined,
          linkName: linkName || undefined,
          linkDescription: linkDescription || undefined,
        }
      );

      // Clean up uploaded files after successful post
      if (imageFile) {
        const filePath = path.join(UPLOADS_DIR, imageFile.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log('Temporary image file deleted:', filePath);
          } catch (cleanupError) {
            console.warn('Failed to delete temporary image file:', cleanupError);
          }
        }
      }

      if (videoFile) {
        const filePath = path.join(UPLOADS_DIR, videoFile.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log('Temporary video file deleted:', filePath);
          } catch (cleanupError) {
            console.warn('Failed to delete temporary video file:', cleanupError);
          }
        }
      }

      res.json({
        success: true,
        message: "Successfully posted to Facebook",
        postId: result.postId,
        permalink: result.permalink,
      });
    } catch (error: any) {
      console.error("Facebook post error:", error);

      // Clean up uploaded files on error
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      if (files) {
        if (files.image?.[0]) {
          const filePath = path.join(UPLOADS_DIR, files.image[0].filename);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (cleanupError) {
              console.warn('Failed to delete temporary image file on error:', cleanupError);
            }
          }
        }
        if (files.video?.[0]) {
          const filePath = path.join(UPLOADS_DIR, files.video[0].filename);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (cleanupError) {
              console.warn('Failed to delete temporary video file on error:', cleanupError);
            }
          }
        }
      }

      // Check if it's an authentication error
      if (
        error.response?.status === 401 ||
        error.response?.data?.error?.code === 190
      ) {
        return res.status(401).json({
          success: false,
          message: "Facebook access token expired or invalid. Please reconnect your account.",
          requiresAuth: true,
        });
      }

      res.status(500).json({
        success: false,
        message:
          error.response?.data?.error?.message ||
          error.message ||
          "Failed to post to Facebook",
      });
    }
  }
);

/**
 * @desc    Get Facebook connection status
 * @route   GET /api/facebook/status
 * @access  Private
 */
router.get(
  "/status",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Reload user from database to get latest socialConnections
      const freshUser = await User.findById(user._id);
      if (!freshUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const facebook = freshUser.socialConnections?.facebook;

      // Check if Facebook connection exists and has valid data
      const hasValidFacebook =
        facebook &&
        facebook.accessToken &&
        facebook.userId &&
        Object.keys(facebook).length > 0;

      if (!hasValidFacebook) {
        console.log("[Facebook Status] No valid Facebook connection found");
        return res.json({
          success: true,
          connected: false,
          message:
            "Facebook account not connected. Please connect your Facebook Page first.",
        });
      }

      // Check if token is expired
      const isExpired = facebook.expiresAt && new Date() > facebook.expiresAt;

      if (isExpired) {
        return res.json({
          success: true,
          connected: false,
          message: "Facebook token has expired. Please reconnect your account.",
        });
      }

      // Get Facebook Page information
      let profile = null;
      try {
        const pageResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${facebook.userId}?fields=name,picture&access_token=${facebook.accessToken}`
        );
        profile = {
          id: facebook.userId,
          name: pageResponse.data.name || null,
          picture: pageResponse.data.picture?.data?.url || null,
        };
      } catch (profileError: any) {
        console.warn(
          "[Facebook Status] Failed to get page profile:",
          profileError.response?.data || profileError.message
        );
        // Still return connected status even if we can't get profile
        profile = {
          id: facebook.userId,
          name: null,
          picture: null,
        };
      }

      res.json({
        success: true,
        connected: true,
        userId: facebook.userId,
        expiresAt: facebook.expiresAt,
        profile: profile,
      });
    } catch (error: any) {
      console.error("Facebook status error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get Facebook status",
      });
    }
  }
);

/**
 * @desc    Disconnect Facebook account
 * @route   DELETE /api/facebook/disconnect
 * @access  Private
 */
router.delete(
  "/disconnect",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // IMPORTANT: Reload user from database to get latest socialConnections
      const freshUser = await User.findById(user._id);
      if (!freshUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Remove Facebook connection
      // IMPORTANT: Use $unset to properly remove nested object in Mongoose
      if (freshUser.socialConnections?.facebook) {
        console.log("[Facebook Disconnect] Removing Facebook connection:", {
          userId: freshUser._id.toString(),
          facebookUserId: freshUser.socialConnections.facebook.userId,
          hasAccessToken: !!freshUser.socialConnections.facebook.accessToken,
        });

        // Use $unset to properly remove nested field in MongoDB
        await User.updateOne(
          { _id: user._id },
          { $unset: { "socialConnections.facebook": "" } }
        );
        console.log("[Facebook Disconnect] User updated using $unset");

        // Verify Facebook was removed
        const verifyUser = await User.findById(user._id);
        if (verifyUser?.socialConnections?.facebook) {
          console.error(
            "[Facebook Disconnect] WARNING: Facebook connection still exists after $unset!"
          );
          // Try direct delete as fallback
          delete verifyUser.socialConnections.facebook;
          await verifyUser.save();
        } else {
          console.log(
            "[Facebook Disconnect] Verified: Facebook connection successfully removed"
          );
        }

        console.log(
          `[Facebook Disconnect] Disconnected Facebook for user ${user._id}`
        );
        return res.json({
          success: true,
          message: "Facebook account disconnected successfully",
        });
      }

      return res.json({
        success: true,
        message: "No Facebook account was connected",
      });
    } catch (error: any) {
      console.error("[Facebook Disconnect] Error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: error.message || "Failed to disconnect Facebook account",
        });
    }
  }
);

export default router;

