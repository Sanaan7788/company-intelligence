# Company Intelligence Dashboard — Claude Context

## Project Overview
A full-stack job hunting research tool. Users add companies, trigger AI-powered research, and get structured dossiers: recent news from multiple sources + technology problem statements with source links.

## Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS (`/client`)
- **Backend**: Node.js + Express + TypeScript (`/server`)
- **Shared types**: `/shared` (TypeScript interfaces used by both client and server)
- **Database**: PostgreSQL via `pg` (node-postgres)
- **AI**: Pluggable LLM provider abstraction — default is DeepSeek V3 via NVIDIA NIM
- **Web Search**: Tavily or SerpAPI (injected as context for non-native-search providers)

## Monorepo Structure
```
/client        React frontend
/server        Express backend
/shared        Shared TypeScript types (Company, NewsItem, ProblemStatement, etc.)
package.json   Root — npm workspaces
```

## Environment
- `.env` lives at repo root, loaded by server via `dotenv` with explicit path resolution
- Server runs on port `3004` (3001 was in use locally)
- Frontend dev server runs on `5174` (5173 was in use)
- Vite proxies `/api/*` to the Express server

## Database
- Hosted on **Neon** (free tier, shared project — single Neon project with `company_intel` database)
- Tables auto-created on server startup via `initDb()` using `CREATE TABLE IF NOT EXISTS`
- No migration tooling — schema is inline in `server/src/db.ts`

## LLM Setup
- Provider: `deepseek` (set via `LLM_PROVIDER` env var)
- API key: NVIDIA NIM key (not DeepSeek's own platform)
- Base URL: `https://integrate.api.nvidia.com/v1`
- Model: `deepseek-ai/deepseek-v3.2`
- Timeout: 120s (important — NVIDIA NIM can be slow on large outputs)

## Key Architectural Decisions
- `Pool` in `db.ts` is lazy-initialized via a Proxy to avoid connection before dotenv loads
- Research runs async — endpoint responds immediately with 200, work happens in background
- **Research cache**: before calling LLM, checks if another company with the same website is already `done` — if so, clones its news + problems (no API call). `?force=true` bypasses cache (used by Re-research button)
- Website normalization: lowercase, strip `www.`, strip trailing slashes — enforced before insert
- If only website provided: name auto-derived from domain. If only name provided: synthetic `unknown://slug` stored as website

## API Endpoints
```
POST   /api/companies               add single company
POST   /api/companies/bulk          bulk add
GET    /api/companies               list all
GET    /api/companies/:id           full profile (company + news + problems)
DELETE /api/companies/:id           delete
POST   /api/companies/:id/research  trigger research (?force=true bypasses cache)
GET    /api/config/provider         active LLM provider name
```

## Frontend Behaviour
- Polls every 3s while any company has `status = 'researching'`
- Problem Statements and News Feed sections are collapsible (▲/▼ toggle)
- News Feed filterable by source type: all / reddit / linkedin / blog / article / hackernews
- Re-research button passes `force=true` to bypass cache
- Start Research uses cache

## Git
- Repo: https://github.com/Sanaan7788/company-intelligence.git
- Default branch: `main`

### ⚠️ Before every commit/push — switch to personal GitHub profile:
```bash
git config user.email "sanaan7788@gmail.com"
git config user.name "Sanaan7788"
```

### Verify current identity:
```bash
git config user.email
git config user.name
```

### Commit message rules:
- Only describe the feature or change made (e.g. "add collapsible news feed sections", "fix dotenv path resolution")

## Known Issues / Notes
- `.env` is at repo root but server workspace sets `process.cwd()` to `/server` — dotenv path explicitly resolves to `../` from cwd
- Port 5173 and 3001 are occupied locally by other projects — using 5174 and 3004
- NVIDIA NIM DeepSeek key format: starts with `nvapi-`
