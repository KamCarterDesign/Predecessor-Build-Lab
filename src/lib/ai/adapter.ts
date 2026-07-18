import { GoogleGenAI } from '@google/genai'

export interface AIProviderConfig {
  provider: 'gemini' | 'openai' | 'claude'
  apiKey?: string
  modelName?: string
}

/**
 * Interface that unified adapters must implement.
 */
export interface AIProviderAdapter {
  generateTextStream(
    prompt: string,
    onChunk: (text: string) => void
  ): Promise<string>
}

/**
 * Gemini SDK-based provider.
 */
class GeminiAdapter implements AIProviderAdapter {
  private ai: GoogleGenAI
  private model: string

  constructor(apiKey: string, modelName?: string) {
    this.ai = new GoogleGenAI({ apiKey })
    this.model = modelName || 'gemini-2.5-flash'
  }

  async generateTextStream(prompt: string, onChunk: (text: string) => void): Promise<string> {
    const responseStream = await this.ai.models.generateContentStream({
      model: this.model,
      contents: prompt,
    })

    let fullText = ''
    for await (const chunk of responseStream) {
      const chunkText = chunk.text
      if (chunkText) {
        fullText += chunkText
        onChunk(chunkText)
      }
    }
    return fullText
  }
}

/**
 * Mock provider for OpenAI & Claude in client/testing environment.
 * In a real environment, these would execute API calls.
 */
class MockAdapter implements AIProviderAdapter {
  private providerName: string

  constructor(providerName: string) {
    this.providerName = providerName
  }

  async generateTextStream(prompt: string, onChunk: (text: string) => void): Promise<string> {
    const lines = [
      `[AI Analysis Streamed via ${this.providerName.toUpperCase()}]`,
      '1. **Build Overview**: This setup offers a strong late-game scaling option with high power values, though the lack of early items creates vulnerability.',
      '2. **Strengths**: High magical/physical damage output, solid ability haste.',
      '3. **Weaknesses**: Extremely squishy; effective HP falls below safety margins for teamfights.',
      '4. **Item choices**: Keep high-impact damage items, swap early defensive ones if you need to spike early.',
      '5. **Alternative suggestions**: Consider adding early flat penetration items.',
      '6. **Meta comparison**: Performs optimally in dive compositions, but falls short against hypercarries.'
    ]

    let fullText = ''
    for (const line of lines) {
      await new Promise(resolve => setTimeout(resolve, 300))
      const text = line + '\n\n'
      fullText += text
      onChunk(text)
    }
    return fullText
  }
}

/**
 * Factory to get the correct adapter.
 */
export function getAIProviderAdapter(config: AIProviderConfig): AIProviderAdapter {
  if (config.provider === 'gemini') {
    const key = config.apiKey || process.env.GEMINI_API_KEY || ''
    if (!key) {
      console.warn('Gemini API key missing. Falling back to MockAdapter.')
      return new MockAdapter('gemini')
    }
    return new GeminiAdapter(key, config.modelName)
  }
  return new MockAdapter(config.provider)
}
