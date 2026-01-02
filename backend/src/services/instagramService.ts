import axios from 'axios'

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET
// Instagram OAuth callback URI (independent from Facebook)
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 
  (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/auth/instagram/callback` : 'http://localhost:3000/auth/instagram/callback')

/**
 * Generate Instagram OAuth authorization URL
 * @param state - OAuth state parameter
 * @param includeBusinessManagement - Whether to include business_management scope (required for Instagram, but not for basic Facebook sharing)
 */
export function getInstagramAuthUrl(state: string, includeBusinessManagement: boolean = true): string {
  if (!FACEBOOK_APP_ID) {
    throw new Error('FACEBOOK_APP_ID is not configured')
  }

  // For Instagram Graph API, we need permissions to access Facebook Pages
  // Based on Facebook Pages API official documentation:
  // https://developers.facebook.com/docs/pages-api/getting-started
  // 
  // Required permissions according to official docs:
  // - pages_manage_metadata: Manage page metadata
  // - pages_manage_posts: Manage page posts (required for publishing)
  // - pages_manage_read_engagement: Read page engagement data (required to list pages)
  // - pages_show_list: List user's pages (may be deprecated but still in official docs)
  // 
  // For Instagram Business Account access, we specifically need:
  // - pages_manage_read_engagement: To get list of pages and access Instagram account
  // - pages_manage_posts: To publish content to Instagram
  // 
  // Required permissions for Instagram API with Facebook Login
  // Based on Facebook documentation: https://developers.facebook.com/docs/instagram-api/getting-started
  // 
  // IMPORTANT: instagram_content_publishing and instagram_basic are NOT valid OAuth scopes.
  // These permissions are granted automatically when you have the correct Pages API permissions
  // and the app is configured in Facebook App Dashboard > Products > Instagram.
  //
  // For OAuth, we need Pages API permissions:
  // - pages_read_engagement: Read page engagement data (required to list pages and access Instagram)
  // - pages_manage_posts: Manage page posts (required for publishing to Instagram)
  // - pages_show_list: List user's pages (required)
  // - business_management: Manage business assets (required for Instagram, but NOT required for basic Facebook Page sharing)
  //
  // NOTE: business_management scope may only be available for Business Accounts.
  // For personal accounts that just want to share to Facebook Pages, we can omit this scope.
  // The Instagram permissions (instagram_basic, instagram_content_publishing) are configured
  // in Facebook App Dashboard > Products > Instagram > API setup with Facebook login,
  // but are NOT requested in OAuth scope.
  const scopes = [
    'pages_read_engagement',  // Read page engagement (for getting Pages list and Instagram access)
    'pages_manage_posts',     // Manage page posts (required for publishing to Facebook/Instagram)
    'pages_show_list',        // List user's pages (required)
    // business_management is only needed for Instagram Business Account access
    // It may not be available for personal accounts, so make it optional
    ...(includeBusinessManagement ? ['business_management'] : []),
  ].filter(Boolean).join(',')
  
  // Alternative: If above doesn't work, try minimal set:
  // const scopes = 'pages_read_engagement'
  
  // Fallback: Use empty scope (let Facebook use default permissions)
  // const scopes = ''

  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: INSTAGRAM_REDIRECT_URI,
    response_type: 'code',
    state,
  })
  
  // Only add scope if we have permissions to request
  // If empty, Facebook will use default permissions for the app
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
    redirect_uri: INSTAGRAM_REDIRECT_URI,
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
    console.error('Error exchanging code for token:', error.response?.data || error.message)
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
    console.error('Error getting long-lived token:', error.response?.data || error.message)
    throw new Error(`Failed to get long-lived token: ${error.response?.data?.error?.message || error.message}`)
  }
}

/**
 * Get user's Facebook Pages list with Instagram account information
 * This is used by Instagram service to find pages with connected Instagram accounts
 */
export async function getFacebookPagesWithInstagram(accessToken: string): Promise<Array<{
  id: string
  name: string
  category: string
  accessToken: string
  tasks: string[]
  hasInstagramAccount?: boolean
  instagramAccountId?: string
  instagramUsername?: string
}>> {
  try {
    console.log('[Instagram Service] Requesting Facebook Pages with Instagram info...')
    const pagesResponse = await axios.get(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    )

    console.log('[Instagram Service] API Response:', {
      hasData: !!pagesResponse.data.data,
      dataLength: pagesResponse.data.data?.length || 0,
      error: pagesResponse.data.error,
    })

    if (!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
      console.log('[Instagram Service] No pages found. User may not have any Facebook Pages.')
      return []
    }

    console.log('[Instagram Service] Found', pagesResponse.data.data.length, 'pages')

    // Check each page for Instagram Business Account
    const pagesWithInstagram = await Promise.all(
      pagesResponse.data.data.map(async (page: any) => {
        try {
          console.log(`[Instagram Service] Checking Instagram for page: ${page.name} (${page.id})`)
          
          // Try to get Instagram Business Account using page access token
          const instagramResponse = await axios.get(
            `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
          )

          console.log(`[Instagram Service] Instagram response for ${page.name}:`, {
            hasInstagramAccount: !!instagramResponse.data.instagram_business_account,
            instagramAccountId: instagramResponse.data.instagram_business_account?.id,
            error: instagramResponse.data.error,
          })

          if (instagramResponse.data.instagram_business_account) {
            const instagramAccountId = instagramResponse.data.instagram_business_account.id
            console.log(`[Instagram Service] Found Instagram account: ${instagramAccountId} for page: ${page.name}`)
            
            // Get Instagram account details (account_type is optional, may not be available)
            let instagramUsername: string;
            try {
              const accountDetailsResponse = await axios.get(
                `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username,account_type&access_token=${page.access_token}`
              )
              console.log(`[Instagram Service] Instagram account details:`, accountDetailsResponse.data)
              instagramUsername = accountDetailsResponse.data.username;
            } catch (accountError: any) {
              // If account_type field is not available, try without it
              console.log(`[Instagram Service] Failed to get account_type, trying username only:`, accountError.response?.data || accountError.message)
              const usernameResponse = await axios.get(
                `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username&access_token=${page.access_token}`
              )
              instagramUsername = usernameResponse.data.username;
            }

            return {
              id: page.id,
              name: page.name,
              category: page.category || '',
              accessToken: page.access_token,
              tasks: page.tasks || [],
              hasInstagramAccount: true,
              instagramAccountId,
              instagramUsername,
            }
          } else {
            console.log(`[Instagram Service] No Instagram account found for page: ${page.name}`)
            // Try alternative methods to find Instagram account
            try {
              // Method 1: Try nested fields query
              const pageDetailsResponse = await axios.get(
                `https://graph.facebook.com/v18.0/${page.id}?fields=id,name,instagram_business_account{id,username}&access_token=${page.access_token}`
              )
              console.log(`[Instagram Service] Method 1 - Nested fields:`, {
                hasInstagram: !!pageDetailsResponse.data.instagram_business_account,
                instagram: pageDetailsResponse.data.instagram_business_account,
                fullResponse: pageDetailsResponse.data,
              })
              
              if (pageDetailsResponse.data.instagram_business_account) {
                const instagramAccountId = pageDetailsResponse.data.instagram_business_account.id
                const instagramUsername = pageDetailsResponse.data.instagram_business_account.username
                
                return {
                  id: page.id,
                  name: page.name,
                  category: page.category || '',
                  accessToken: page.access_token,
                  tasks: page.tasks || [],
                  hasInstagramAccount: true,
                  instagramAccountId,
                  instagramUsername,
                }
              }
              
              // Method 2: Try to query using business_management API
              try {
                // First, try to get business account ID
                const businessResponse = await axios.get(
                  `https://graph.facebook.com/v18.0/${page.id}?fields=business&access_token=${page.access_token}`
                )
                console.log(`[Instagram Service] Method 2a - Business info:`, businessResponse.data)
                
                if (businessResponse.data.business) {
                  const businessId = businessResponse.data.business.id
                  // Try to get Instagram accounts for this business
                  const instagramAccountsResponse = await axios.get(
                    `https://graph.facebook.com/v18.0/${businessId}/owned_instagram_accounts?access_token=${page.access_token}`
                  )
                  console.log(`[Instagram Service] Method 2b - Instagram accounts:`, instagramAccountsResponse.data)
                  
                  if (instagramAccountsResponse.data.data && instagramAccountsResponse.data.data.length > 0) {
                    const instagramAccount = instagramAccountsResponse.data.data[0]
                    // Try to get username (account_type may not be available)
                    let instagramUsername: string;
                    try {
                      const accountDetailsResponse = await axios.get(
                        `https://graph.facebook.com/v18.0/${instagramAccount.id}?fields=username,account_type&access_token=${page.access_token}`
                      )
                      instagramUsername = accountDetailsResponse.data.username;
                    } catch (accountError: any) {
                      // If account_type field is not available, try without it
                      const usernameResponse = await axios.get(
                        `https://graph.facebook.com/v18.0/${instagramAccount.id}?fields=username&access_token=${page.access_token}`
                      )
                      instagramUsername = usernameResponse.data.username;
                    }
                    
                    return {
                      id: page.id,
                      name: page.name,
                      category: page.category || '',
                      accessToken: page.access_token,
                      tasks: page.tasks || [],
                      hasInstagramAccount: true,
                      instagramAccountId: instagramAccount.id,
                      instagramUsername,
                    }
                  }
                }
              } catch (m2Error: any) {
                console.log(`[Instagram Service] Method 2 failed:`, m2Error.response?.data || m2Error.message)
              }
              
              // Method 3: Try using user's access token instead of page token
              try {
                const userTokenResponse = await axios.get(
                  `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`
                )
                console.log(`[Instagram Service] Method 3 - Using user token:`, {
                  hasInstagram: !!userTokenResponse.data.instagram_business_account,
                  instagram: userTokenResponse.data.instagram_business_account,
                })
                
                if (userTokenResponse.data.instagram_business_account) {
                  const instagramAccountId = userTokenResponse.data.instagram_business_account.id
                  // Try to get username (account_type may not be available)
                  let instagramUsername: string;
                  try {
                    const accountDetailsResponse = await axios.get(
                      `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username,account_type&access_token=${accessToken}`
                    )
                    instagramUsername = accountDetailsResponse.data.username;
                  } catch (accountError: any) {
                    // If account_type field is not available, try without it
                    const usernameResponse = await axios.get(
                      `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username&access_token=${accessToken}`
                    )
                    instagramUsername = usernameResponse.data.username;
                  }
                  
                  return {
                    id: page.id,
                    name: page.name,
                    category: page.category || '',
                    accessToken: page.access_token,
                    tasks: page.tasks || [],
                    hasInstagramAccount: true,
                    instagramAccountId,
                    instagramUsername,
                  }
                }
              } catch (m3Error: any) {
                console.log(`[Instagram Service] Method 3 failed:`, m3Error.response?.data || m3Error.message)
              }
              
            } catch (altError: any) {
              console.log(`[Instagram Service] Alternative methods failed:`, altError.response?.data || altError.message)
            }
            
            // Even if we can't detect Instagram, return the page so user can still use it
            // The connection might exist but API permissions might not allow us to see it
            console.log(`[Instagram Service] Returning page without Instagram detection: ${page.name}`)
            return {
              id: page.id,
              name: page.name,
              category: page.category || '',
              accessToken: page.access_token,
              tasks: page.tasks || [],
              hasInstagramAccount: false,
            }
          }
        } catch (error: any) {
          console.error(`[Instagram Service] Error checking Instagram for page ${page.name}:`, {
            error: error.message,
            response: error.response?.data,
            status: error.response?.status,
          })
          // If error checking Instagram, still return the page
          return {
            id: page.id,
            name: page.name,
            category: page.category || '',
            accessToken: page.access_token,
            tasks: page.tasks || [],
            hasInstagramAccount: false,
          }
        }
      })
    )

    return pagesWithInstagram
  } catch (error: any) {
    console.error('[Instagram Service] Error getting Facebook pages:', error.response?.data || error.message)
    throw new Error(`Failed to get Facebook pages: ${error.response?.data?.error?.message || error.message}`)
  }
}

