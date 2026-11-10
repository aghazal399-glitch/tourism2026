import { AzureOpenAI } from 'openai'

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type ChatResult = { status: number; body: { reply?: string; error?: string } }

const systemPrompt = [
  'You are Wayfarer, a thoughtful, practical travel-planning companion.',
  'Help people plan trips around their interests, dates, budget, pace, accessibility needs, and travel style.',
  'Ask one or two focused questions when essential details are missing; otherwise give a useful, organized first answer.',
  'Offer realistic options, clear tradeoffs, local food and culture, and lower-impact choices where relevant.',
  'Do not claim to make bookings or to have checked live prices, opening hours, transport schedules, visa rules, or safety conditions.',
  'Flag information that can change and recommend checking official local sources before travel.',
  'Be welcoming and inclusive. Keep answers warm, specific, and easy to scan.',
].join(' ')

export async function createChatReply(input: unknown): Promise<ChatResult> {
  const incomingMessages = (input as { messages?: unknown } | null)?.messages
  if (!Array.isArray(incomingMessages) || incomingMessages.length === 0 || incomingMessages.length > 16) {
    return { status: 400, body: { error: 'Please send a conversation with up to 16 messages.' } }
  }

  const messages: (ChatMessage | null)[] = incomingMessages.map((message: unknown) => {
    if (!message || typeof message !== 'object') return null
    const item = message as { role?: unknown; content?: unknown }
    if (
      (item.role !== 'user' && item.role !== 'assistant') ||
      typeof item.content !== 'string' ||
      item.content.trim().length === 0 ||
      item.content.length > 4000
    ) return null
    return { role: item.role, content: item.content.trim() }
  })

  if (messages.some((message) => message === null)) {
    return { status: 400, body: { error: 'Messages must have a valid role and non-empty text.' } }
  }
  const validMessages = messages.filter((message): message is ChatMessage => message !== null)
  if (validMessages.at(-1)?.role !== 'user') {
    return { status: 400, body: { error: 'Messages must have a valid role and non-empty text.' } }
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21'

  if (!endpoint || !apiKey || !deployment) {
    return {
      status: 503,
      body: { error: 'Azure OpenAI is not configured. Add the endpoint, API key, and deployment name to your Vercel project environment variables.' },
    }
  }

  try {
    const client = new AzureOpenAI({ endpoint, apiKey, apiVersion })
    const completion = await client.chat.completions.create({
      model: deployment,
      messages: [{ role: 'system', content: systemPrompt }, ...validMessages],
      max_tokens: 900,
      temperature: 0.7,
    })
    const reply = completion.choices[0]?.message?.content?.trim()
    if (!reply) return { status: 502, body: { error: 'The travel guide did not return a reply. Please try again.' } }
    return { status: 200, body: { reply } }
  } catch (error) {
    const status = (error as { status?: number }).status
    if (status === 401 || status === 403) {
      return { status: 502, body: { error: 'Azure rejected the credentials. Check the API key and resource endpoint.' } }
    }
    if (status === 404) {
      return { status: 502, body: { error: 'The Azure deployment was not found. Check AZURE_OPENAI_DEPLOYMENT_NAME.' } }
    }
    if (status === 429) {
      return { status: 503, body: { error: 'The travel guide is busy right now. Please try again in a moment.' } }
    }
    console.error('Azure OpenAI request failed:', error instanceof Error ? error.message : 'Unknown error')
    return { status: 502, body: { error: 'The travel guide could not respond just now. Please try again.' } }
  }
}