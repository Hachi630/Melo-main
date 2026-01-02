import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const UPLOADS_DIR = path.join(__dirname, '../../uploads/images')

/**
 * Ensure uploads directory exists
 */
function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  }
}

/**
 * Save base64 image to file system
 * @param base64Data Base64 encoded image data (without data URL prefix)
 * @param mimeType MIME type of the image (e.g., 'image/png', 'image/jpeg')
 * @returns URL path to the saved image (e.g., '/uploads/images/xxx.png')
 */
export async function saveImage(base64Data: string, mimeType: string): Promise<string> {
  ensureUploadsDir()

  // Determine file extension from MIME type
  const ext = mimeType === 'image/jpeg' || mimeType === 'image/jpg' ? 'jpg' : 'png'

  // Generate unique filename
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  const filename = `${timestamp}-${random}.${ext}`
  const filePath = path.join(UPLOADS_DIR, filename)

  // Convert base64 to buffer and save
  const buffer = Buffer.from(base64Data, 'base64')
  fs.writeFileSync(filePath, buffer)

  // Return URL path
  return `/uploads/images/${filename}`
}

