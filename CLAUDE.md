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
- `.env` lives at repo root, loaded by server via `dotenv` with explicit path resolution (`../` from `process.cwd()` which is `/server`)
- Server runs on port `3004` (3001 was in use locally)
- Frontend dev server runs on `5174` (5173 was in use)
- Vite proxies `/api/*` to the Express server

## Database
- Hosted on **Neon** (free tier, shared project — single Neon project with `company_intel` database)
- Tables auto-created on server startup via `initDb()` using `CREATE TABLE IF NOT EXISTS`
- New columns added via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — safe to re-run
- No migration tooling — schema is inline in `server/src/db.ts`

## LLM Setup
- Provider: `deepseek` (set via `LLM_PROVIDER` env var)
- API key: NVIDIA NIM key (not DeepSeek's own platform) — format starts with `nvapi-`
- Base URL: `https://integrate.api.nvidia.com/v1` (set via `DEEPSEEK_BASE_URL`)
- Model: `deepseek-ai/deepseek-v3.2` (set via `DEEPSEEK_MODEL`)
- Timeout: 120s (important — NVIDIA NIM can be slow on large outputs)

## Key Architectural Decisions
- `Pool` in `db.ts` is lazy-initialized via a Proxy to avoid connection before dotenv loads
- Research runs async — endpoint responds immediately with 200, work happens in background
- **Research cache**: before calling LLM, checks if another company with the same website is already `done` — if so, clones its news + problems instantly. `?force=true` bypasses cache (used by Re-research button)
- Website normalization: lowercase, strip `www.`, strip trailing slashes — enforced before insert
- If only website provided: name auto-derived from domain. If only name given: synthetic `unknown://slug` stored as website placeholder
- When research completes on a placeholder website: LLM returns the real homepage URL and it gets saved to DB

## API Endpoints
```
POST   /api/companies                     add single company
POST   /api/companies/bulk                bulk add array
POST   /api/companies/discover            discover companies by location (LLM-powered)
GET    /api/companies                     list all
GET    /api/companies/:id                 full profile (company + news + problems)
DELETE /api/companies/:id                 delete
POST   /api/companies/:id/research        trigger full research (?force=true bypasses cache)
POST   /api/companies/:id/research/news   refresh only news items
POST   /api/companies/:id/research/problems refresh only problem statements
PATCH  /api/companies/:id/website         update company website
PATCH  /api/companies/:id/tags            update tags array
PATCH  /api/companies/:id/shortlist       toggle shortlist boolean
GET    /api/config/provider               active LLM provider name
```

## Database Schema (key columns)
```
companies: id, name, website (unique, normalized), status, tags TEXT[], shortlisted BOOLEAN, created_at, last_researched_at
news_items: id, company_id, title, summary, source_type, source_name, source_url, published_at
problem_statements: id, company_id, title, description, opportunity, source_url, source_name, difficulty
```

## Frontend Features
- **Sidebar**: add company (name or website optional), bulk add modal, discover by location modal
- **Search**: filter company list by name or domain in real-time
- **Sort**: newest / oldest / A-Z / Z-A / recently researched
- **Shortlist**: ⋮ menu per company with star toggle + delete. Filter to shortlisted only via ★ button
- **Tags**: inline tag editor in profile header — type + Enter to add, × to remove
- **Website edit**: inline ✎ edit button on company website — saves to DB on Enter
- **Collapsible sections**: Problem Statements and News Feed toggle with ▲/▼
- **News filters**: filter by source type (all / reddit / linkedin / blog / article / hackernews)
- **Research age warning**: amber badge if `last_researched_at` > 30 days old
- **Export PDF**: sets document title to company name before `window.print()`
- **Section refresh**: ↻ News and ↻ Problems buttons to refresh individual sections
- **Background task tracker**: fixed bottom-right badge showing active research tasks across all companies — persists when switching companies

## Frontend Behaviour
- Polls every 3s while any company has `status = 'researching'`
- Re-research button passes `force=true` to bypass cache; Start Research uses cache
- `tasks` state in App.tsx tracks running/completed research jobs — feeds TaskTracker component
- `unknown://` placeholder websites are hidden from UI (shows "No website" instead)

## Component Map
```
App.tsx                  root — state, polling, handlers
Sidebar.tsx              left panel — add/search/sort/shortlist/company list
ProfilePanel.tsx         right panel — company detail, tags, news, problems
BulkAddModal.tsx         modal — paste-import multiple companies
LocationDiscoverModal.tsx modal — discover companies by city/zip via LLM
TaskTracker.tsx          fixed bottom-right — background task status badge + panel
```

## Shared Types (shared/src/index.ts)
```ts
Company, NewsItem, ProblemStatement, CompanyProfile, ResearchResult (includes website?), BulkAddResult
```

## Git
- Repo: https://github.com/Sanaan7788/company-intelligence.git
- Default branch: `main`

### ⚠️ Before every commit/push — switch to personal GitHub profile:
```bash
ssh-add -D
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_personal
git config user.email "sanaan7788@gmail.com"
git config user.name "Sanaan7788"
```

### Verify current identity:
```bash
git config user.email
git config user.name
```

### Commit message rules:
- Follow conventional commit format: `type(scope): description`
- Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`, `perf`
- Only describe the feature or change made (e.g. `feat: add collapsible news feed sections`, `fix: resolve dotenv path resolution`)
- Examples:
  - `feat: add location discovery modal`
  - `fix: resolve dotenv path in server workspace`
  - `chore: update CLAUDE.md with architecture notes`
  - `refactor: lazy-initialize pg Pool via Proxy`

## Mentor Rule
**"You are my ruthless mentor, don't sugar coat any response."** — Always give direct, honest feedback. Call out bad decisions, weak implementations, and missed opportunities without softening it.

## Known Issues / Notes
- Port 5173 and 3001 are occupied locally by other projects — using 5174 and 3004
- `unknown://` website placeholders: hidden in UI, replaced with real URL after research completes
- NVIDIA NIM can be slow — 120s timeout is necessary
- No Tavily key set yet — LLM runs without web search context until key is added
