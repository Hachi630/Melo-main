import { Router, Request, Response } from "express";
import { TwitterApi } from "twitter-api-v2";
import TwitterToken from "../models/TwitterToken";
import TwitterRequestToken from "../models/TwitterRequestToken";
import { protect } from "../middleware/auth";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import { AuthRequest } from "../types";
import { twitterService } from "../services/twitterService";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Configure multer for image uploads
const UPLOADS_DIR = path.join(__dirname, "../../uploads/images");

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
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `twitter-${timestamp}-${random}${ext}`);
  },
});

const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit (Twitter API maximum is 5MB)
  },
});

// STEP 1 — Redirect to Twitter OAuth
router.get("/auth", async (req, res) => {
  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET;
  const port = process.env.PORT || 5000;
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
  const callbackUrl =
    process.env.TWITTER_CALLBACK_URL || `${backendUrl}/api/twitter/callback`;

  if (!appKey || !appSecret) {
    console.error("Twitter API credentials missing:", {
      hasAppKey: !!appKey,
      hasAppSecret: !!appSecret,
    });
    return res
      .status(500)
      .json({ error: "Twitter API credentials are not configured" });
  }

  try {
    // Create a client with only app credentials (no user tokens yet)
    const client = new TwitterApi({
      appKey,
      appSecret,
    });

    console.log(
      "Generating Twitter OAuth link with callback URL:",
      callbackUrl
    );
    console.log("Twitter API credentials check:", {
      hasAppKey: !!appKey,
      hasAppSecret: !!appSecret,
      appKeyLength: appKey?.length,
      appSecretLength: appSecret?.length,
    });

    // Generate OAuth 1.0a authorization link
    let authLink;
    try {
      console.log("Attempting to generate Twitter Auth Link...");
      // generateAuthLink performs a network request to Twitter to get a Request Token, so it MUST be awaited
      authLink = await client.generateAuthLink(callbackUrl, {
        linkMode: "authorize", // Use 'authorize' to get user consent
      });

      console.log("Auth link generated successfully");
    } catch (linkError: any) {
      console.error("Error generating auth link:", {
        message: linkError.message,
        code: linkError.code,
        data: linkError.data,
        error: linkError,
      });

      // Check specifically for 403 Callback URL error
      if (
        linkError.code === 403 ||
        (linkError.data &&
          JSON.stringify(linkError.data).includes("Callback URL not approved"))
      ) {
        console.error(`
================================================================================
CRITICAL CONFIGURATION ERROR: Callback URL not approved
--------------------------------------------------------------------------------
Twitter refused the callback URL: ${callbackUrl}

ACTION REQUIRED:
1. Go to Twitter Developer Portal (https://developer.twitter.com/en/portal/dashboard)
2. Select your App -> Settings -> User authentication settings
3. Edit "Callback URLs"
4. Add exactly this URL: ${callbackUrl}
5. Save changes
================================================================================
        `);
      }
      throw linkError;
    }

    // Validate that we got the required tokens
    // Check both possible return formats: { oauth_token, oauth_token_secret } or { url, oauth_token_secret }
    const oauthToken =
      authLink.oauth_token ||
      (authLink.url
        ? new URL(authLink.url).searchParams.get("oauth_token")
        : null);
    const oauthTokenSecret = authLink.oauth_token_secret;

    if (!oauthToken || !oauthTokenSecret) {
      console.error("Invalid authLink response:", {
        authLink,
        hasOAuthToken: !!authLink?.oauth_token,
        hasOAuthTokenSecret: !!authLink?.oauth_token_secret,
        hasUrl: !!authLink?.url,
        authLinkType: typeof authLink,
        authLinkKeys: authLink ? Object.keys(authLink) : "null",
        extractedOAuthToken: oauthToken,
      });
      throw new Error(
        "Failed to generate OAuth tokens from Twitter API. Check your API credentials and callback URL configuration in Twitter Developer Portal."
      );
    }

    console.log(
      "Twitter OAuth link generated successfully, oauth_token:",
      oauthToken.substring(0, 10) + "..."
    );

    // Store the oauth_token and secret in the database
    // This is required because Twitter OAuth 1.0a callbacks don't guarantee returning the state parameter
    await TwitterRequestToken.create({
      oauthToken: oauthToken,
      oauthTokenSecret: oauthTokenSecret,
      userId: userId,
    });

    // Redirect to Twitter authorization page
    // We don't rely on state parameter for OAuth 1.0a flow anymore
    const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`;

    console.log("Twitter OAuth redirect URL generated successfully");
    console.log("Redirecting to:", authUrl.substring(0, 100) + "...");
    res.redirect(authUrl);
  } catch (error: any) {
    console.error("Twitter OAuth error:", {
      message: error.message,
      code: error.code,
      data: error.data,
      response: error.response?.data,
      stack: error.stack,
    });
    const clientUrl =
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:5173";
    res.redirect(
      `${clientUrl}/socialdashboard?twitter=error&reason=oauth_init_failed`
    );
  }
});

// STEP 2 — Receive Twitter OAuth callback
router.get("/callback", async (req, res) => {
  const oauthToken = req.query.oauth_token as string;
  const oauthVerifier = req.query.oauth_verifier as string;
  const denied = req.query.denied as string;

  console.log("Twitter Callback Received:", {
    oauthToken: oauthToken ? "present" : "missing",
    oauthVerifier: oauthVerifier ? "present" : "missing",
    denied,
  });

  // Handle user denial
  if (denied) {
    console.error("Twitter OAuth denied by user");
    const clientUrl =
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000";
    return res.redirect(
      `${clientUrl}/socialdashboard?twitter=error&reason=user_denied`
    );
  }

  // Check if required parameters are present
  if (!oauthToken || !oauthVerifier) {
    console.error("Twitter OAuth: Missing oauth_token or oauth_verifier");
    const clientUrl =
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000";
    return res.redirect(
      `${clientUrl}/socialdashboard?twitter=error&reason=missing_params`
    );
  }

  // Retrieve the request token from database
  let requestTokenDoc;
  try {
    requestTokenDoc = await TwitterRequestToken.findOne({ oauthToken });

    if (!requestTokenDoc) {
      console.error("Twitter OAuth: Invalid or expired oauth_token");
      const clientUrl =
        process.env.CLIENT_URL ||
        process.env.FRONTEND_URL ||
        "http://localhost:3000";
      return res.redirect(
        `${clientUrl}/socialdashboard?twitter=error&reason=invalid_token`
      );
    }
  } catch (error) {
    console.error("Database error retrieving request token:", error);
    const clientUrl =
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000";
    return res.redirect(
      `${clientUrl}/socialdashboard?twitter=error&reason=db_error`
    );
  }

  const { userId, oauthTokenSecret } = requestTokenDoc;

  if (!userId || !oauthTokenSecret) {
    const clientUrl =
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000";
    return res.redirect(
      `${clientUrl}/socialdashboard?twitter=error&reason=missing_user`
    );
  }

  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET;

  if (!appKey || !appSecret) {
    const clientUrl =
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000";
    return res.redirect(
      `${clientUrl}/socialdashboard?twitter=error&reason=config_error`
    );
  }

  try {
    console.log("Twitter OAuth: Starting token exchange...", {
      hasOAuthToken: !!oauthToken,
      hasOAuthVerifier: !!oauthVerifier,
      hasAppKey: !!appKey,
      hasAppSecret: !!appSecret,
      oauthTokenPreview: oauthToken?.substring(0, 10) + "...",
    });

    // Create a client with app credentials and temporary tokens
    const client = new TwitterApi({
      appKey,
      appSecret,
      accessToken: oauthToken,
      accessSecret: oauthTokenSecret,
    });

    // Exchange oauth_verifier for access tokens
    console.log("Twitter OAuth: Calling client.login()...");
    const {
      client: loggedClient,
      accessToken,
      accessSecret,
    } = await client.login(oauthVerifier);
    console.log("Twitter OAuth: Token exchange successful");

    // Get user info to store twitterUserId
    // Note: If we get 429 (rate limit), we can still save the tokens and get user info later
    let twitterUserId: string | null = null;
    let userInfoError: any = null;

    let twitterUsername: string | null = null;
    let twitterName: string | null = null;
    let twitterPicture: string | null = null;

    try {
      console.log("Twitter OAuth: Getting user info...");
      const userMe = await loggedClient.v2.me({
        "user.fields": "profile_image_url,name,username",
      });
      twitterUserId = userMe.data.id;
      twitterUsername = userMe.data.username || null;
      twitterName = userMe.data.name || null;
      twitterPicture = userMe.data.profile_image_url || null;
      console.log("Twitter OAuth: Got user info:", {
        id: twitterUserId,
        username: twitterUsername,
        name: twitterName,
        picture: twitterPicture,
      });
    } catch (err: any) {
      userInfoError = err;
      console.warn(
        "Twitter OAuth: Failed to get user info (may be rate limited):",
        err?.message
      );
      // If it's a 429 error, we can still save tokens and get user info later
      // For other errors, we'll still try to save tokens (user can refresh status later)
      if (err?.message?.includes("429")) {
        console.warn(
          "Twitter OAuth: Rate limited (429), but tokens are valid. Will get user info on next status check."
        );
      } else {
        console.warn(
          "Twitter OAuth: Other error getting user info, but will still save tokens:",
          err?.message
        );
      }
    }

    // Store tokens in database
    // Even if we couldn't get user info (e.g., rate limited), we still save the tokens
    // The user info can be fetched later when checking status
    try {
      await TwitterToken.findOneAndUpdate(
        { userId },
        {
          userId,
          twitterUserId: twitterUserId || undefined,
          twitterUsername: twitterUsername || undefined,
          twitterName: twitterName || undefined,
          twitterPicture: twitterPicture || undefined,
          accessToken,
          accessSecret,
          // OAuth 1.0a tokens don't expire, but we can set a far future date
          expiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // 100 years
        },
        { upsert: true }
      );

      console.log("Twitter OAuth: Tokens saved successfully", {
        userId,
        twitterUserId: twitterUserId || "will be fetched later",
        twitterUsername: twitterUsername || "will be fetched later",
        twitterName: twitterName || "will be fetched later",
        twitterPicture: twitterPicture ? "saved" : "will be fetched later",
        hadUserInfoError: !!userInfoError,
      });

      // Clean up the used request token
      await TwitterRequestToken.deleteOne({ _id: requestTokenDoc._id });

      // Redirect to success page even if we couldn't get user info (tokens are valid)
      const clientUrl =
        process.env.CLIENT_URL ||
        process.env.FRONTEND_URL ||
        "http://localhost:3000";
      if (userInfoError?.message?.includes("429")) {
        // If rate limited, still redirect to success but note it
        console.log(
          "Twitter OAuth: Redirecting to success page (rate limited, but tokens saved)"
        );
        res.redirect(
          `${clientUrl}/socialdashboard?twitter=connected&note=rate_limited`
        );
      } else {
        res.redirect(`${clientUrl}/socialdashboard?twitter=connected`);
      }
    } catch (saveError: any) {
      console.error("Twitter OAuth: Failed to save tokens:", saveError);
      throw saveError; // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    console.error(
      "Twitter OAuth callback error:",
      error?.response?.data || error.message || error
    );
    console.error("Twitter OAuth callback error details:", {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      code: error?.code,
      rateLimit: error?.rateLimit,
      stack: error?.stack,
    });

    const clientUrl =
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000";

    // Check if it's a rate limit error
    if (error?.code === 429 || error?.message?.includes("429")) {
      const rateLimit = error?.rateLimit;
      const resetTime = rateLimit?.userDay?.reset
        ? new Date(rateLimit.userDay.reset * 1000)
        : null;
      console.warn(
        "Twitter OAuth: Rate limited (429) - this is a Twitter API limit, not a code issue",
        {
          userDayLimit: rateLimit?.userDay?.limit,
          userDayRemaining: rateLimit?.userDay?.remaining,
          resetTime: resetTime?.toISOString(),
        }
      );
      // Redirect with rate limit info
      const resetTimestamp = resetTime
        ? Math.floor(resetTime.getTime() / 1000)
        : null;
      res.redirect(
        `${clientUrl}/socialdashboard?twitter=error&reason=rate_limited&reset=${resetTimestamp}`
      );
    } else {
      res.redirect(
        `${clientUrl}/socialdashboard?twitter=error&reason=token_exchange_failed`
      );
    }
  }
});

// STEP 3 — Disconnect Twitter account
router.delete("/disconnect", protect, async (req: any, res) => {
  const userId = req.user._id;

  try {
    const result = await TwitterToken.findOneAndDelete({ userId });

    if (!result) {
      return res.json({
        success: true,
        message: "No Twitter account was connected",
      });
    }

    console.log(`Twitter disconnected for user ${userId}`);
    res.json({
      success: true,
      message: "Twitter account disconnected successfully",
    });
  } catch (error: any) {
    console.error("Error disconnecting Twitter:", error.message);
    res
      .status(500)
      .json({ success: false, error: "Failed to disconnect Twitter account" });
  }
});

// STEP 5 — Create a tweet (text and/or image)
router.post(
  "/posts",
  protect,
  upload.single("image"),
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }
    const userId = req.user._id;
    const { text } = req.body;

    // Validate text content
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Tweet text is required",
      });
    }

    if (text.length > 280) {
      return res.status(400).json({
        success: false,
        error: "Tweet text cannot exceed 280 characters",
      });
    }

    // Check if user has connected their Twitter account
    const twitterToken = await TwitterToken.findOne({ userId });

    if (
      !twitterToken ||
      !twitterToken.accessToken ||
      !twitterToken.accessSecret
    ) {
      return res.status(401).json({
        success: false,
        error:
          "Twitter account not connected. Please connect your Twitter account first.",
        requiresAuth: true,
      });
    }

    try {
      let imagePath: string | null = null;

      // Handle image upload if present
      if (req.file) {
        // Validate file size (Twitter API limit is 5MB = 5242880 bytes)
        const maxFileSize = 5 * 1024 * 1024; // 5MB
        if (req.file.size > maxFileSize) {
          // Clean up the uploaded file
          const filePath = path.join(
            process.cwd(),
            `/uploads/images/${req.file.filename}`
          );
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (cleanupError) {
              console.warn("Failed to delete oversized file:", cleanupError);
            }
          }
          return res.status(400).json({
            success: false,
            error: `Image file size (${(req.file.size / 1024 / 1024).toFixed(2)}MB) exceeds Twitter's limit of 5MB`,
          });
        }

        // File is already saved by multer, get the path
        imagePath = `/uploads/images/${req.file.filename}`;
        // Convert to absolute path for twitterService
        const absolutePath = path.join(process.cwd(), imagePath);
        imagePath = absolutePath;
      }

      // Post tweet using user's tokens
      const result = await twitterService.postTweet(
        text.trim(),
        imagePath,
        twitterToken.accessToken,
        twitterToken.accessSecret
      );

      if (result.success) {
        // Clean up uploaded image file after successful post
        if (req.file && imagePath && fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
            console.log("Temporary image file deleted:", imagePath);
          } catch (cleanupError) {
            console.warn(
              "Failed to delete temporary image file:",
              cleanupError
            );
            // Don't fail the request if cleanup fails
          }
        }

        return res.json({
          success: true,
          message: "Tweet posted successfully",
          tweetId: result.tweetId,
        });
      } else {
        // Clean up uploaded image file on error
        if (req.file && imagePath && fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
          } catch (cleanupError) {
            console.warn(
              "Failed to delete temporary image file on error:",
              cleanupError
            );
          }
        }

        // Return detailed error information
        const errorMessage =
          result.error?.data?.detail ||
          result.error?.errors?.[0]?.message ||
          result.error?.message ||
          "Failed to post tweet";
        const errorCode = result.error?.code;

        console.error("Twitter posting failed:", {
          message: errorMessage,
          code: errorCode,
          fullError: result.error,
        });

        return res.status(500).json({
          success: false,
          error: errorMessage,
          code: errorCode,
          details: result.error?.data || result.error?.errors,
        });
      }
    } catch (error: any) {
      // Clean up uploaded image file on exception
      if (req.file) {
        const imagePath = path.join(
          process.cwd(),
          `/uploads/images/${req.file.filename}`
        );
        if (fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
          } catch (cleanupError) {
            console.warn(
              "Failed to delete temporary image file on exception:",
              cleanupError
            );
          }
        }
      }

      console.error("Error posting tweet:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to post tweet. Please try again.",
      });
    }
  }
);

