import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const UPLOADS_DIR = path.join(__dirname, '../../uploads')

export interface ImageData {
  base64: string
  mimeType: string
  success: boolean
  error?: string
}

/**
 * Read image file and convert to base64
 */
export function readImageAsBase64(imagePath: string): ImageData {
  try {
    // Remove leading /uploads/ if present
    const relativePath = imagePath.replace(/^\/uploads\//, '')
    const fullPath = path.join(UPLOADS_DIR, relativePath)

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return {
        base64: '',
        mimeType: '',
        success: false,
        error: 'Image file not found',
      }
    }

    // Read file buffer
    const fileBuffer = fs.readFileSync(fullPath)

    // Determine MIME type from file extension
    const ext = path.extname(fullPath).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }
    const mimeType = mimeTypes[ext] || 'image/jpeg'

    // Convert to base64
    const base64 = fileBuffer.toString('base64')

    return {
      base64,
      mimeType,
      success: true,
    }
  } catch (error: any) {
    console.error('Error reading image:', error)
    return {
      base64: '',
      mimeType: '',
      success: false,
      error: error.message || 'Failed to read image file',
    }
  }
}

