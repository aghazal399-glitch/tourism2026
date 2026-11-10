import 'dotenv/config'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createChatReply } from './chat.js'

const app = express()
const port = Number(process.env.PORT) || 3001
const serverDirectory = dirname(fileURLToPath(import.meta.url))
const localClientDirectory = resolve(serverDirectory, '../dist')
const clientDirectory = existsSync(localClientDirectory)
  ? localClientDirectory
  : resolve(serverDirectory, '../../dist')

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
  const result = await createChatReply(request.body)
  response.status(result.status).json(result.body)
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
