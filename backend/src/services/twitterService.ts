import { TwitterApi } from 'twitter-api-v2';
import fs from 'fs';
import path from 'path';

export const twitterService = {
  /**
   * Initialize Twitter client with user tokens
   */
  getUserClient(accessToken: string, accessSecret: string) {
    const appKey = process.env.TWITTER_API_KEY;
    const appSecret = process.env.TWITTER_API_SECRET;

    if (!appKey || !appSecret) {
      throw new Error('Twitter API credentials are missing');
    }

    if (!accessToken || !accessSecret) {
      throw new Error('User Twitter tokens are missing');
    }

    // Create client with OAuth 1.0a user context
    const client = new TwitterApi({
      appKey,
      appSecret,
      accessToken,
      accessSecret,
    });

    // Return readWrite client explicitly for write operations
    return client.readWrite;
  },

  /**
   * Initialize Twitter client with default (developer) credentials
   * This is kept for backward compatibility
   */
  getClient() {
    // These env vars should be set in your .env file
    const appKey = process.env.TWITTER_API_KEY;
    const appSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (!appKey || !appSecret || !accessToken || !accessSecret) {
      throw new Error('Twitter API credentials are missing');
    }

    // Create client with OAuth 1.0a user context
    const client = new TwitterApi({
      appKey,
      appSecret,
      accessToken,
      accessSecret,
    });

    // Return readWrite client explicitly for write operations
    return client.readWrite;
  },

  /**
   * Post a tweet, optionally with an image
   * @param content - Tweet content
   * @param imageUrl - Optional image URL or path
   * @param accessToken - Optional user access token (if not provided, uses default)
   * @param accessSecret - Optional user access secret (if not provided, uses default)
   */
  async postTweet(
    content: string, 
    imageUrl?: string | null,
    accessToken?: string,
    accessSecret?: string
  ): Promise<{ success: boolean; tweetId?: string; error?: any }> {
    try {
      // Determine which client to use
      let baseClient: TwitterApi;
      let readWriteClient: any;

      if (accessToken && accessSecret) {
        // Use user's tokens
        baseClient = this.getUserBaseClient(accessToken, accessSecret);
        readWriteClient = this.getUserClient(accessToken, accessSecret);
      } else {
        // Use default (developer) credentials
        baseClient = this.getBaseClient();
        readWriteClient = this.getClient();
      }
      
      let mediaId;

      // If there's an image, upload it first using v1 API
      if (imageUrl) {
        // Handle both local paths and URLs
        let filePath = imageUrl;
        if (imageUrl.startsWith('/uploads')) {
          filePath = path.join(process.cwd(), imageUrl);
        }

        if (fs.existsSync(filePath)) {
          try {
            // Use base client for v1 media upload
            mediaId = await baseClient.v1.uploadMedia(filePath);
            console.log('Media uploaded successfully, mediaId:', mediaId);
          } catch (mediaError: any) {
            console.error('Media upload error:', mediaError);
            // Continue without media if upload fails
          }
        } else {
          console.warn(`Image file not found at ${filePath}, posting text only.`);
        }
      }

      // Validate content length (Twitter limit is 280 characters)
      if (content.length > 280) {
        console.warn(`Content length (${content.length}) exceeds Twitter limit (280), truncating...`);
        content = content.substring(0, 277) + '...';
      }

      // Post tweet using v2 API with readWrite client
      try {
        if (mediaId) {
          // Post tweet with media using v2 API
          console.log('Attempting to post tweet with media using v2 API...');
          console.log('Content length:', content.length, 'Media ID:', mediaId);
          const response = await readWriteClient.v2.tweet({
            text: content,
            media: {
              media_ids: [String(mediaId)]
            }
          });
          console.log('Tweet posted successfully via v2 API:', response.data.id);
          return { success: true, tweetId: response.data.id };
        } else {
          // Post text-only tweet using v2 API
          console.log('Attempting to post text-only tweet using v2 API...');
          console.log('Content length:', content.length);
          const response = await readWriteClient.v2.tweet({
            text: content
          });
          console.log('Tweet posted successfully via v2 API:', response.data.id);
          return { success: true, tweetId: response.data.id };
        }
      } catch (v2Error: any) {
        console.error('v2 API failed, error details:', {
          code: v2Error.code,
          message: v2Error.message,
          data: v2Error.data,
          errors: v2Error.errors,
          headers: v2Error.headers
        });
        
        // Return detailed error information
        const errorDetail = v2Error.data?.detail || v2Error.errors?.[0]?.message || v2Error.message;
        return { 
          success: false, 
          error: {
            message: errorDetail,
            code: v2Error.code,
            data: v2Error.data,
            errors: v2Error.errors
          }
        };
      }
    } catch (error: any) {
      console.error('Twitter API Error:', error);
      return { 
        success: false, 
        error: {
          message: error.message || 'Unknown error',
          code: error.code,
          data: error.data,
          errors: error.errors
        }
      };
    }
  },

  /**
   * Get base client for v1 API operations (like media upload) with user tokens
   */
  getUserBaseClient(accessToken: string, accessSecret: string) {
    const appKey = process.env.TWITTER_API_KEY;
    const appSecret = process.env.TWITTER_API_SECRET;

    if (!appKey || !appSecret) {
      throw new Error('Twitter API credentials are missing');
    }

    if (!accessToken || !accessSecret) {
      throw new Error('User Twitter tokens are missing');
    }

    return new TwitterApi({
      appKey,
      appSecret,
      accessToken,
      accessSecret,
    });
  },

  /**
   * Get base client for v1 API operations (like media upload)
   * This is kept for backward compatibility
   */
  getBaseClient() {
    const appKey = process.env.TWITTER_API_KEY;
    const appSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (!appKey || !appSecret || !accessToken || !accessSecret) {
      throw new Error('Twitter API credentials are missing');
    }

    return new TwitterApi({
      appKey,
      appSecret,
      accessToken,
      accessSecret,
    });
  }
};

