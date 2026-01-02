import express, { Request, Response } from "express";
import axios from "axios";
import { protect } from "../middleware/auth";
import { AuthRequest } from "../types";
import User from "../models/User";
import {
  getInstagramAuthUrl,
  exchangeCodeForToken,
  getLongLivedToken,
  getInstagramAccountIdForPage,
  getFacebookPagesWithInstagram,
  shareToInstagram,
} from "../services/instagramService";
import crypto from "crypto";

const router = express.Router();

// Store OAuth states temporarily (in production, use Redis or similar)
const oauthStates = new Map<string, string>();

/**
 * @desc    Initiate Instagram OAuth flow (requires Facebook Page, includes business_management)
 * @route   GET /api/instagram/auth
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

      // Generate Instagram OAuth URL (with business_management scope for Instagram Business Account)
      // Instagram requires Facebook Page, so this will also connect Facebook
      const authUrl = getInstagramAuthUrl(state, true); // true = include business_management for Instagram

      res.json({
        success: true,
        authUrl,
        state,
      });
    } catch (error: any) {
      console.error("[Instagram OAuth] Initiation error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to initiate Instagram OAuth",
      });
    }
  }
);

/**
 * @desc    Instagram OAuth callback (independent from Facebook)
 * @route   GET /api/instagram/callback
 * @access  Public (called by Facebook) or Private (called by frontend)
 */
