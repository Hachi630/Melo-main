// Use VITE_API_URL if set, otherwise use relative path (works with vite proxy)
const API_URL = import.meta.env.VITE_API_URL || '';

// Bug 3 Fix: Check response status before parsing JSON
export async function getLinkedInMetrics(token: string) {
  const res = await fetch(`${API_URL}/linkedin/metrics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!res.ok) {
    console.error("Failed to fetch LinkedIn metrics:", res.status, res.statusText);
    return {
      followers: { available: false },
      connections: { available: false },
      profileViews: { available: false },
      error: true,
    };
  }
  
  return res.json();
}

// Bug 1 Fix: Function to generate auth URL with userId
export function getLinkedInAuthUrl(userId: string): string {
  return `${API_URL}/linkedin/auth?userId=${encodeURIComponent(userId)}`;
}

// Disconnect LinkedIn account
export async function disconnectLinkedIn(token: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/disconnect`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  
  return res.json();
}

// ============================================
// Organization / Company Page Services
// ============================================

export interface Organization {
  id: string;
  urn: string;
  name: string;
  vanityName?: string;
  logoUrl?: string;
}

// Get administered organizations (company pages)
export async function getAdministeredOrganizations(token: string): Promise<{ success: boolean; organizations: Organization[]; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/organizations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  return res.json();
}

// ============================================
// Share on LinkedIn API - Frontend Services
// ============================================

// Create a text post on LinkedIn (supports personal and organization)
export async function createLinkedInPost(
  token: string, 
  text: string, 
  organizationId?: string
): Promise<{ success: boolean; postId?: string; message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/posts`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text, organizationId }),
  });
  
  return res.json();
}

// Initialize image upload to get upload URL and image URN
export async function initializeImageUpload(
  token: string, 
  organizationId?: string
): Promise<{ success: boolean; uploadUrl?: string; imageUrn?: string; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/images/initialize`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ organizationId }),
  });
  
  return res.json();
}

// Upload image binary (as base64) to LinkedIn
export async function uploadImageToLinkedIn(token: string, uploadUrl: string, imageData: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/images/upload`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ uploadUrl, imageData }),
  });
  
  return res.json();
}

// Create post with image (supports personal and organization)
export async function createLinkedInPostWithImage(
  token: string, 
  text: string, 
  imageUrn: string,
  organizationId?: string
): Promise<{ success: boolean; postId?: string; message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/posts/with-image`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text, imageUrn, organizationId }),
  });
  
  return res.json();
}

// Delete a LinkedIn post
export async function deleteLinkedInPostService(token: string, postUrn: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/posts/${encodeURIComponent(postUrn)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  
  return res.json();
}

// Helper: Convert file to base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

// ============================================
// LinkedIn Events API - Frontend Services
// ============================================

export interface LinkedInEvent {
  id: string;
  urn: string;
  name: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  eventUrl?: string;
  organizerName?: string;
  organizerUrn?: string;
  eventType?: string;
  format?: string;
  locale?: string;
  logoUrl?: string;
}

// Get my events (viewer's events)
export async function getMyLinkedInEvents(token: string): Promise<{ success: boolean; events: LinkedInEvent[]; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  return res.json();
}

// Get organization events
export async function getOrganizationLinkedInEvents(token: string, organizationId: string): Promise<{ success: boolean; events: LinkedInEvent[]; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/events/organization/${organizationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  return res.json();
}

// Get a single event by ID
export async function getLinkedInEventById(token: string, eventId: string): Promise<{ success: boolean; event: LinkedInEvent | null; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/events/${eventId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  return res.json();
}

// Create a new event
export async function createLinkedInEvent(
  token: string,
  eventData: {
    organizationId: string;
    name: string;
    description?: string;
    startAt: number;
    endAt?: number;
    eventUrl?: string;
    eventType?: "ONLINE" | "IN_PERSON";
    locale?: string;
  }
): Promise<{ success: boolean; eventId?: string; message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/events`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(eventData),
  });
  
  return res.json();
}

// Update an event
export async function updateLinkedInEvent(
  token: string,
  eventId: string,
  updates: {
    name?: string;
    description?: string;
    startAt?: number;
    endAt?: number;
    eventUrl?: string;
    eventType?: "ONLINE" | "IN_PERSON";
    locale?: string;
  }
): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/events/${eventId}`, {
    method: "PATCH",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(updates),
  });
  
  return res.json();
}

// Delete an event
export async function deleteLinkedInEventService(token: string, eventId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  
  return res.json();
}

// ============================================
// LinkedIn Comments API - Frontend Services
// ============================================

export interface LinkedInComment {
  id: string;
  urn: string;
  text: string;
  authorUrn: string;
  authorName?: string;
  createdAt?: string;
  parentUrn?: string;
}

// Get comments on a post
export async function getPostComments(token: string, postUrn: string): Promise<{ success: boolean; comments: LinkedInComment[]; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/posts/${encodeURIComponent(postUrn)}/comments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  return res.json();
}

// Create a comment on a post
export async function createComment(
  token: string, 
  postUrn: string, 
  text: string,
  organizationId?: string
): Promise<{ success: boolean; commentUrn?: string; message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/posts/${encodeURIComponent(postUrn)}/comments`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text, organizationId }),
  });
  
  return res.json();
}

// Edit a comment
export async function editComment(
  token: string,
  postUrn: string,
  commentUrn: string,
  text: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/posts/${encodeURIComponent(postUrn)}/comments/${encodeURIComponent(commentUrn)}`, {
    method: "PATCH",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text }),
  });
  
  return res.json();
}

