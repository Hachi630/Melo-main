import { GoogleGenAI } from '@google/genai'

// Initialize Gemini client with API key from environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[] // Image URLs
  files?: Array<{ url: string; name: string; type: string }> // File info
}

export interface UserContext {
  brandName?: string
  industry?: string
  toneOfVoice?: string
  knowledgeProducts?: string[]
  targetAudience?: string[]
}

export interface ChatRequest {
  messages: ChatMessage[]
  userContext?: UserContext
}

export const geminiService = {
  /**
   * Generate content using Gemini API
   * @param request Chat request with messages, images, and files
   * @param imageData Array of base64 image data with mimeType (optional, for current message)
   * @param fileTexts Array of extracted file texts (optional, for current message)
   */
  async generateContent(
    request: ChatRequest,
    imageData?: Array<{ base64: string; mimeType: string }>,
    fileTexts?: Array<{ name: string; text: string }>
  ): Promise<string> {
    try {
      const model = process.env.GEMINI_MODEL || 'gemini-3-pro-preview'

      // Build system prompt from user context
      const systemPrompt = this.buildSystemPrompt(request.userContext)

      // Prepare messages for Gemini API
      // Gemini API expects contents array with role and parts
      const contents = []

      // Add system message if we have context
      if (systemPrompt && systemPrompt !== 'You are a helpful AI assistant.') {
        contents.push({
          role: 'user',
          parts: [{ text: systemPrompt }],
        })
        contents.push({
          role: 'model',
          parts: [{ text: 'I understand. I will act as an AI assistant with the specified brand context.' }],
        })
      }

      // Add conversation history (all messages except the last one)
      const historyMessages = request.messages.slice(0, -1)
      for (const msg of historyMessages) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          const parts: any[] = []

          // Add text content if present
          if (msg.content && msg.content.trim()) {
            parts.push({ text: msg.content })
          }

          if (parts.length > 0) {
            contents.push({
              role: msg.role === 'user' ? 'user' : 'model',
              parts,
            })
          }
        }
      }

      // Add current message (last message) with images and files
      const lastMessage = request.messages[request.messages.length - 1]
      if (lastMessage && lastMessage.role === 'user') {
        const currentParts: any[] = []

        // Add text content
        if (lastMessage.content && lastMessage.content.trim()) {
          currentParts.push({ text: lastMessage.content })
        }

        // Add images as inlineData
        if (imageData && imageData.length > 0) {
          for (const img of imageData) {
            currentParts.push({
              inlineData: {
                mimeType: img.mimeType,
                data: img.base64,
              },
            })
          }
        }

        // Add file texts
        if (fileTexts && fileTexts.length > 0) {
          for (const file of fileTexts) {
            if (file.text && file.text.trim()) {
              currentParts.push({
                text: `\n\n[Content from file: ${file.name}]\n${file.text}`,
              })
            }
          }
        }

        // Add current message with multimodal content
        // Even if there's no text, we should add the message if there are images or files
        if (currentParts.length > 0) {
          contents.push({
            role: 'user',
            parts: currentParts,
          })
        } else if (lastMessage.content && lastMessage.content.trim()) {
          // Fallback: if no images/files but has text, add text only
          contents.push({
            role: 'user',
            parts: [{ text: lastMessage.content }],
          })
        }
      }

      // Call Gemini API
      const response = await ai.models.generateContent({
        model,
        contents,
      })

      // Extract response text
      // According to Gemini API docs, response.text is available
      const responseText = response.text || 'No response generated'

      return responseText
    } catch (error: any) {
      console.error('Gemini API error:', error)
      throw new Error(`Gemini API error: ${error.message || 'Unknown error'}`)
    }
  },

  /**
   * Build system prompt based on user's Brand Profile
   */
  buildSystemPrompt(context?: UserContext): string {
    if (!context) {
      return 'You are a helpful AI assistant.'
    }

    let prompt = 'You are an AI assistant'

    if (context.brandName) {
      prompt += ` for ${context.brandName}`
    } else {
      prompt += ' for a brand'
    }

    if (context.industry) {
      prompt += ` in the ${context.industry} industry`
    }

    prompt += '.'

    if (context.toneOfVoice) {
      const toneDescriptions: Record<string, string> = {
        calm: 'calm, peaceful, and soothing',
        warm: 'warm, friendly, and approachable',
        mindful: 'mindful, thoughtful, and reflective',
      }
      const toneDesc = toneDescriptions[context.toneOfVoice] || context.toneOfVoice
      prompt += ` Your tone of voice should be ${toneDesc}.`
    }

    if (context.knowledgeProducts && context.knowledgeProducts.length > 0) {
      prompt += `\n\nYou have knowledge about these products: ${context.knowledgeProducts.join(', ')}.`
    }

    if (context.targetAudience && context.targetAudience.length > 0) {
      prompt += `\n\nYour target audience includes: ${context.targetAudience.join(', ')}.`
    }

    prompt += '\n\nPlease respond in a helpful and professional manner that aligns with the brand identity.'

    return prompt
  },
}

