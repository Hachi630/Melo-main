// API base URL - use VITE_API_URL if set (production), otherwise use relative path (development with vite proxy)
const BASE_API_URL = import.meta.env.VITE_API_URL || ''
const API_URL = `${BASE_API_URL}/api/campaigns`

export interface Campaign {
  id: string
  userId: string
  name: string
  description?: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  status: 'draft' | 'active' | 'completed'
  createdAt: string
  updatedAt: string
}

export interface CampaignsResponse {
  success: boolean
  campaigns?: Campaign[]
  message?: string
}

export interface CampaignResponse {
  success: boolean
  campaign?: Campaign
  message?: string
}

export const campaignService = {
  /**
   * Get all campaigns for the current user
   */
  async getCampaigns(): Promise<CampaignsResponse> {
    const token = localStorage.getItem('token')
    if (!token) {
      return { success: false, message: 'Not authenticated' }
    }

    try {
      const response = await fetch(`${API_URL}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to get campaigns' }
      }

      return data
    } catch (error) {
      return { success: false, message: 'Network error' }
    }
  },

  /**
   * Get a single campaign by ID
   */
  async getCampaign(id: string): Promise<CampaignResponse> {
    const token = localStorage.getItem('token')
    if (!token) {
      return { success: false, message: 'Not authenticated' }
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to get campaign' }
      }

      return data
    } catch (error) {
      return { success: false, message: 'Network error' }
    }
  },

  /**
   * Create a new campaign
   */
  async createCampaign(
    campaign: Omit<Campaign, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<CampaignResponse> {
    const token = localStorage.getItem('token')
    if (!token) {
      return { success: false, message: 'Not authenticated' }
    }

    try {
      const response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(campaign),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to create campaign' }
      }

      return data
    } catch (error) {
      return { success: false, message: 'Network error' }
    }
  },

  /**
   * Update a campaign
   */
  async updateCampaign(
    id: string,
    campaign: Partial<Omit<Campaign, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<CampaignResponse> {
    const token = localStorage.getItem('token')
    if (!token) {
      return { success: false, message: 'Not authenticated' }
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(campaign),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to update campaign' }
      }

      return data
    } catch (error) {
      return { success: false, message: 'Network error' }
    }
  },

  /**
   * Delete a campaign
   */
  async deleteCampaign(id: string): Promise<{ success: boolean; message?: string }> {
    const token = localStorage.getItem('token')
    if (!token) {
      return { success: false, message: 'Not authenticated' }
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to delete campaign' }
      }

      return data
    } catch (error) {
      return { success: false, message: 'Network error' }
    }
  },
}

