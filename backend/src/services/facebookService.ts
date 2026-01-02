import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET
// Facebook OAuth callback URI (independent from Instagram)
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || 
  (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/auth/facebook/callback` : 'http://localhost:3000/auth/facebook/callback')

/**
 * Generate Facebook OAuth authorization URL (for Facebook Page sharing only)
 * @param state - OAuth state parameter
 */
export function getFacebookAuthUrl(state: string): string {
  if (!FACEBOOK_APP_ID) {
    throw new Error('FACEBOOK_APP_ID is not configured')
  }

  // For Facebook Page sharing, we need basic Pages API permissions
  // We don't need business_management scope for basic Facebook Page sharing
  const scopes = [
    'pages_read_engagement',  // Read page engagement (for getting Pages list)
    'pages_manage_posts',     // Manage page posts (required for publishing)
    'pages_show_list',        // List user's pages (required)
  ].filter(Boolean).join(',')

  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: FACEBOOK_REDIRECT_URI,
    response_type: 'code',
    state,
  })
  
  if (scopes) {
    params.append('scope', scopes)
  }

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string
  tokenType: string
  expiresIn: number
}> {
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    throw new Error('Facebook App credentials are not configured')
  }

  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    client_secret: FACEBOOK_APP_SECRET,
    redirect_uri: FACEBOOK_REDIRECT_URI,
    code,
  })

  try {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`
    )

    return {
      accessToken: response.data.access_token,
      tokenType: response.data.token_type || 'bearer',
      expiresIn: response.data.expires_in || 5184000, // Default 60 days
    }
  } catch (error: any) {
    console.error('[Facebook Service] Error exchanging code for token:', error.response?.data || error.message)
    throw new Error(`Failed to exchange code for token: ${error.response?.data?.error?.message || error.message}`)
  }
}

/**
 * Get long-lived access token (valid for 60 days)
 */
