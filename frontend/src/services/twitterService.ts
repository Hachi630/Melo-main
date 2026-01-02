// Use VITE_API_URL if set, otherwise use relative path (works with vite proxy)
const API_URL = import.meta.env.VITE_API_URL || '';

// Get Twitter connection status
export async function getTwitterStatus(token: string) {
  const res = await fetch(`${API_URL}/api/twitter/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!res.ok) {
    console.error("Failed to fetch Twitter status:", res.status, res.statusText);
    return {
      connected: false,
      profile: null,
      error: true,
    };
  }
  
  return res.json();
}

// Generate Twitter OAuth URL with userId
export function getTwitterAuthUrl(userId: string): string {
  return `${API_URL}/api/twitter/auth?userId=${encodeURIComponent(userId)}`;
}

// Disconnect Twitter account
export async function disconnectTwitter(token: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/api/twitter/disconnect`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  
  return res.json();
}

// Create a Twitter post (text and/or image)
export async function createTwitterPost(
  token: string,
  text: string,
  imageFile?: File | null
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('text', text);
    
    if (imageFile) {
      formData.append('image', imageFile);
    }

    const res = await fetch(`${API_URL}/api/twitter/posts`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type header - browser will set it with boundary for FormData
      },
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || `Failed to post tweet: ${res.statusText}`
      };
    }

    return data;
  } catch (error: any) {
    console.error('Error creating Twitter post:', error);
    return {
      success: false,
      error: error.message || 'Failed to post tweet. Please try again.'
    };
  }
}