router.get("/callback", async (req: Request, res: Response) => {
  try {
    console.log("[Instagram OAuth Callback] Received callback:", {
      query: req.query,
      url: req.url,
      headers: req.headers.host,
    });

    // Check if this is a frontend callback (has Authorization header) or backend callback (from Facebook)
    const isFrontendCallback = !!req.headers.authorization;
    console.log(
      "[Instagram OAuth Callback] Callback type:",
      isFrontendCallback ? "frontend" : "backend (from Facebook)"
    );

    const { code, state, error } = req.query;

    if (error) {
      console.error("[Instagram OAuth Callback] Error from Facebook:", error);
      if (isFrontendCallback) {
        return res.json({ success: false, message: error as string });
      }
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/instagram/callback?error=${encodeURIComponent(error as string)}`
      );
    }

    if (!code || !state) {
      console.error("[Instagram OAuth Callback] Missing code or state:", {
        code: !!code,
        state: !!state,
      });
      if (isFrontendCallback) {
        return res.json({ success: false, message: "Missing code or state" });
      }
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/instagram/callback?error=missing_code_or_state`
      );
    }

    // Verify state
    const stateString = state as string;
    const stateData = oauthStates.get(stateString);
    if (!stateData) {
      console.error(
        "[Instagram OAuth Callback] Invalid state - state not found:",
        {
          state: stateString?.substring(0, 20) + "...",
          stateLength: stateString?.length,
          oauthStatesSize: oauthStates.size,
        }
      );
      // Silently redirect without error (invalid state is common during OAuth flow)
      console.log(
        "[Instagram OAuth Callback] Invalid state - but connection may already be successful, redirecting silently"
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
        "[Instagram OAuth Callback] State data is not JSON, treating as userId string"
      );
      userId = stateData as string;
    }

    console.log(
      "[Instagram OAuth Callback] State verified, userId:",
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
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/instagram/callback?error=user_not_found`
      );
    }

    // Exchange code for short-lived token
    console.log("[Instagram OAuth Callback] Exchanging code for token...");
    const tokenData = await exchangeCodeForToken(code as string);
    console.log("[Instagram OAuth Callback] Got short-lived token");

    // Exchange for long-lived token
    console.log(
      "[Instagram OAuth Callback] Exchanging for long-lived token..."
    );
    const longLivedToken = await getLongLivedToken(tokenData.accessToken);
    console.log("[Instagram OAuth Callback] Got long-lived token");

    // Get user's Facebook Pages with Instagram account information
    console.log("[Instagram OAuth Callback] Getting Facebook Pages with Instagram info...");
    const pages = await getFacebookPagesWithInstagram(longLivedToken.accessToken);
    console.log("[Instagram OAuth Callback] Found pages:", pages.length);
    console.log(
      "[Instagram OAuth Callback] Pages details:",
      pages.map((p) => ({
        id: p.id,
        name: p.name,
        hasInstagramAccount: p.hasInstagramAccount,
        instagramUsername: p.instagramUsername,
      }))
    );

    // Filter to only pages with Instagram accounts
    const pagesWithInstagram = pages.filter((page) => page.hasInstagramAccount);
    console.log(
      "[Instagram OAuth Callback] Pages with Instagram:",
      pagesWithInstagram.length
    );

    if (pagesWithInstagram.length === 0) {
      const pageNames = pages.map((p) => p.name).join(", ");
      console.log(
        "[Instagram OAuth Callback] No pages with Instagram detected. Pages:",
        pageNames
      );
      console.log(
        "[Instagram OAuth Callback] This might be a permissions issue. Attempting to proceed anyway..."
      );

      // If user has pages but we can't detect Instagram, still try to connect
      if (pages.length > 0) {
        const firstPage = pages[0];
        console.log(
          "[Instagram OAuth Callback] Attempting to connect using first page:",
          firstPage.name
        );

        try {
          // Try to get Instagram account directly using the page
          const instagramAccount = await getInstagramAccountIdForPage(
            firstPage.id,
            firstPage.accessToken || longLivedToken.accessToken
          );

          // If we can get Instagram account, proceed with connection
          console.log(
            "[Instagram OAuth Callback] ✅ Successfully found Instagram account:",
            {
              username: instagramAccount.username,
              accountType: instagramAccount.accountType,
              instagramAccountId: instagramAccount.instagramAccountId,
              facebookPageId: instagramAccount.facebookPageId,
            }
          );

          // Calculate expiration date
          const expiresAt = new Date();
          expiresAt.setSeconds(
            expiresAt.getSeconds() + longLivedToken.expiresIn
          );

          // Save to user
          if (!user.socialConnections) {
            user.socialConnections = {};
          }

          // Save Instagram connection
          user.socialConnections.instagram = {
            accessToken: longLivedToken.accessToken,
            userId: instagramAccount.instagramAccountId,
            username: instagramAccount.username,
            accountType: instagramAccount.accountType,
            expiresAt,
          };

          // Also save Facebook Page connection (Instagram requires a Facebook Page)
          const pageToken = firstPage.accessToken || longLivedToken.accessToken;
          user.socialConnections.facebook = {
            accessToken: pageToken,
            userId: instagramAccount.facebookPageId,
            expiresAt,
          };

          await user.save();

          console.log(
            "[Instagram OAuth Callback] Successfully connected:",
            {
              userId: user._id,
              instagramUsername: instagramAccount.username,
              facebookPageId: instagramAccount.facebookPageId,
            }
          );

          const clientUrl =
            process.env.CLIENT_URL ||
            process.env.FRONTEND_URL ||
            "http://localhost:3000";
          const redirectUrl = `${clientUrl}/socialdashboard?facebook=connected&instagram=connected`;

          if (isFrontendCallback) {
            return res.json({
              success: true,
              message: "Successfully connected Instagram and Facebook Page",
              redirectUrl,
              instagram: {
                userId: instagramAccount.instagramAccountId,
                username: instagramAccount.username,
                accountType: instagramAccount.accountType,
              },
              facebook: {
                pageId: instagramAccount.facebookPageId,
                pageName: instagramAccount.facebookPageName,
              },
            });
          } else {
            return res.redirect(redirectUrl);
          }
        } catch (directError: any) {
          console.error(
            "[Instagram OAuth Callback] Direct method failed:",
            directError.response?.data || directError.message
          );
          // Fall through to error
        }
      }

      // If we can't connect Instagram, return error
      if (isFrontendCallback) {
        return res.json({
          success: false,
          message: `Failed to connect. Please ensure you have a Facebook Page with an Instagram Business/Creator account connected.`,
        });
      }
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/instagram/callback?error=no_instagram_account`
      );
    }

    // If only one page, connect it directly
    if (pagesWithInstagram.length === 1) {
      const selectedPage = pagesWithInstagram[0];

      // Get Instagram account for selected page
      const instagramAccount = await getInstagramAccountIdForPage(
        selectedPage.id,
        selectedPage.accessToken || longLivedToken.accessToken
      );

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + longLivedToken.expiresIn);

      // Save to user
      if (!user.socialConnections) {
        user.socialConnections = {};
      }

      // Save Instagram connection
      user.socialConnections.instagram = {
        accessToken: longLivedToken.accessToken,
        userId: instagramAccount.instagramAccountId,
        username: instagramAccount.username,
        accountType: instagramAccount.accountType,
        expiresAt,
      };

      // Also save Facebook Page connection
      const pageToken = selectedPage.accessToken || longLivedToken.accessToken;
      user.socialConnections.facebook = {
        accessToken: pageToken,
        userId: instagramAccount.facebookPageId,
        expiresAt,
      };

      await user.save();

      console.log("[Instagram OAuth] Successfully connected single page:", {
        userId: user._id,
        instagramUserId: user.socialConnections.instagram?.userId,
        instagramUsername: user.socialConnections.instagram?.username,
        facebookPageId: user.socialConnections.facebook?.userId,
      });

      const clientUrl =
        process.env.CLIENT_URL ||
        process.env.FRONTEND_URL ||
        "http://localhost:3000";
      const redirectUrl = `${clientUrl}/socialdashboard?facebook=connected&instagram=connected`;

      if (isFrontendCallback) {
        return res.json({
          success: true,
          message: "Successfully connected Instagram and Facebook Page",
          redirectUrl,
          instagram: {
            userId: instagramAccount.instagramAccountId,
            username: instagramAccount.username,
            accountType: instagramAccount.accountType,
          },
          facebook: {
            pageId: instagramAccount.facebookPageId,
            pageName: instagramAccount.facebookPageName,
          },
        });
      } else {
        return res.redirect(redirectUrl);
      }
    } else {
      // Multiple pages - store token and redirect to selection page
      const tempTokenKey = `temp_token_${user._id}_${Date.now()}`;
      oauthStates.set(
        tempTokenKey,
        JSON.stringify({
          userId: user._id.toString(),
          accessToken: longLivedToken.accessToken,
          expiresIn: longLivedToken.expiresIn,
        })
      );

      // Redirect to page selection page with token key
      res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}/select-facebook-page?token_key=${tempTokenKey}`
      );
    }
  } catch (error: any) {
    console.error("[Instagram OAuth Callback] Error:", error);
    console.error("[Instagram OAuth Callback] Error stack:", error.stack);
    const errorMessage =
      error.response?.data?.error?.message || error.message || "oauth_failed";
    console.error(
      "[Instagram OAuth Callback] Redirecting with error:",
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
      `${clientUrl}/auth/instagram/callback?error=${encodeURIComponent(errorMessage)}`
    );
  }
});

/**
 * @desc    Share calendar item to Instagram
 * @route   POST /api/instagram/share
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

      const { calendarItemId, content, imageUrl } = req.body;

      console.log("[Instagram Share] Request received:", {
        userId: user._id,
        calendarItemId,
        hasContent: !!content,
        hasImageUrl: !!imageUrl,
        socialConnections: user.socialConnections ? "exists" : "null",
        instagramToken: user.socialConnections?.instagram?.accessToken
          ? "exists"
          : "missing",
      });

      if (!calendarItemId || !content) {
        return res.status(400).json({
          success: false,
          message: "calendarItemId and content are required",
        });
      }

      // Check if user has Instagram connected
      if (!user.socialConnections?.instagram?.accessToken) {
        console.log(
          "[Instagram Share] Instagram not connected for user:",
          user._id
        );
        return res.status(400).json({
          success: false,
          message:
            "Instagram account not connected. Instagram sharing requires a Business or Creator account connected to your Facebook Page. Please connect your Instagram Business/Creator account first.",
          requiresAuth: true,
          helpText:
            "To use Instagram sharing: 1) Switch your Instagram account to Business or Creator in Instagram settings, 2) Connect it to your Facebook Page, 3) Reconnect in this app.",
        });
      }

      const instagram = user.socialConnections.instagram;

      // Check if token is expired
      if (instagram.expiresAt && new Date() > instagram.expiresAt) {
        return res.status(401).json({
          success: false,
          message:
            "Instagram access token expired. Please reconnect your account.",
          requiresAuth: true,
        });
      }

      // Instagram requires an image URL for posts
      // If no image is provided, we'll need to generate one or return an error
      let finalImageUrl = imageUrl;
      
      if (!finalImageUrl) {
        // Try to generate an image from the text content using image generation service
        try {
          const { generateImage } = await import('../services/imageGenerationService');
          const { saveImage } = await import('../utils/imageStorage');
          
          console.log("[Instagram Share] No image provided, generating text image...");
          
          // Create a prompt for generating a text-based image
          // Limit content length for image generation prompt
          const textContent = content.length > 500 ? content.substring(0, 500) + '...' : content;
          const imagePrompt = `Create a clean, modern social media post image with the following text prominently displayed: "${textContent}". Use a professional design with good contrast and readability.`;
          
          // Generate image
          const generatedImageDataUrl = await generateImage(imagePrompt);
          
          // Extract base64 data and mime type
          const base64Match = generatedImageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (base64Match) {
            const [, mimeType, base64Data] = base64Match;
            // Save the generated image
            const savedImagePath = await saveImage(base64Data, mimeType);
            // Convert to full URL for Instagram API
            // Use backend URL since images are served from backend
            const backendUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL || 'http://localhost:5000';
            finalImageUrl = `${backendUrl}${savedImagePath}`;
            console.log("[Instagram Share] Generated and saved text image:", finalImageUrl);
          } else {
            throw new Error("Failed to parse generated image data");
          }
        } catch (generateError: any) {
          console.error("[Instagram Share] Failed to generate image from text:", generateError);
          // If image generation fails, return a helpful error message
          return res.status(400).json({
            success: false,
            message:
              "Image URL is required for Instagram posts. Instagram API only supports image or video posts, not text-only posts. Please provide an image, or the system will attempt to generate one from your text (image generation failed).",
            error: generateError.message,
          });
        }
      }

      // Share to Instagram
      const result = await shareToInstagram(
        instagram.userId!,
        instagram.accessToken,
        {
          text: content,
          imageUrl: finalImageUrl,
        }
      );

      res.json({
        success: true,
        message: "Successfully shared to Instagram",
        postId: result.postId,
        permalink: result.permalink,
      });
    } catch (error: any) {
      console.error("Instagram share error:", error);

      // Check if it's the image URL requirement error
      if (error.message && error.message.includes("Image URL is required")) {
        return res.status(400).json({
          success: false,
          message:
            "Image URL is required for Instagram posts. Instagram API only supports image or video posts, not text-only posts.",
        });
      }

      // Check if it's an authentication error
      if (
        error.response?.status === 401 ||
        error.response?.data?.error?.code === 190
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Instagram access token expired or invalid. Please reconnect your account.",
          requiresAuth: true,
        });
      }

      res.status(500).json({
        success: false,
        message:
          error.response?.data?.error?.message ||
          error.message ||
          "Failed to share to Instagram",
      });
    }
  }
);

/**
 * @desc    Get user's Facebook Pages list with Instagram info (for selection)
 * @route   GET /api/instagram/pages
 * @access  Private
 */
router.get("/pages", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const { token_key } = req.query;

    if (!token_key) {
      return res.status(400).json({
        success: false,
        message: "Token key is required. Please complete OAuth flow first.",
      });
    }

    // Get temporary token
    const tempTokenData = oauthStates.get(token_key as string);
    if (!tempTokenData) {
      return res.status(400).json({
        success: false,
        message: "Token expired or invalid. Please reconnect your account.",
      });
    }

    const { accessToken } = JSON.parse(tempTokenData);

    // Get Facebook Pages with Instagram info
    const pages = await getFacebookPagesWithInstagram(accessToken);

    res.json({
      success: true,
      pages,
      tokenKey: token_key, // Return token key for later use
    });
  } catch (error: any) {
    console.error("Error getting Facebook pages:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get Facebook pages",
    });
  }
});

/**
 * @desc    Connect selected Facebook Page and Instagram Account
 * @route   POST /api/instagram/connect-page
 * @access  Private
 */
router.post(
  "/connect-page",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const { pageId, tokenKey } = req.body;

      if (!pageId || !tokenKey) {
        return res.status(400).json({
          success: false,
          message: "pageId and tokenKey are required",
        });
      }

      // Get temporary token
      const tempTokenData = oauthStates.get(tokenKey);
      if (!tempTokenData) {
        return res.status(400).json({
          success: false,
          message: "Token expired or invalid. Please reconnect your account.",
        });
      }

      const { accessToken, expiresIn } = JSON.parse(tempTokenData);

      // Get Instagram account for selected page
      const instagramAccount = await getInstagramAccountIdForPage(
        pageId,
        accessToken
      );

      // Get Page access token for posting
      let pageAccessToken = accessToken;
      try {
        const pagesResponse = await axios.get(
          `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
        );
        if (pagesResponse.data.data && pagesResponse.data.data.length > 0) {
          const targetPage = pagesResponse.data.data.find(
            (page: any) => page.id === pageId
          );
          if (targetPage && targetPage.access_token) {
            pageAccessToken = targetPage.access_token;
            console.log("[Instagram Connect Page] Using Page access token for posting");
          }
        }
      } catch (error) {
        console.error("[Instagram Connect Page] Error getting Page access token:", error);
      }

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

      // Save to user
      if (!user.socialConnections) {
        user.socialConnections = {};
      }

      // Save Instagram connection
      user.socialConnections.instagram = {
        accessToken: accessToken,
        userId: instagramAccount.instagramAccountId,
        username: instagramAccount.username,
        accountType: instagramAccount.accountType,
        expiresAt,
      };

      // Also save Facebook Page connection
      user.socialConnections.facebook = {
        accessToken: pageAccessToken,
        userId: instagramAccount.facebookPageId,
        expiresAt,
      };

      await user.save();

      // Clean up temporary token
      oauthStates.delete(tokenKey);

      console.log("[Instagram OAuth] Successfully saved connections:", {
        userId: user._id,
        instagramUserId: user.socialConnections.instagram?.userId,
        instagramUsername: user.socialConnections.instagram?.username,
        facebookPageId: user.socialConnections.facebook?.userId,
        expiresAt: expiresAt.toISOString(),
      });

      // Return JSON with redirect URL for frontend to handle
      const clientUrl =
        process.env.CLIENT_URL ||
        process.env.FRONTEND_URL ||
        "http://localhost:3000";
      res.json({
        success: true,
        message: "Successfully connected Instagram and Facebook Page",
        redirectUrl: `${clientUrl}/socialdashboard?facebook=connected&instagram=connected`,
        instagram: {
          userId: instagramAccount.instagramAccountId,
          username: instagramAccount.username,
          accountType: instagramAccount.accountType,
        },
        facebook: {
          pageId: instagramAccount.facebookPageId,
          pageName: instagramAccount.facebookPageName,
        },
      });
    } catch (error: any) {
      console.error("Error connecting page:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to connect page",
      });
    }
  }
);

