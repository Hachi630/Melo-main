// API base URL - use VITE_API_URL if set (production), otherwise use relative path (development with vite proxy)
const BASE_API_URL = import.meta.env.VITE_API_URL || ''
const API_URL = `${BASE_API_URL}/api/calendar`

export interface CalendarItemVariants {
  tiktok?: string
  instagram_post?: string
  instagram_story?: string
  instagram_reels?: string
  facebook?: string
  twitter?: string
}

export interface CalendarItem {
  id: string
  userId: string
  campaignId: string | null
  campaignName?: string | null
  companyId?: string | null
  platform: string
  date: string // YYYY-MM-DD
  time: string | null // HH:mm
  title: string
  content: string
  imageUrl?: string | null
  variants?: CalendarItemVariants
  status: 'draft' | 'scheduled' | 'published'
  createdAt: string
  updatedAt: string
}

export interface CalendarItemsResponse {
  success: boolean
  items?: CalendarItem[]
  message?: string
}

export interface CalendarItemResponse {
  success: boolean
  item?: CalendarItem
  message?: string
}

export interface BatchCreateResponse {
  success: boolean
  items?: CalendarItem[]
  count?: number
  message?: string
}

export const calendarService = {
  /**
   * Get calendar items for a date range
   */
  async getCalendarItems(
    startDate: string,
    endDate: string
  ): Promise<CalendarItemsResponse> {
    const token = localStorage.getItem('token')
    if (!token) {
      return { success: false, message: 'Not authenticated' }
    }

    try {
      const response = await fetch(
        `${API_URL}?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to get calendar items' }
      }

      return data
    } catch (error) {
      return { success: false, message: 'Network error' }
    }
  },

  /**
   * Get a single calendar item by ID
   */
  async getCalendarItem(id: string): Promise<CalendarItemResponse> {
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
        return { success: false, message: data.message || 'Failed to get calendar item' }
      }

      return data
    } catch (error) {
      return { success: false, message: 'Network error' }
    }
  },

  /**
   * Create a new calendar item
   */
  async createCalendarItem(
    item: Omit<CalendarItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<CalendarItemResponse> {
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
        body: JSON.stringify(item),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to create calendar item' }
      }

      return data
    } catch (error) {
      return { success: false, message: 'Network error' }
    }
  },

  /**
   * Update a calendar item
   */
  async updateCalendarItem(
    id: string,
    item: Partial<Omit<CalendarItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<CalendarItemResponse> {
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
        body: JSON.stringify(item),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to update calendar item' }
      }

      return data
    } catch (error) {
      return { success: false, message: 'Network error' }
    }
  },

  /**
   * Delete a calendar item
   */
  async deleteCalendarItem(id: string): Promise<{ success: boolean; message?: string }> {
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
        return { success: false, message: data.message || 'Failed to delete calendar item' }
      }

      return data
    } catch (error) {
      return { success: false, message: 'Network error' }
    }
  },

  /**
   * Batch create calendar items
   */
  async createCalendarItemsBatch(
    items: Omit<CalendarItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<BatchCreateResponse> {
    const token = localStorage.getItem('token')
    if (!token) {
      return { success: false, message: 'Not authenticated' }
    }

    try {
      const response = await fetch(`${API_URL}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to create calendar items' }
      }

      return data
    } catch (error) {
      return { success: false, message: 'Network error' }
    }
  },

  /**
   * Share a calendar item to a platform
   */
  async shareCalendarItem(id: string, platform: string): Promise<{ success: boolean; message?: string }> {
    const token = localStorage.getItem('token')
    if (!token) {
      return { success: false, message: 'Not authenticated' }
    }

    try {
      const response = await fetch(`${API_URL}/${id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ platform }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to share calendar item' }
      }

      return data
    } catch (error) {
      return { success: false, message: 'Network error' }
    }
  },
}