export async function getLongLivedToken(shortLivedToken: string): Promise<{
  accessToken: string
  expiresIn: number
}> {
  if (!FACEBOOK_APP_SECRET) {
    throw new Error('FACEBOOK_APP_SECRET is not configured')
  }

  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: FACEBOOK_APP_ID!,
    client_secret: FACEBOOK_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  })

  try {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`
    )

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in || 5184000,
    }
  } catch (error: any) {
    console.error('[Facebook Service] Error getting long-lived token:', error.response?.data || error.message)
    throw new Error(`Failed to get long-lived token: ${error.response?.data?.error?.message || error.message}`)
  }
}

/**
 * Get user's Facebook Pages list (Facebook only, no Instagram checking)
 */
export async function getFacebookPages(accessToken: string): Promise<Array<{
  id: string
  name: string
  category: string
  accessToken: string
  tasks: string[]
}>> {
  try {
    console.log('[Facebook Service] Requesting Facebook Pages...')
    const pagesResponse = await axios.get(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    )

    console.log('[Facebook Service] API Response:', {
      hasData: !!pagesResponse.data.data,
      dataLength: pagesResponse.data.data?.length || 0,
      error: pagesResponse.data.error,
    })

    if (!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
      console.log('[Facebook Service] No pages found. User may not have any Facebook Pages.')
      return []
    }

    console.log('[Facebook Service] Found', pagesResponse.data.data.length, 'pages')

    // Return pages without Instagram checking (Facebook-only service)
    return pagesResponse.data.data.map((page: any) => ({
      id: page.id,
      name: page.name,
      category: page.category || '',
      accessToken: page.access_token,
      tasks: page.tasks || [],
    }))
  } catch (error: any) {
    console.error('[Facebook Service] Error getting Facebook pages:', error.response?.data || error.message)
    throw new Error(`Failed to get Facebook pages: ${error.response?.data?.error?.message || error.message}`)
  }
}

/**
 * Share content to Facebook Page
 */
export async function shareToFacebook(
  pageId: string,
  pageAccessToken: string,
  content: {
    text: string
    imageUrl?: string
    imagePath?: string  // Local file path for direct upload
    videoUrl?: string
    videoPath?: string  // Local file path for direct upload
    linkUrl?: string
    linkName?: string
    linkDescription?: string
  }
): Promise<{
  postId: string
  permalink?: string
}> {
  try {
    console.log('[Facebook Service] Sharing to Facebook Page:', {
      pageId,
      hasImage: !!(content.imageUrl || content.imagePath),
      hasVideo: !!(content.videoUrl || content.videoPath),
      hasLink: !!content.linkUrl,
    })

    let postId: string
    let permalink: string | undefined

    // If video is provided, create a post with video
    if (content.videoPath || content.videoUrl) {
      // Facebook video upload uses graph-video.facebook.com endpoint
      if (content.videoPath && fs.existsSync(content.videoPath)) {
        // Direct file upload using FormData
        const formData = new FormData()
        formData.append('file', fs.createReadStream(content.videoPath))
        formData.append('description', content.text)
        formData.append('access_token', pageAccessToken)

        const videoResponse = await axios.post(
          `https://graph-video.facebook.com/v24.0/${pageId}/videos`,
          formData,
          {
            headers: formData.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          }
        )
        postId = videoResponse.data.id
        permalink = `https://www.facebook.com/${postId}`
      } else if (content.videoUrl) {
        // Fallback to URL method
        const videoResponse = await axios.post(
          `https://graph-video.facebook.com/v24.0/${pageId}/videos`,
          {
            file_url: content.videoUrl,
            description: content.text,
            access_token: pageAccessToken,
          }
        )
        postId = videoResponse.data.id
        permalink = `https://www.facebook.com/${postId}`
      }
    }
    // If image is provided, create a post with photo
    else if (content.imagePath || content.imageUrl) {
      if (content.imagePath && fs.existsSync(content.imagePath)) {
        // Direct file upload using FormData
        const formData = new FormData()
        formData.append('source', fs.createReadStream(content.imagePath))
        formData.append('message', content.text)
        formData.append('access_token', pageAccessToken)

        const photoResponse = await axios.post(
          `https://graph.facebook.com/v24.0/${pageId}/photos`,
          formData,
          {
            headers: formData.getHeaders(),
          }
        )
        postId = photoResponse.data.id
        permalink = photoResponse.data.post_id
          ? `https://www.facebook.com/photo.php?fbid=${postId}`
          : undefined
      } else if (content.imageUrl) {
        // Fallback to URL method (for publicly accessible URLs)
        const photoResponse = await axios.post(
          `https://graph.facebook.com/v24.0/${pageId}/photos`,
          {
            url: content.imageUrl,
            message: content.text,
            access_token: pageAccessToken,
          }
        )
        postId = photoResponse.data.id
        permalink = photoResponse.data.post_id
          ? `https://www.facebook.com/photo.php?fbid=${postId}`
          : undefined
      }
    }
    // If linkUrl is provided, create a link post
    else if (content.linkUrl) {
      const linkResponse = await axios.post(
        `https://graph.facebook.com/v24.0/${pageId}/feed`,
        {
          message: content.text,
          link: content.linkUrl,
          name: content.linkName,
          description: content.linkDescription,
          access_token: pageAccessToken,
        }
      )
      postId = linkResponse.data.id
      permalink = `https://www.facebook.com/${postId}`
    }
    // Create a text-only post
    else {
      const postResponse = await axios.post(
        `https://graph.facebook.com/v24.0/${pageId}/feed`,
        {
          message: content.text,
          access_token: pageAccessToken,
        }
      )
      postId = postResponse.data.id
      permalink = `https://www.facebook.com/${postId}`
    }

    return {
      postId,
      permalink,
    }
  } catch (error: any) {
    console.error('[Facebook Service] Error sharing to Facebook:', error.response?.data || error.message)
    throw new Error(`Failed to share to Facebook: ${error.response?.data?.error?.message || error.message}`)
  }
}

