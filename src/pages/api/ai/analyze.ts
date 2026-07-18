import type { NextApiRequest, NextApiResponse } from 'next'
import { getAIProviderAdapter, AIProviderConfig } from '@/lib/ai/adapter'

export const config = {
  api: {
    bodyParser: true,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    isPremium,
    provider,
    apiKey,
    modelName,
    hero,
    level,
    build,
    computed_stats,
    build_dna,
    matchup,
    meta_context,
  } = req.body

  // 1. Premium Gate
  if (!isPremium) {
    return res.status(403).json({ error: 'Premium subscription required to access AI features.' })
  }

  try {
    const aiConfig: AIProviderConfig = {
      provider: provider || 'gemini',
      apiKey,
      modelName,
    }

    const adapter = getAIProviderAdapter(aiConfig)

    // Build comprehensive input context for AI
    const prompt = `
You are an expert, analytical gaming coach for the MOBA game Predecessor.
Provide a detailed build analysis. Be direct, objective, and critical. Do not soften criticisms.

CONTEXT:
Hero: ${JSON.stringify(hero)}
Level: ${level}
Build: ${JSON.stringify(build)}
Computed Stats: ${JSON.stringify(computed_stats)}
Build DNA: ${JSON.stringify(build_dna)}
Matchup: ${matchup ? JSON.stringify(matchup) : 'None'}
Meta Context Snapshot: ${meta_context ? JSON.stringify(meta_context) : 'None'}

Please format the response with the following sections exactly:
1. Build overview (2–3 sentences, direct assessment)
2. Strengths (specific, evidence-referenced from stats or effects)
3. Weaknesses (honest, direct, not softened)
4. Item critique (each item: keep/swap/why)
5. Alternative suggestions with reasoning
6. Meta comparison vs popular builds
`.trim()

    // Support streaming response format
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')

    await adapter.generateTextStream(prompt, (chunk) => {
      res.write(chunk)
    })

    res.end()
  } catch (error: any) {
    console.error('AI Analysis Error:', error)
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || String(error) })
    }
    res.end()
  }
}
