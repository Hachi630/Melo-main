import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Spin, message } from 'antd'

/**
 * Instagram OAuth Callback Page
 * 
 * This page handles the OAuth callback from Facebook/Instagram.
 * It receives the authorization code and state from Facebook,
 * sends them to the backend to exchange for tokens,
 * and then redirects the user appropriately.
 */
export default function InstagramCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [messageText, setMessageText] = useState('Processing Facebook/Instagram connection...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get OAuth parameters from URL
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')

        // Check for OAuth errors
        if (error) {
          console.error('OAuth error from Facebook:', error)
          setStatus('error')
          setMessageText(`Connection failed: ${error}`)
          message.error(`Facebook/Instagram connection failed: ${error}`)
          
          // Redirect to social dashboard after 3 seconds
          setTimeout(() => {
            navigate('/socialdashboard')
          }, 3000)
          return
        }

        // Validate required parameters
        if (!code || !state) {
          console.error('Missing OAuth parameters:', { code: !!code, state: !!state })
          setStatus('error')
          setMessageText('Missing authorization code or state. Please try connecting again.')
          message.error('Missing authorization code or state. Please try connecting again.')
          
          setTimeout(() => {
            navigate('/socialdashboard')
          }, 3000)
          return
        }

        console.log('Instagram OAuth Callback - Processing:', { code: code.substring(0, 20) + '...', state })

        // Get JWT token for authentication
        const jwt = localStorage.getItem('token')
        if (!jwt) {
          console.error('No JWT token found')
          setStatus('error')
          setMessageText('Please log in first')
          message.error('Please log in first')
          
          setTimeout(() => {
            navigate('/')
          }, 3000)
          return
        }

        // Call backend to process the OAuth callback
        // The backend will exchange the code for tokens and save them
        const API_URL = import.meta.env.VITE_API_URL || ''
        const response = await fetch(
          `${API_URL}/api/instagram/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${jwt}`,
            },
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
          console.error('Backend callback error:', errorData)
          
          // Skip showing error for "Invalid state" (common during OAuth flow, not a real error)
          // This can happen if:
          // 1. User refreshes the callback page
          // 2. OAuth callback is called multiple times
          // 3. State was already used and deleted
          // In these cases, the connection might already be successful, so we silently redirect
          if (errorData.message === 'Invalid state' || errorData.message?.includes('Invalid state')) {
            console.log('Invalid state detected - silently redirecting (connection may already be successful)')
            // Silently redirect to social dashboard without showing error
            setTimeout(() => {
              navigate('/socialdashboard')
            }, 500)
            return
          }
          
          setStatus('error')
          setMessageText(errorData.message || 'Failed to process connection')
          message.error(errorData.message || 'Failed to process Facebook/Instagram connection')
          
          setTimeout(() => {
            navigate('/socialdashboard')
          }, 3000)
          return
        }

        // Backend should return JSON with redirect URL or success message
        const data = await response.json()
        console.log('Instagram OAuth Callback - Success:', data)

        if (data.success) {
          setStatus('success')
          setMessageText(data.message || 'Successfully connected Facebook/Instagram!')
          message.success(data.message || 'Successfully connected Facebook/Instagram!')

          // Always redirect to social dashboard (like Twitter connection)
          // Backend provides redirectUrl which points to social dashboard with query params
          const redirectUrl = data.redirectUrl || '/socialdashboard?facebook=connected'
          setTimeout(() => {
            navigate(redirectUrl.replace(window.location.origin, '').replace(/^https?:\/\/[^/]+/, ''))
          }, 1500)
        } else {
          setStatus('error')
          setMessageText(data.message || 'Connection failed')
          message.error(data.message || 'Connection failed')
          
          setTimeout(() => {
            navigate('/socialdashboard')
          }, 3000)
        }
      } catch (error: any) {
        console.error('Instagram OAuth Callback - Exception:', error)
        setStatus('error')
        setMessageText(error.message || 'An unexpected error occurred')
        message.error(error.message || 'An unexpected error occurred')
        
        setTimeout(() => {
          navigate('/socialdashboard')
        }, 3000)
      }
    }

    handleCallback()
  }, [searchParams, navigate])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
      }}
    >
      <Spin size="large" spinning={status === 'processing'} />
      <div style={{ marginTop: '24px', fontSize: '16px', textAlign: 'center' }}>
        {status === 'processing' && (
          <>
            <p>{messageText}</p>
            <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
              Please wait...
            </p>
          </>
        )}
        {status === 'success' && (
          <>
            <p style={{ color: '#52c41a' }}>{messageText}</p>
            <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
              Redirecting...
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <p style={{ color: '#ff4d4f' }}>{messageText}</p>
            <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
              Redirecting to social dashboard...
            </p>
          </>
        )}
      </div>
    </div>
  )
}

