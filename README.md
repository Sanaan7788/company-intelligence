# Company Intelligence Dashboard

An analyst-grade tool for job hunters to research target companies — AI-powered dossiers with recent news, tech problems, and opportunities sourced from Reddit, LinkedIn, HackerNews, blogs, and job postings.

## Features

- Add companies individually or in bulk
- AI research agent that searches the web and generates structured intelligence
- News feed filterable by source type (Reddit, LinkedIn, HackerNews, Blog, Articles)
- Problem statements with opportunity framing and difficulty ratings
- Pluggable LLM backends: DeepSeek V3, Anthropic Claude, OpenAI, Ollama
- Dark, dense analyst-workstation aesthetic

## Local Setup

### Prerequisites
- Node.js 20+
- Docker + Docker Compose (for PostgreSQL)
- API keys for your chosen LLM provider + web search provider

### Steps

1. Clone and install dependencies:
   ```bash
   git clone <repo-url>
   cd company-intelligence
   npm install
   ```

2. Copy environment file and fill in your keys:
   ```bash
   cp .env.example .env
   ```

3. Start PostgreSQL:
   ```bash
   docker-compose up db -d
   ```

4. Start the dev servers:
   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_PROVIDER` | Active LLM backend | `deepseek` |
| `DEEPSEEK_API_KEY` | DeepSeek API key | — |
| `DEEPSEEK_MODEL` | DeepSeek model ID | `deepseek-chat` |
| `ANTHROPIC_API_KEY` | Anthropic API key | — |
| `OPENAI_API_KEY` | OpenAI API key | — |
| `OPENAI_MODEL` | OpenAI model ID | `gpt-4o` |
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama model name | `llama3.1` |
| `WEB_SEARCH_PROVIDER` | Search backend for non-native providers | `tavily` |
| `TAVILY_API_KEY` | Tavily search API key | — |
| `SERPAPI_API_KEY` | SerpAPI search API key | — |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `PORT` | Server port | `3001` |

### Provider Notes

- **DeepSeek** (default): Uses OpenAI-compatible API with web searches injected as context via Tavily/SerpAPI
- **Anthropic**: Uses native web_search tool — no external search API needed
- **OpenAI**: Same as DeepSeek — requires web search provider
- **Ollama**: Local models — requires web search provider

## Deploy to Render

1. Fork this repo
2. Create a new Render account at render.com
3. Click "New Blueprint" and connect your fork
4. Render will detect `render.yaml` and provision:
   - Web service for the Express backend
   - Static site for the React frontend  
   - PostgreSQL database
5. Add your secret environment variables in the Render dashboard:
   - `DEEPSEEK_API_KEY` (or your chosen provider's key)
   - `TAVILY_API_KEY` (unless using Anthropic)
6. Deploy

The backend serves the API at `/api/*`. The frontend is a separate static site that proxies API calls to the backend service URL.
