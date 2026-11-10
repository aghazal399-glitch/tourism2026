import 'dotenv/config'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { AzureOpenAI } from 'openai'

const app = express()
const port = Number(process.env.PORT) || 3001
const clientDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')
type ChatMessage = { role: 'user' | 'assistant'; content: string }

app.use(express.json({ limit: '80kb' }))

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    azureConfigured: Boolean(
      process.env.AZURE_OPENAI_ENDPOINT &&
      process.env.AZURE_OPENAI_API_KEY &&
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    ),
  })
})

app.post('/api/chat', async (request, response) => {
  const incomingMessages: unknown = request.body?.messages
  if (!Array.isArray(incomingMessages) || incomingMessages.length === 0 || incomingMessages.length > 16) {
    response.status(400).json({ error: 'Please send a conversation with up to 16 messages.' })
    return
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
    return { role: item.role as ChatMessage['role'], content: item.content.trim() }
  })

  if (messages.some((message) => message === null)) {
    response.status(400).json({ error: 'Messages must have a valid role and non-empty text.' })
    return
  }
  const validMessages = messages.filter((message): message is ChatMessage => message !== null)
  if (validMessages.at(-1)?.role !== 'user') {
    response.status(400).json({ error: 'Messages must have a valid role and non-empty text.' })
    return
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21'

  if (!endpoint || !apiKey || !deployment) {
    response.status(503).json({
      error: 'Azure OpenAI is not configured yet. Add the endpoint, API key, and deployment name to your server .env file, then restart the server.',
    })
    return
  }

  try {
    const client = new AzureOpenAI({ endpoint, apiKey, apiVersion })
    const completion = await client.chat.completions.create({
      model: deployment,
      messages: [
        {
          role: 'system',
          content: [
            'You are Wayfarer, a thoughtful, practical travel-planning companion.',
            'Help people plan trips around their interests, dates, budget, pace, accessibility needs, and travel style.',
            'Ask one or two focused questions when essential details are missing; otherwise give a useful, organized first answer.',
            'Offer realistic options, clear tradeoffs, local food and culture, and lower-impact choices where relevant.',
            'Do not claim to make bookings or to have checked live prices, opening hours, transport schedules, visa rules, or safety conditions.',
            'Flag information that can change and recommend checking official local sources before travel.',
            'Be welcoming and inclusive. Keep answers warm, specific, and easy to scan.',
          ].join(' '),
        },
        ...validMessages,
      ],
      max_tokens: 900,
      temperature: 0.7,
    })

    const reply = completion.choices[0]?.message?.content?.trim()
    if (!reply) {
      response.status(502).json({ error: 'The travel guide did not return a reply. Please try again.' })
      return
    }
    response.json({ reply })
  } catch (error) {
    const status = (error as { status?: number }).status
    if (status === 401 || status === 403) {
      response.status(502).json({ error: 'Azure rejected the credentials. Check the API key and resource endpoint in your server .env file.' })
    } else if (status === 404) {
      response.status(502).json({ error: 'The Azure deployment was not found. Check AZURE_OPENAI_DEPLOYMENT_NAME.' })
    } else if (status === 429) {
      response.status(503).json({ error: 'The travel guide is busy right now. Please try again in a moment.' })
    } else {
      console.error('Azure OpenAI request failed:', error instanceof Error ? error.message : 'Unknown error')
      response.status(502).json({ error: 'The travel guide could not respond just now. Please try again.' })
    }
  }
})

if (existsSync(clientDirectory)) {
  app.use(express.static(clientDirectory))
  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api/')) {
      next()
      return
    }
    response.sendFile(resolve(clientDirectory, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`Wayfarer API listening on http://localhost:${port}`)
})
