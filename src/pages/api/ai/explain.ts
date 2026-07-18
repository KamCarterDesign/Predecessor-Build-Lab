import type { NextApiRequest, NextApiResponse } from 'next'
import { getAIProviderAdapter, AIProviderConfig } from '@/lib/ai/adapter'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    isPremium,
    provider,
    apiKey,
    modelName,
    question,
    hero,
    level,
    build,
    computed_stats,
    build_dna,
  } = req.body

  // Premium Gate
  if (!isPremium) {
    return res.status(403).json({ error: 'Premium subscription required to access AI features.' })
  }

  if (!question) {
    return res.status(400).json({ error: 'Missing parameter: question' })
  }

  try {
    const aiConfig: AIProviderConfig = {
      provider: provider || 'gemini',
      apiKey,
      modelName,
    }

    const adapter = getAIProviderAdapter(aiConfig)

    const prompt = `
You are an expert tactical gaming coach for the MOBA game Predecessor.
Answer the following strategic question regarding the build details:
Question: "${question}"

CONTEXT:
Hero: ${JSON.stringify(hero)}
Level: ${level}
Build: ${JSON.stringify(build)}
Computed Stats: ${JSON.stringify(computed_stats)}
Build DNA: ${JSON.stringify(build_dna)}

Provide a direct, analytical, and highly strategic answer.
`.trim()

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')

    await adapter.generateTextStream(prompt, (chunk) => {
      res.write(chunk)
    })

    res.end()
  } catch (error: any) {
    console.error('AI Explain Error:', error)
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || String(error) })
    }
    res.end()
  }
}