/**
 * Get Instagram Business Account ID for a specific Facebook Page
 */
export async function getInstagramAccountIdForPage(
  pageId: string,
  accessToken: string
): Promise<{
  instagramAccountId: string
  username: string
  accountType: 'BUSINESS' | 'CREATOR'
  facebookPageId: string
  facebookPageName?: string
}> {
  try {
    console.log(`[getInstagramAccountIdForPage] Getting Instagram for page: ${pageId}`)
    
    // Method 1: Try standard field query
    let pageResponse
    try {
      pageResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${pageId}?fields=name,instagram_business_account&access_token=${accessToken}`
      )
      console.log(`[getInstagramAccountIdForPage] Method 1 response:`, {
        hasInstagram: !!pageResponse.data.instagram_business_account,
        instagram: pageResponse.data.instagram_business_account,
      })
    } catch (error: any) {
      console.log(`[getInstagramAccountIdForPage] Method 1 failed:`, error.response?.data || error.message)
      pageResponse = null
    }

    // Method 2: Try nested fields query
    if (!pageResponse?.data?.instagram_business_account) {
      try {
        pageResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${pageId}?fields=name,instagram_business_account{id,username}&access_token=${accessToken}`
        )
        console.log(`[getInstagramAccountIdForPage] Method 2 response:`, {
          hasInstagram: !!pageResponse.data.instagram_business_account,
          instagram: pageResponse.data.instagram_business_account,
        })
      } catch (error: any) {
        console.log(`[getInstagramAccountIdForPage] Method 2 failed:`, error.response?.data || error.message)
      }
    }

    // Method 3: Try using business API with page token
    if (!pageResponse?.data?.instagram_business_account) {
      try {
        // Get business ID first
        const businessResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${pageId}?fields=business&access_token=${accessToken}`
        )
        console.log(`[getInstagramAccountIdForPage] Method 3a - Business:`, businessResponse.data)
        
        if (businessResponse.data.business) {
          const businessId = businessResponse.data.business.id
          console.log(`[getInstagramAccountIdForPage] Found business ID: ${businessId}`)
          
          // Method 3b: Try to get Instagram accounts using business ID
          // Note: This might require business_management permission
          try {
            const instagramAccountsResponse = await axios.get(
              `https://graph.facebook.com/v18.0/${businessId}/owned_instagram_accounts?access_token=${accessToken}`
            )
            console.log(`[getInstagramAccountIdForPage] Method 3b - Instagram accounts:`, instagramAccountsResponse.data)
            
            if (instagramAccountsResponse.data.data && instagramAccountsResponse.data.data.length > 0) {
              const instagramAccount = instagramAccountsResponse.data.data[0]
                  // Try to get username (account_type may not be available)
                  let instagramUsername: string;
                  let accountType: 'BUSINESS' | 'CREATOR' = 'BUSINESS'; // Default to BUSINESS
                  try {
                    const accountDetailsResponse = await axios.get(
                      `https://graph.facebook.com/v18.0/${instagramAccount.id}?fields=username,account_type&access_token=${accessToken}`
                    )
                    instagramUsername = accountDetailsResponse.data.username;
                    accountType = accountDetailsResponse.data.account_type === 'BUSINESS' ? 'BUSINESS' : 'CREATOR';
                  } catch (accountError: any) {
                    // If account_type field is not available, try without it
                    const usernameResponse = await axios.get(
                      `https://graph.facebook.com/v18.0/${instagramAccount.id}?fields=username&access_token=${accessToken}`
                    )
                    instagramUsername = usernameResponse.data.username;
                    // Default to BUSINESS if we can't get account_type
                  }
                  
                  // Get page name
                  const pageNameResponse = await axios.get(
                    `https://graph.facebook.com/v18.0/${pageId}?fields=name&access_token=${accessToken}`
                  )
                  
                  return {
                    instagramAccountId: instagramAccount.id,
                    username: instagramUsername,
                    accountType,
                    facebookPageId: pageId,
                    facebookPageName: pageNameResponse.data.name,
                  }
            }
          } catch (m3bError: any) {
            console.log(`[getInstagramAccountIdForPage] Method 3b failed:`, m3bError.response?.data || m3bError.message)
          }
          
          // Method 3c: Try alternative - get Instagram accounts through page
          try {
            // Try to get Instagram account through the page using business context
            const pageWithBusinessResponse = await axios.get(
              `https://graph.facebook.com/v18.0/${pageId}?fields=id,name,business{owned_instagram_accounts{id,username}}&access_token=${accessToken}`
            )
            console.log(`[getInstagramAccountIdForPage] Method 3c - Page with business Instagram:`, pageWithBusinessResponse.data)
            
            if (pageWithBusinessResponse.data.business?.owned_instagram_accounts?.data?.length > 0) {
              const instagramAccount = pageWithBusinessResponse.data.business.owned_instagram_accounts.data[0]
              
              return {
                instagramAccountId: instagramAccount.id,
                username: instagramAccount.username,
                accountType: 'BUSINESS' as const, // Default to BUSINESS if not available in nested query
                facebookPageId: pageId,
                facebookPageName: pageWithBusinessResponse.data.name,
              }
            }
          } catch (m3cError: any) {
            console.log(`[getInstagramAccountIdForPage] Method 3c failed:`, m3cError.response?.data || m3cError.message)
          }
        }
      } catch (error: any) {
        console.log(`[getInstagramAccountIdForPage] Method 3 failed:`, error.response?.data || error.message)
      }
    }

    // If we found Instagram account in pageResponse
    if (pageResponse?.data?.instagram_business_account) {
      const instagramAccountId = pageResponse.data.instagram_business_account.id
      console.log(`[getInstagramAccountIdForPage] Found Instagram account ID: ${instagramAccountId}`)

      // Get Instagram account details (account_type is optional, may not be available)
      let instagramUsername: string;
      let accountType: 'BUSINESS' | 'CREATOR' = 'BUSINESS'; // Default to BUSINESS
      try {
        const accountDetailsResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username,account_type&access_token=${accessToken}`
        )
        console.log(`[getInstagramAccountIdForPage] Instagram account details:`, accountDetailsResponse.data)
        instagramUsername = accountDetailsResponse.data.username;
        accountType = accountDetailsResponse.data.account_type === 'BUSINESS' ? 'BUSINESS' : 'CREATOR';
      } catch (accountError: any) {
        // If account_type field is not available, try without it
        console.log(`[getInstagramAccountIdForPage] account_type not available, trying username only:`, accountError.response?.data || accountError.message)
        const usernameResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username&access_token=${accessToken}`
        )
        instagramUsername = usernameResponse.data.username;
        // Default to BUSINESS if we can't get account_type
      }

      return {
        instagramAccountId,
        username: instagramUsername,
        accountType,
        facebookPageId: pageId,
        facebookPageName: pageResponse.data.name,
      }
    }

    // If all methods fail, throw error
    throw new Error('No Instagram Business Account found. Please connect an Instagram Business Account to your Facebook page.')
  } catch (error: any) {
    console.error('[getInstagramAccountIdForPage] Error:', error.response?.data || error.message)
    throw new Error(`Failed to get Instagram account: ${error.response?.data?.error?.message || error.message}`)
  }
}

