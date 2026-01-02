import { GoogleGenAI } from '@google/genai'
import { UserContext } from './geminiService'

// Initialize Gemini client
const ai = new GoogleGenAI({})

export interface ContentPlanItem {
  date: string // YYYY-MM-DD
  platform: string
  title: string
  content: string
  time?: string // HH:mm
}

export interface GenerateContentPlanRequest {
  userContext?: UserContext
  goal: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  platforms: string[]
}

/**
 * Generate a structured content plan using Gemini API
 */
export async function generateContentPlan(
  request: GenerateContentPlanRequest
): Promise<ContentPlanItem[]> {
  try {
    const model = process.env.GEMINI_MODEL || 'gemini-3-pro-preview'

    // Build system prompt from user context
    let systemPrompt = 'You are an AI assistant'
    if (request.userContext) {
      if (request.userContext.brandName) {
        systemPrompt += ` for ${request.userContext.brandName}`
      } else {
        systemPrompt += ' for a brand'
      }

      if (request.userContext.industry) {
        systemPrompt += ` in the ${request.userContext.industry} industry`
      }

      systemPrompt += '.'

      if (request.userContext.toneOfVoice) {
        const toneDescriptions: Record<string, string> = {
          calm: 'calm, peaceful, and soothing',
          warm: 'warm, friendly, and approachable',
          mindful: 'mindful, thoughtful, and reflective',
        }
        const toneDesc =
          toneDescriptions[request.userContext.toneOfVoice] ||
          request.userContext.toneOfVoice
        systemPrompt += ` Your tone of voice should be ${toneDesc}.`
      }

      if (
        request.userContext.knowledgeProducts &&
        request.userContext.knowledgeProducts.length > 0
      ) {
        systemPrompt += `\n\nYou have knowledge about these products: ${request.userContext.knowledgeProducts.join(', ')}.`
      }

      if (
        request.userContext.targetAudience &&
        request.userContext.targetAudience.length > 0
      ) {
        systemPrompt += `\n\nYour target audience includes: ${request.userContext.targetAudience.join(', ')}.`
      }
    }

    // Build the content plan generation prompt
    const prompt = `${systemPrompt}

Generate a social media content plan from ${request.startDate} to ${request.endDate}.

Goal: ${request.goal}
Platforms: ${request.platforms.join(', ')}

Please generate a structured content plan in JSON format. Each item should include:
- date: "YYYY-MM-DD" (must be between ${request.startDate} and ${request.endDate})
- platform: one of ${request.platforms.map((p) => `"${p}"`).join(', ')}
- title: a short title for calendar display (max 50 characters)
- content: full content text for the post
- time: "HH:mm" (optional, suggested posting time)

Return ONLY a valid JSON object with this structure:
{
  "items": [
    {
      "date": "2025-11-27",
      "platform": "instagram_post",
      "title": "Lavender sale 15%",
      "content": "Full content text here...",
      "time": "14:00"
    }
  ]
}

Make sure to:
1. Distribute posts across all dates in the range
2. Use different platforms throughout the campaign
3. Create engaging, brand-appropriate content
4. Keep titles concise and descriptive
5. Return valid JSON only, no markdown formatting or code blocks`

    // Call Gemini API
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    })

    const responseText = response.text || ''

    // Parse JSON from response
    // Try to extract JSON from markdown code blocks if present
    let jsonText = responseText.trim()
    const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1]
    }

    // Try to find JSON object in the response
    const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonObjectMatch) {
      jsonText = jsonObjectMatch[0]
    }

    const parsed = JSON.parse(jsonText)
    const items: ContentPlanItem[] = parsed.items || []

    // Validate and filter items
    const validItems = items.filter((item: any) => {
      return (
        item.date &&
        item.platform &&
        item.title &&
        item.content &&
        request.platforms.includes(item.platform) &&
        item.date >= request.startDate &&
        item.date <= request.endDate
      )
    })

    if (validItems.length === 0) {
      throw new Error('No valid content plan items generated')
    }

    return validItems
  } catch (error: any) {
    console.error('Content plan generation error:', error)
    if (error.message?.includes('JSON')) {
      throw new Error(
        'Failed to parse content plan. Please try again or adjust your request.'
      )
    }
    throw new Error(
      `Content plan generation failed: ${error.message || 'Unknown error'}`
    )
  }
}

