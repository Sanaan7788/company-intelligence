# Company Intelligence Dashboard

An analyst-grade tool for job hunters to research target companies — AI-powered dossiers with recent news, tech problems, and opportunities sourced from Reddit, LinkedIn, HackerNews, blogs, and job postings.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL (hosted on [Neon](https://neon.tech) — serverless, no Docker required) |
| **AI / LLM** | Pluggable provider abstraction — default: DeepSeek V3 via NVIDIA NIM (`deepseek-ai/deepseek-v3.2`) |
| **Web Search** | Tavily or SerpAPI (injected as context for non-native-search providers) |
| **Monorepo** | npm workspaces (`/client`, `/server`, `/shared`) |
| **Shared Types** | `/shared` package — TypeScript interfaces used by both client and server |

## Features

- **3-page navigation**: Dashboard, Companies, Research
- **Dashboard**: Add companies (single, bulk, or discover by location/zip), stats overview, shortlist view, recently researched
- **Companies**: Filter, search, sort company list — click to view full intelligence profile
- **Research**: Queue management — pending, active, failed, completed jobs with bulk actions
- **AI research agent**: Generates structured dossiers with news and problem statements
- **News feed**: Filterable by source type (Reddit, LinkedIn, HackerNews, Blog, Articles)
- **Problem statements**: Opportunity framing and difficulty ratings (low / medium / high)
- **Discover by location**: Enter a city, zip code, or region + optional industry — AI finds real companies
- **Bulk import**: Paste a list of companies (name, URL, or both) — one per line
- **Background task tracker**: Fixed badge showing all active research jobs across all companies
- **Shortlist**: Star companies for quick access
- **Tags**: Add custom tags per company
- **PDF export**: Print-optimized layout for any company profile
- **Research cache**: If two companies share the same website, research is cloned instantly

## Local Setup

### Prerequisites
- Node.js 20+
- A [Neon](https://neon.tech) free account (or any PostgreSQL connection string)
- API key for your chosen LLM provider

### Steps

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/Sanaan7788/company-intelligence.git
   cd company-intelligence
   npm install
   ```

2. Create a `.env` file at the repo root:
   ```bash
   cp .env.example .env
   ```

3. Fill in your environment variables (see table below).

4. Start the dev servers:
   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:5174
   - Backend API: http://localhost:3004

   Tables are auto-created on first server start — no migrations needed.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string (Neon or self-hosted) | — |
| `PORT` | Server port | `3004` |
| `LLM_PROVIDER` | Active LLM backend (`deepseek`, `anthropic`, `openai`, `ollama`) | `deepseek` |
| `DEEPSEEK_API_KEY` | API key — use NVIDIA NIM key (`nvapi-...`) for DeepSeek via NIM | — |
| `DEEPSEEK_BASE_URL` | Base URL for DeepSeek-compatible API | `https://integrate.api.nvidia.com/v1` |
| `DEEPSEEK_MODEL` | Model ID | `deepseek-ai/deepseek-v3.2` |
| `ANTHROPIC_API_KEY` | Anthropic API key | — |
| `OPENAI_API_KEY` | OpenAI API key | — |
| `OPENAI_MODEL` | OpenAI model ID | `gpt-4o` |
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama model name | `llama3.1` |
| `TAVILY_API_KEY` | Tavily search API key (optional — enriches non-native-search providers) | — |
| `SERPAPI_API_KEY` | SerpAPI key (alternative to Tavily) | — |

### LLM Provider Notes

- **DeepSeek via NVIDIA NIM** (default): Use an `nvapi-` key with `DEEPSEEK_BASE_URL=https://integrate.api.nvidia.com/v1`. Web search context injected via Tavily/SerpAPI.
- **Anthropic**: Uses native `web_search` tool — no external search API needed.
- **OpenAI**: Requires Tavily or SerpAPI for web search context.
- **Ollama**: Local models — requires Tavily or SerpAPI for web search context.

## Project Structure

```
/client        React frontend (Vite)
/server        Express backend
/shared        Shared TypeScript types (Company, NewsItem, ProblemStatement, etc.)
package.json   Root — npm workspaces
.env           Environment variables (repo root, loaded by server)
```