/**
 * Create an Instagram media container (for image posts)
 */
export async function createMediaContainer(
  instagramAccountId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
): Promise<string> {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
      {
        image_url: imageUrl,
        caption: caption.substring(0, 2200), // Instagram caption limit
        access_token: accessToken,
      }
    )

    return response.data.id // Returns creation_id
  } catch (error: any) {
    console.error('Error creating media container:', error.response?.data || error.message)
    throw new Error(`Failed to create media container: ${error.response?.data?.error?.message || error.message}`)
  }
}

/**
 * Publish Instagram media container
 */
export async function publishMedia(
  instagramAccountId: string,
  accessToken: string,
  creationId: string
): Promise<{
  id: string
  permalink?: string
}> {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish`,
      {
        creation_id: creationId,
        access_token: accessToken,
      }
    )

    // Get post permalink
    let permalink: string | undefined
    try {
      const postResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${response.data.id}?fields=permalink&access_token=${accessToken}`
      )
      permalink = postResponse.data.permalink
    } catch (e) {
      // Permalink is optional
    }

    return {
      id: response.data.id,
      permalink,
    }
  } catch (error: any) {
    console.error('Error publishing media:', error.response?.data || error.message)
    throw new Error(`Failed to publish media: ${error.response?.data?.error?.message || error.message}`)
  }
}

/**
 * Share content to Instagram
 */
export async function shareToInstagram(
  instagramAccountId: string,
  accessToken: string,
  content: {
    text: string
    imageUrl?: string
  }
): Promise<{
  postId: string
  permalink?: string
}> {
  if (!content.imageUrl) {
    throw new Error('Image URL is required for Instagram posts')
  }

  // Step 1: Create media container
  const creationId = await createMediaContainer(
    instagramAccountId,
    accessToken,
    content.imageUrl,
    content.text
  )

  // Step 2: Publish the media
  return await publishMedia(instagramAccountId, accessToken, creationId)
}