// STEP 5 — Create a tweet (text and/or image)
router.post("/posts", protect, upload.single('image'), async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  const userId = req.user._id;
  const { text } = req.body;

  // Validate text content
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: "Tweet text is required" 
    });
  }

  if (text.length > 280) {
    return res.status(400).json({ 
      success: false, 
      error: "Tweet text cannot exceed 280 characters" 
    });
  }

  // Check if user has connected their Twitter account
  const twitterToken = await TwitterToken.findOne({ userId });

  if (!twitterToken || !twitterToken.accessToken || !twitterToken.accessSecret) {
    return res.status(401).json({
      success: false,
      error: "Twitter account not connected. Please connect your Twitter account first.",
      requiresAuth: true
    });
  }

  try {
    let imagePath: string | null = null;

    // Handle image upload if present
    if (req.file) {
      // Validate file size (Twitter API limit is 5MB = 5242880 bytes)
      const maxFileSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxFileSize) {
        // Clean up the uploaded file
        const filePath = path.join(process.cwd(), `/uploads/images/${req.file.filename}`);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (cleanupError) {
            console.warn('Failed to delete oversized file:', cleanupError);
          }
        }
        return res.status(400).json({
          success: false,
          error: `Image file size (${(req.file.size / 1024 / 1024).toFixed(2)}MB) exceeds Twitter's limit of 5MB`
        });
      }

      // File is already saved by multer, get the path
      imagePath = `/uploads/images/${req.file.filename}`;
      // Convert to absolute path for twitterService
      const absolutePath = path.join(process.cwd(), imagePath);
      imagePath = absolutePath;
    }

    // Post tweet using user's tokens
    const result = await twitterService.postTweet(
      text.trim(),
      imagePath,
      twitterToken.accessToken,
      twitterToken.accessSecret
    );

    if (result.success) {
      // Clean up uploaded image file after successful post
      if (req.file && imagePath && fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
          console.log('Temporary image file deleted:', imagePath);
        } catch (cleanupError) {
          console.warn('Failed to delete temporary image file:', cleanupError);
          // Don't fail the request if cleanup fails
        }
      }

      return res.json({
        success: true,
        message: "Tweet posted successfully",
        tweetId: result.tweetId
      });
    } else {
      // Clean up uploaded image file on error
      if (req.file && imagePath && fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (cleanupError) {
          console.warn('Failed to delete temporary image file on error:', cleanupError);
        }
      }

      // Return detailed error information
      const errorMessage = result.error?.data?.detail || 
                          result.error?.errors?.[0]?.message || 
                          result.error?.message || 
                          'Failed to post tweet';
      const errorCode = result.error?.code;

      console.error('Twitter posting failed:', {
        message: errorMessage,
        code: errorCode,
        fullError: result.error
      });

      return res.status(500).json({
        success: false,
        error: errorMessage,
        code: errorCode,
        details: result.error?.data || result.error?.errors
      });
    }
  } catch (error: any) {
    // Clean up uploaded image file on exception
    if (req.file) {
      const imagePath = path.join(process.cwd(), `/uploads/images/${req.file.filename}`);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (cleanupError) {
          console.warn('Failed to delete temporary image file on exception:', cleanupError);
        }
      }
    }

    console.error('Error posting tweet:', error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to post tweet. Please try again."
    });
  }
});

