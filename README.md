# Wayfarer Tourism Bot

A travel-planning chat app powered by an Azure OpenAI deployment. The browser talks to a local Express API; Azure credentials are read only by the server and are never exposed to Vite.

## Setup

1. Install Node.js 20 or later.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` if needed, then set the Azure values:
   - `AZURE_OPENAI_ENDPOINT`: your Azure OpenAI resource endpoint.
   - `AZURE_OPENAI_API_KEY`: a key for that resource.
   - `AZURE_OPENAI_API_VERSION`: an API version supported by your resource (the example uses `2024-10-21`).
   - `AZURE_OPENAI_DEPLOYMENT_NAME`: your deployed model's deployment name.
4. Start the app with `npm run dev` and open the URL Vite prints (usually `http://localhost:5173`).

The chat UI runs without Azure configuration, but sending a message requires valid endpoint settings. Keep `.env` private; never add Azure keys to client-side variables such as `VITE_*`.

## Deploy to Vercel

Import the GitHub repository into Vercel. The included `vercel.json` builds the Vite client and deploys `api/chat.ts` and `api/health.ts` as serverless functions. Add `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_VERSION`, and `AZURE_OPENAI_DEPLOYMENT_NAME` under the Vercel project's server environment variables, then redeploy. Verify the API with `/api/health`.

## Production

Run `npm run build`, then `npm start`. The API listens on port `3001` by default; set `PORT` to change it. The production server also serves the built client from `dist`.

Run `npm test` for validation and serverless handler tests.
