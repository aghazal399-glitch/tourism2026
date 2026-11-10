import type { IncomingMessage, ServerResponse } from 'node:http'
import { createChatReply } from '../server/chat.js'

type VercelRequest = IncomingMessage & { body?: unknown }

export default async function handler(request: VercelRequest, response: ServerResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.statusCode = 405
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }))
    return
  }

  const result = await createChatReply(request.body)
  response.statusCode = result.status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(result.body))
}