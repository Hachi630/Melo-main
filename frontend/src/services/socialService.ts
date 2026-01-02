// Use VITE_API_URL if set, otherwise use relative path (works with vite proxy)
const API_URL = import.meta.env.VITE_API_URL || '';

// Get Facebook connection status
export async function getFacebookStatus(token: string) {
  const res = await fetch(`${API_URL}/api/facebook/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!res.ok) {
    console.error("Failed to fetch Facebook status:", res.status, res.statusText);
    return {
      connected: false,
      debug: null,
      error: true,
    };
  }
  
  return res.json();
}

// Get Instagram connection status
export async function getInstagramStatus(token: string) {
  const res = await fetch(`${API_URL}/api/instagram/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!res.ok) {
    console.error("Failed to fetch Instagram status:", res.status, res.statusText);
    return {
      connected: false,
      error: true,
    };
  }
  
  return res.json();
}

// Generate Facebook OAuth URL (for Facebook sharing only)
export async function getFacebookAuthUrl(token: string): Promise<{ success: boolean; authUrl?: string; error?: string }> {
  const res = await fetch(`${API_URL}/api/facebook/auth`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!res.ok) {
    const error = await res.json();
    return {
      success: false,
      error: error.message || 'Failed to get Facebook auth URL',
    };
  }
  
  return res.json();
}

// Generate Instagram OAuth URL (requires Facebook Page, includes business_management)
export async function getInstagramAuthUrl(token: string): Promise<{ success: boolean; authUrl?: string; error?: string }> {
  const res = await fetch(`${API_URL}/api/instagram/auth`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!res.ok) {
    const error = await res.json();
    return {
      success: false,
      error: error.message || 'Failed to get Instagram auth URL',
    };
  }
  
  return res.json();
}

// Disconnect Facebook account
export async function disconnectFacebook(token: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/api/facebook/disconnect`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!res.ok) {
    const error = await res.json();
    return {
      success: false,
      error: error.message || 'Failed to disconnect Facebook account',
    };
  }
  
  return res.json();
}

// Disconnect Instagram account
export async function disconnectInstagram(token: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/api/instagram/disconnect`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!res.ok) {
    const error = await res.json();
    return {
      success: false,
      error: error.message || 'Failed to disconnect Instagram account',
    };
  }
  
  return res.json();
}

// Create a Facebook post (text, image, video, or link)
export async function createFacebookPost(
  token: string,
  text: string,
  postType: "text" | "image" | "video" | "link",
  imageFile?: File | null,
  videoFile?: File | null,
  linkUrl?: string,
  linkName?: string,
  linkDescription?: string
): Promise<{ success: boolean; message?: string; postId?: string; permalink?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('text', text);
    formData.append('postType', postType);
    
    if (postType === 'image' && imageFile) {
      formData.append('image', imageFile);
    }
    
    if (postType === 'video' && videoFile) {
      formData.append('video', videoFile);
    }
    
    if (postType === 'link') {
      if (linkUrl) formData.append('linkUrl', linkUrl);
      if (linkName) formData.append('linkName', linkName);
      if (linkDescription) formData.append('linkDescription', linkDescription);
    }

    const res = await fetch(`${API_URL}/api/facebook/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json();
      return {
        success: false,
        error: error.message || 'Failed to post to Facebook',
      };
    }

    return res.json();
  } catch (error: any) {
    console.error('Error creating Facebook post:', error);
    return {
      success: false,
      error: error.message || 'Failed to post to Facebook',
    };
  }
}