// STEP 4 — Check connection status
router.get("/status", protect, async (req: any, res) => {
  const userId = req.user._id;
  const token = await TwitterToken.findOne({ userId });

  if (!token?.accessToken || !token?.accessSecret) {
    return res.json({
      connected: false,
      profile: null,
    });
  }

  try {
    // Verify token is still valid by getting user info
    const appKey = process.env.TWITTER_API_KEY;
    const appSecret = process.env.TWITTER_API_SECRET;

    if (!appKey || !appSecret) {
      return res.json({
        connected: false,
        profile: null,
        error: "Twitter API credentials not configured",
      });
    }

    const client = new TwitterApi({
      appKey,
      appSecret,
      accessToken: token.accessToken,
      accessSecret: token.accessSecret,
    });

    const userMe = await client.v2.me({
      "user.fields": "profile_image_url,description",
    });

    // Update cached profile info in database
    await TwitterToken.findOneAndUpdate(
      { userId },
      {
        twitterUserId: userMe.data.id,
        twitterUsername: userMe.data.username || undefined,
        twitterName: userMe.data.name || undefined,
        twitterPicture: userMe.data.profile_image_url || undefined,
      }
    );

    res.json({
      connected: true,
      profile: {
        id: userMe.data.id,
        username: userMe.data.username,
        name: userMe.data.name,
        picture: userMe.data.profile_image_url || null,
        // Twitter API doesn't provide email without special permissions
        email: null,
      },
    });
  } catch (error: any) {
    console.error("Error checking Twitter status:", error);

    // Check if it's a rate limit error (429)
    // Don't delete token if it's just a rate limit - token is still valid
    if (error?.code === 429 || error?.message?.includes("429")) {
      const rateLimit = error?.rateLimit;
      const resetTime = rateLimit?.userDay?.reset
        ? new Date(rateLimit.userDay.reset * 1000)
        : null;

      console.warn(
        "Twitter status check: Rate limited (429), but token is valid",
        {
          userDayLimit: rateLimit?.userDay?.limit,
          userDayRemaining: rateLimit?.userDay?.remaining,
          resetTime: resetTime?.toISOString(),
        }
      );

      // Return connected: true even if we can't get profile due to rate limit
      // Use cached profile info from database if available
      return res.json({
        connected: true,
        profile: token.twitterUserId
          ? {
              id: token.twitterUserId,
              username: token.twitterUsername || null,
              name: token.twitterName || null,
              picture: token.twitterPicture || null,
              email: null,
            }
          : null,
        rateLimited: true,
        rateLimitReset: resetTime?.toISOString(),
        message:
          "Twitter account is connected, but user info cannot be fetched due to rate limit. Using cached profile info.",
      });
    }

    // For other errors, token might be invalid, remove it
    console.error(
      "Twitter status check: Token validation failed (not rate limit)"
    );
    await TwitterToken.findOneAndDelete({ userId });
    res.json({
      connected: false,
      profile: null,
      error: "Token validation failed",
    });
  }
});

export default router;
