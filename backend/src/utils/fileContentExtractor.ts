import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { createRequire } from 'module'
import mammoth from 'mammoth'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

const UPLOADS_DIR = path.join(__dirname, '../../uploads')

export interface ExtractedContent {
  text: string
  success: boolean
  error?: string
}

/**
 * Extract text content from a file
 */
export async function extractTextFromFile(filePath: string, fileType: string): Promise<ExtractedContent> {
  try {
    const fullPath = path.join(UPLOADS_DIR, filePath.replace(/^\/uploads\//, ''))

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return {
        text: '',
        success: false,
        error: 'File not found',
      }
    }

    // Read file buffer
    const fileBuffer = fs.readFileSync(fullPath)

    // Extract text based on file type
    if (fileType === 'application/pdf') {
      // Extract text from PDF
      const data = await pdfParse(fileBuffer)
      return {
        text: data.text || '',
        success: true,
      }
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword'
    ) {
      // Extract text from Word document
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer })
        return {
          text: result.value || '',
          success: true,
        }
      } catch (error: any) {
        // If .docx extraction fails, try as .doc (not fully supported)
        return {
          text: '',
          success: false,
          error: `Word document extraction failed: ${error.message}`,
        }
      }
    } else if (fileType === 'text/plain' || fileType === 'text/csv') {
      // Read text file directly
      const text = fs.readFileSync(fullPath, 'utf-8')
      return {
        text: text || '',
        success: true,
      }
    } else {
      // Unsupported file type
      return {
        text: '',
        success: false,
        error: `File type ${fileType} is not supported for text extraction`,
      }
    }
  } catch (error: any) {
    console.error('Error extracting text from file:', error)
    return {
      text: '',
      success: false,
      error: error.message || 'Failed to extract text from file',
    }
  }
}

