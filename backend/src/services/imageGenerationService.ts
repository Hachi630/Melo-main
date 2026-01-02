import { GoogleGenAI } from '@google/genai'

// Initialize Gemini client (automatically gets API key from GEMINI_API_KEY env var)
const ai = new GoogleGenAI({})

/**
 * Generate an image using Gemini API
 * @param prompt Text prompt for image generation
 * @returns Base64 encoded image data URL (data:mimeType;base64,data)
 */
export async function generateImage(prompt: string): Promise<string> {
  try {
    // Use a model that supports image generation
    // Using gemini-3-pro-image-preview
    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview'

    console.log('Generating image with prompt:', prompt)
    console.log('Using model:', model)

    // Call Gemini API with image generation request
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      // Request image response using responseModalities (plural)
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    } as any)

    // Extract image from response
    const responseAny = response as any

    // Log full response for debugging
    console.log('API Response structure:', JSON.stringify(responseAny, null, 2))

    // Check different possible response structures
    let imageData: string | null = null
    let mimeType = 'image/png'

    // Method 1: Try response.candidates[0].content.parts[].inlineData
    if (
      responseAny.candidates &&
      Array.isArray(responseAny.candidates) &&
      responseAny.candidates.length > 0
    ) {
      const candidate = responseAny.candidates[0]
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            imageData = part.inlineData.data
            mimeType = part.inlineData.mimeType || 'image/png'
            console.log('Found image in candidates[0].content.parts')
            break
          }
        }
      }
    }

    // Method 2: Try response.parts[].inlineData
    if (!imageData && responseAny.parts && Array.isArray(responseAny.parts)) {
      for (const part of responseAny.parts) {
        if (part.inlineData && part.inlineData.data) {
          imageData = part.inlineData.data
          mimeType = part.inlineData.mimeType || 'image/png'
          console.log('Found image in response.parts')
          break
        }
      }
    }

    // Method 3: Try response.text (if API returns base64 as text)
    if (!imageData && responseAny.text) {
      // Check if text is base64 encoded image
      const text = responseAny.text.trim()
      if (text.startsWith('data:image/') || /^[A-Za-z0-9+/=]+$/.test(text)) {
        // If it's a data URL, extract base64 part
        if (text.startsWith('data:image/')) {
          const parts = text.split(',')
          if (parts.length === 2) {
            imageData = parts[1]
            const mimeMatch = parts[0].match(/data:([^;]+)/)
            mimeType = mimeMatch ? mimeMatch[1] : 'image/png'
            console.log('Found image in response.text (data URL)')
          }
        } else {
          // Assume it's base64 without data URL prefix
          imageData = text
          console.log('Found image in response.text (base64)')
        }
      }
    }

    if (!imageData) {
      // If no image found, log the response structure for debugging
      console.error('No image data found in response. Full response:', JSON.stringify(responseAny, null, 2))
      throw new Error('Image generation failed: No image data in API response. Please check the console for the full response structure.')
    }

    // Return as data URL
    return `data:${mimeType};base64,${imageData}`
  } catch (error: any) {
    console.error('Image generation error:', error)
    throw new Error(`Image generation failed: ${error.message || 'Unknown error'}`)
  }
}