/**
 * @desc    Get Instagram connection status
 * @route   GET /api/instagram/status
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

      // IMPORTANT: Reload user from database to get latest socialConnections
      const freshUser = await User.findById(user._id);
      if (!freshUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const instagram = freshUser.socialConnections?.instagram;

      // Check Instagram connection
      if (
        !instagram ||
        !instagram.accessToken ||
        !instagram.userId
      ) {
        return res.json({
          success: true,
          connected: false,
        });
      }

      // Check if token is expired
      const isExpired = instagram.expiresAt && new Date() > instagram.expiresAt;

      if (isExpired) {
        return res.json({
          success: true,
          connected: false,
          message:
            "Instagram token has expired. Please reconnect your account.",
        });
      }

      // Get Instagram user profile information (account_type field is not always available)
      let profile = null;
      try {
        // Only request username field, account_type may not be available
        const profileResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${instagram.userId}?fields=username&access_token=${instagram.accessToken}`
        );

        profile = {
          id: instagram.userId,
          username: profileResponse.data.username || instagram.username,
          name: profileResponse.data.username || instagram.username,
          email: null, // Instagram API doesn't provide email
          picture: null,
          accountType: instagram.accountType || 'BUSINESS', // Use stored accountType or default
        };
      } catch (profileError: any) {
        console.warn(
          "[Instagram Status] Failed to get user profile:",
          profileError.response?.data || profileError.message
        );
        // Still return connected status even if we can't get profile
        profile = {
          id: instagram.userId,
          username: instagram.username,
          name: instagram.username || "Instagram Account",
          email: null,
          picture: null,
          accountType: instagram.accountType || 'BUSINESS',
        };
      }

      res.json({
        success: true,
        connected: true,
        username: instagram.username,
        accountType: instagram.accountType,
        expiresAt: instagram.expiresAt,
        profile: profile,
      });
    } catch (error: any) {
      console.error("Instagram status error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get Instagram status",
      });
    }
  }
);

/**
 * @desc    Disconnect Instagram account
 * @route   DELETE /api/instagram/disconnect
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

      // Remove Instagram connection
      // IMPORTANT: Use $unset to properly remove nested object in Mongoose
      if (freshUser.socialConnections?.instagram) {
        console.log("[Instagram Disconnect] Removing Instagram connection:", {
          userId: freshUser._id.toString(),
          instagramUserId: freshUser.socialConnections.instagram.userId,
          hasAccessToken: !!freshUser.socialConnections.instagram.accessToken,
        });

        // Use $unset to properly remove nested field in MongoDB
        await User.updateOne(
          { _id: user._id },
          { $unset: { "socialConnections.instagram": "" } }
        );
        console.log("[Instagram Disconnect] User updated using $unset");

        // Verify Instagram was removed
        const verifyUser = await User.findById(user._id);
        if (verifyUser?.socialConnections?.instagram) {
          console.error(
            "[Instagram Disconnect] WARNING: Instagram connection still exists after $unset!"
          );
          // Try direct delete as fallback
          delete verifyUser.socialConnections.instagram;
          await verifyUser.save();
        } else {
          console.log(
            "[Instagram Disconnect] Verified: Instagram connection successfully removed"
          );
        }

        console.log(
          `[Instagram Disconnect] Disconnected Instagram for user ${user._id}`
        );
        return res.json({
          success: true,
          message: "Instagram account disconnected successfully",
        });
      }

      return res.json({
        success: true,
        message: "No Instagram account was connected",
      });
    } catch (error: any) {
      console.error("[Instagram Disconnect] Error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: error.message || "Failed to disconnect Instagram account",
        });
    }
  }
);

export default router;

