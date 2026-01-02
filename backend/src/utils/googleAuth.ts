import { OAuth2Client } from 'google-auth-library'

/**
 * Google OAuth2 Client for verifying ID tokens
 */
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

/**
 * Interface for Google user information from verified token
 */
export interface GoogleUserInfo {
  sub: string // Google user ID
  email: string
  email_verified: boolean
  name?: string
  picture?: string
  given_name?: string
  family_name?: string
}

/**
 * Verify Google ID token and extract user information
 * @param idToken - The ID token received from Google OAuth
 * @returns User information from the verified token
 * @throws Error if token is invalid or verification fails
 */
export async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID environment variable is not set')
    }

    // Verify the token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    // Get the payload (user information)
    const payload = ticket.getPayload()

    if (!payload) {
      throw new Error('Invalid token: No payload found')
    }

    // Extract and return user information
    const userInfo: GoogleUserInfo = {
      sub: payload.sub,
      email: payload.email || '',
      email_verified: payload.email_verified || false,
      name: payload.name,
      picture: payload.picture,
      given_name: payload.given_name,
      family_name: payload.family_name,
    }

    // Validate required fields
    if (!userInfo.email) {
      throw new Error('Invalid token: Email not found in token')
    }

    return userInfo
  } catch (error: any) {
    console.error('[Google Auth] Token verification error:', error.message)
    
    // Provide more specific error messages
    if (error.message.includes('Token used too early')) {
      throw new Error('Token is not yet valid')
    }
    if (error.message.includes('Token used too late')) {
      throw new Error('Token has expired')
    }
    if (error.message.includes('Invalid token signature')) {
      throw new Error('Invalid token signature')
    }
    
    throw new Error(`Google token verification failed: ${error.message}`)
  }
}

/**
 * Get Google OAuth client for frontend configuration
 * Returns the client ID that frontend needs
 */
export function getGoogleClientId(): string {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is not set')
  }
  return process.env.GOOGLE_CLIENT_ID
}

