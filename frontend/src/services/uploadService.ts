// API base URL - use VITE_API_URL if set (production), otherwise use relative path (development with vite proxy)
const BASE_API_URL = import.meta.env.VITE_API_URL || ''
const API_URL = `${BASE_API_URL}/api/upload`

export interface UploadImageResponse {
  success: boolean
  imageUrl?: string
  message?: string
}

export interface UploadFileResponse {
  success: boolean
  fileUrl?: string
  fileName?: string
  fileType?: string
  fileSize?: number
  message?: string
}

export const uploadService = {
  /**
   * Upload image file (multipart/form-data)
   */
  async uploadImage(file: File): Promise<UploadImageResponse> {
    const token = localStorage.getItem('token')
    if (!token) {
      return { success: false, message: 'Not authenticated' }
    }

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch(`${API_URL}/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to upload image' }
      }

      return data
    } catch (error) {
      return { success: false, message: 'Network error' }
    }
  },

  /**
   * Upload image as base64
   */
  async uploadImageBase64(imageData: string, mimeType?: string): Promise<UploadImageResponse> {
    const token = localStorage.getItem('token')
    if (!token) {
      return { success: false, message: 'Not authenticated' }
    }

    try {
      const response = await fetch(`${API_URL}/image-base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageData,
          mimeType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to upload image' }
      }

      return data
    } catch (error) {
      return { success: false, message: 'Network error' }
    }
  },

  /**
   * Upload file (multipart/form-data)
   */
  async uploadFile(file: File): Promise<UploadFileResponse> {
    const token = localStorage.getItem('token')
    if (!token) {
      return { success: false, message: 'Not authenticated' }
    }

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_URL}/file`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to upload file' }
      }

      return data
    } catch (error) {
      return { success: false, message: 'Network error' }
    }
  },

  /**
   * Convert file to base64
   */
  convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to convert file to base64'))
        }
      }
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      reader.readAsDataURL(file)
    })
  },
}