// Delete a comment
export async function deleteCommentService(
  token: string,
  postUrn: string,
  commentUrn: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/posts/${encodeURIComponent(postUrn)}/comments/${encodeURIComponent(commentUrn)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  
  return res.json();
}

// ============================================
// LinkedIn Reactions API - Frontend Services
// ============================================

export type ReactionType = "LIKE" | "CELEBRATE" | "SUPPORT" | "LOVE" | "INSIGHTFUL" | "CURIOUS";

export interface LinkedInReaction {
  reactionType: ReactionType;
  actorUrn: string;
  createdAt?: string;
}

// Get reactions on a post
export async function getPostReactions(token: string, postUrn: string): Promise<{ success: boolean; reactions: LinkedInReaction[]; totalCount?: number; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/posts/${encodeURIComponent(postUrn)}/reactions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  return res.json();
}

// Add a reaction to a post
export async function addReaction(
  token: string, 
  postUrn: string, 
  reactionType: ReactionType = "LIKE",
  organizationId?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/posts/${encodeURIComponent(postUrn)}/reactions`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ reactionType, organizationId }),
  });
  
  return res.json();
}

// Remove a reaction from a post
export async function removeReaction(
  token: string,
  postUrn: string,
  organizationId?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const url = organizationId 
    ? `${API_URL}/linkedin/posts/${encodeURIComponent(postUrn)}/reactions?organizationId=${organizationId}`
    : `${API_URL}/linkedin/posts/${encodeURIComponent(postUrn)}/reactions`;
    
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  
  return res.json();
}

// ============================================
// LinkedIn Video & Link Post API - Frontend Services
// ============================================

// Initialize video upload
export async function initializeVideoUpload(
  token: string, 
  fileSizeBytes: number,
  organizationId?: string
): Promise<{ success: boolean; uploadUrl?: string; videoUrn?: string; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/videos/initialize`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fileSizeBytes, organizationId }),
  });
  
  return res.json();
}

// Upload video binary (as base64)
export async function uploadVideoToLinkedIn(token: string, uploadUrl: string, videoData: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/videos/upload`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ uploadUrl, videoData }),
  });
  
  return res.json();
}

// Create post with video
export async function createLinkedInPostWithVideo(
  token: string, 
  text: string, 
  videoUrn: string,
  organizationId?: string
): Promise<{ success: boolean; postId?: string; message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/posts/with-video`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text, videoUrn, organizationId }),
  });
  
  return res.json();
}

// Create post with link/article
export async function createLinkedInPostWithLink(
  token: string, 
  text: string, 
  linkUrl: string,
  linkTitle?: string,
  linkDescription?: string,
  organizationId?: string
): Promise<{ success: boolean; postId?: string; message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/linkedin/posts/with-link`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text, linkUrl, linkTitle, linkDescription, organizationId }),
  });
  
  return res.json();
}

// Helper: Convert video file to base64
export function videoFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:video/mp4;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

// Keep for backwards compatibility, but this should not be used directly
export const linkedinAuthUrl = `${API_URL}/linkedin/auth`;
