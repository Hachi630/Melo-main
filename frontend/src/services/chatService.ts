// API base URL - use VITE_API_URL if set (production), otherwise use relative path (development with vite proxy)
const BASE_API_URL = import.meta.env.VITE_API_URL || ''
const API_URL = `${BASE_API_URL}/api/chat`

export interface ChatFile {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  files?: ChatFile[];
  timestamp?: Date | string;
}

export interface ChatResponse {
  success: boolean;
  response?: string;
  images?: string[];
  conversationId?: string;
  message?: string;
}

export interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  images?: string[];
  conversationId?: string;
  message?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListItem {
  id: string;
  title: string;
  folderId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFolder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const chatService = {
  /**
   * Send a message to the chat API
   */
  async sendMessage(
    message: string,
    conversationId?: string,
    images?: string[],
    files?: ChatFile[],
    editMessageIndex?: number
  ): Promise<ChatResponse> {
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    try {
      const response = await fetch(`${API_URL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          conversationId,
          images,
          files,
          editMessageIndex,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to send message",
        };
      }

      return data;
    } catch (error) {
      return { success: false, message: "Network error" };
    }
  },

  /**
   * Get all conversations and folders for the current user
   */
  async getConversations(): Promise<{
    success: boolean;
    conversations?: ConversationListItem[];
    folders?: ProjectFolder[];
    message?: string;
  }> {
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    try {
      const response = await fetch(`${API_URL}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to get conversations",
        };
      }

      return data;
    } catch (error) {
      return { success: false, message: "Network error" };
    }
  },

  /**
   * Get a single conversation by ID
   */
  async getConversation(
    id: string
  ): Promise<{
    success: boolean;
    conversation?: Conversation;
    message?: string;
  }> {
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to get conversation",
        };
      }

      return data;
    } catch (error) {
      return { success: false, message: "Network error" };
    }
  },

  /**
   * Delete a conversation
   */
  async deleteConversation(
    id: string
  ): Promise<{ success: boolean; message?: string }> {
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to delete conversation",
        };
      }

      return data;
    } catch (error) {
      return { success: false, message: "Network error" };
    }
  },

  /**
   * Generate an image
   */
  async generateImage(
    prompt: string,
    conversationId?: string
  ): Promise<ImageGenerationResponse> {
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    try {
      const response = await fetch(`${API_URL}/generate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt,
          conversationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to generate image",
        };
      }

      return data;
    } catch (error) {
      return { success: false, message: "Network error" };
    }
  },

  /**
   * Create a project folder
   */
  async createFolder(
    name: string
  ): Promise<{ success: boolean; folder?: ProjectFolder; message?: string }> {
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    try {
      const response = await fetch(`${API_URL}/folders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to create folder",
        };
      }

      return data;
    } catch (error) {
      return { success: false, message: "Network error" };
    }
  },

  /**
   * Update folder name
   */
  async updateFolderName(
    folderId: string,
    name: string
  ): Promise<{ success: boolean; folder?: ProjectFolder; message?: string }> {
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    try {
      const response = await fetch(`${API_URL}/folders/${folderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to update folder",
        };
      }

      return data;
    } catch (error) {
      return { success: false, message: "Network error" };
    }
  },

  /**
   * Delete a project folder
   */
  async deleteFolder(
    folderId: string
  ): Promise<{ success: boolean; message?: string }> {
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    try {
      const response = await fetch(`${API_URL}/folders/${folderId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to delete folder",
        };
      }

      return data;
    } catch (error) {
      return { success: false, message: "Network error" };
    }
  },

  /**
   * Update conversation title
   */
  async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<{
    success: boolean;
    conversation?: ConversationListItem;
    message?: string;
  }> {
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    try {
      const response = await fetch(`${API_URL}/${conversationId}/title`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to update conversation title",
        };
      }

      return data;
    } catch (error) {
      return { success: false, message: "Network error" };
    }
  },

  /**
   * Move conversation to folder
   */
  async moveConversationToFolder(
    conversationId: string,
    folderId: string | null
  ): Promise<{
    success: boolean;
    conversation?: ConversationListItem;
    message?: string;
  }> {
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    try {
      const response = await fetch(`${API_URL}/${conversationId}/folder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ folderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to move conversation",
        };
      }

      return data;
    } catch (error) {
      return { success: false, message: "Network error" };
    }
  },
};
