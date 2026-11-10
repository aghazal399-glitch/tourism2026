import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import type { IncomingMessage, ServerResponse } from 'node:http'
import chatHandler from '../api/chat.js'
import healthHandler from '../api/health.js'
import { createChatReply } from '../server/chat.js'

function createResponse() {
  const headers = new Map<string, string>()
  const response = {
    statusCode: 200,
    body: '',
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value)
    },
    end(value = '') {
      this.body = value
    },
  }
  return { response: response as unknown as ServerResponse, result: response, headers }
}

const azureKeys = [
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_API_KEY',
  'AZURE_OPENAI_DEPLOYMENT_NAME',
  'AZURE_OPENAI_API_VERSION',
] as const
const previousAzureValues = new Map(azureKeys.map((key) => [key, process.env[key]]))

afterEach(() => {
  for (const key of azureKeys) {
    const value = previousAzureValues.get(key)
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('chat API', () => {
  it('rejects malformed chat history with a JSON 400 response', async () => {
    const { response, result, headers } = createResponse()
    const request = { method: 'POST', body: { messages: [] } } as IncomingMessage & { body: unknown }

    await chatHandler(request, response)

    assert.equal(result.statusCode, 400)
    assert.match(headers.get('content-type') ?? '', /application\/json/)
    assert.equal(JSON.parse(result.body).error, 'Please send a conversation with up to 16 messages.')
  })

  it('returns a clear configuration response without calling Azure when credentials are absent', async () => {
    for (const key of azureKeys) delete process.env[key]
    const result = await createChatReply({ messages: [{ role: 'user', content: 'Plan a weekend in Rome' }] })

    assert.equal(result.status, 503)
    assert.match(result.body.error ?? '', /Vercel project environment variables/)
  })

  it('rejects unsupported HTTP methods', async () => {
    const { response, result, headers } = createResponse()
    const request = { method: 'GET' } as IncomingMessage

    await chatHandler(request as IncomingMessage & { body?: unknown }, response)

    assert.equal(result.statusCode, 405)
    assert.equal(headers.get('allow'), 'POST')
  })

  it('reports API health as JSON', () => {
    const { response, result, headers } = createResponse()

    healthHandler({} as IncomingMessage, response)

    assert.equal(result.statusCode, 200)
    assert.match(headers.get('content-type') ?? '', /application\/json/)
    assert.equal(JSON.parse(result.body).status, 'ok')
  })
})