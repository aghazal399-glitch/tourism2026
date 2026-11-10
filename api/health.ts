import type { IncomingMessage, ServerResponse } from 'node:http'

export default function handler(_request: IncomingMessage, response: ServerResponse) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify({
    status: 'ok',
    azureConfigured: Boolean(
      process.env.AZURE_OPENAI_ENDPOINT &&
      process.env.AZURE_OPENAI_API_KEY &&
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    ),
  }))
}