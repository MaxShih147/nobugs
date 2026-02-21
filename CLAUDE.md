# nobugs

A bug tracker dashboard that uses Notion as its database backend. Works with mock data out of the box.

## Project Goal

Provide a multi-view bug tracking dashboard (Summary, Kanban, Members, Projects, Roadmap) that connects to a Notion database. Teams keep working in Notion while getting a powerful, filterable dashboard UI.

## Tech Stack

- **Frontend:** React 18, Vite 6, inline styles (no CSS-in-JS library)
- **Backend:** Express 4, Notion SDK
- **Runtime:** Node.js 20

## Project Structure

```
nobugs/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui.jsx           # Badge, Pill, StatCard, BugRow, Card, Avatar, etc.
│   │   ├── Header.jsx       # Top nav + filter controls
│   │   └── BugDetail.jsx    # Bug detail modal
│   ├── views/               # Dashboard views (each receives { bugs, meta, onSelect })
│   │   ├── SummaryView.jsx  # Stats & breakdowns
│   │   ├── KanbanView.jsx   # Column-based status board
│   │   ├── MemberView.jsx   # Per-member bug list
│   │   ├── ProjectView.jsx  # Per-project cards
│   │   └── RoadmapView.jsx  # Sprint timeline
│   ├── hooks/
│   │   └── useBugs.js       # Data fetching, filter state, CRUD operations
│   ├── lib/
│   │   ├── api.js           # API client (switches between mock and Notion)
│   │   └── mockData.js      # Seeded mock data generator
│   ├── styles/
│   │   ├── tokens.js        # Design tokens: colors, spacing, fonts, helpers
│   │   └── global.css       # CSS custom properties, fonts, animations
│   ├── App.jsx              # Root component, view routing
│   └── main.jsx             # React entry point
├── server/
│   ├── index.js             # Express API server (port 4993)
│   └── notion.js            # Notion SDK client, property mapping, CRUD
├── docker/
│   └── serve-static.js      # Production server (API + static files)
├── vite.config.js           # Vite config, dev proxy /api -> :4993
├── package.json
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Coding Style

- **Functional components only** — no class components
- **Inline styles** — all styling via `style={{}}` props, no CSS modules or styled-components
- **Design tokens** — colors, fonts, spacing centralized in `src/styles/tokens.js`; always use `T.xxx` instead of hardcoded values
- **PascalCase** for component names and files, **camelCase** for variables and props
- **Prop drilling** for data flow — no Redux or Context API
- **`useMemo`** for derived/filtered data in hooks
- **Default exports** for all components and views
- **Dark theme** — monochrome base with colored status/priority indicators
- **Icons** — all icons must be inline SVG, uniform style: 15x15 size, viewBox `0 0 24 24`, stroke-based (`fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"`). Wrap in fixed-size square buttons (28x26). Never use emojis or mixed text/unicode characters for icons. See `MarkdownToolbar` in `BugDetail.jsx` for reference.

## Data Flow

```
App.jsx
 └─ useBugs() hook (fetching, filtering, CRUD)
     ├─ api.js → mock data (default) or /api/* → Express → Notion
     └─ returns { bugs, meta, filters, updateBug, createBug }
         ├─ Header (filter controls)
         ├─ Views (filtered bugs)
         └─ BugDetail (single bug view)
```

- `VITE_DATA_SOURCE=notion` switches frontend to real API calls
- `DATA_SOURCE=mock` (default) uses seeded mock data, no server needed

## Dev Commands

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server on :4973 (mock data)
npm run server       # Express API on :4993 (for Notion mode)
npm run build        # Production build to /dist
```

## Key Conventions

- Views receive `{ bugs, meta, onSelect }` — keep this interface consistent
- Shared UI primitives live in `src/components/ui.jsx` — add new reusable components there
- Notion property mapping is configured via `PROP_MAP` in `server/notion.js`
- Bug IDs follow the format `NB-XXX`
- Imports from `src/views/` use `../styles/tokens` and `../components/ui` (one level up)

## Workspace

- Notion workspace: **BigWeiWei's Notion** (`2ff47fc8-597b-47e0-95ac-eb7b69a96fdc`)
- OAuth integration client ID: `306d872b-594c-8096-85b2-0037dd7f1840`

## Workflow

- **Do not commit or push** after making changes — the user will test FE+BE manually first, and handle commit/push themselves after verifying
- **For FE+BE testing** — ALWAYS start both servers before opening the browser. This project uses `VITE_DATA_SOURCE=notion` so the Express API server is required:
  1. Kill any existing processes on ports 4973/4993: `lsof -ti:4973,4993 | xargs kill 2>/dev/null`
  2. Start the API server: `npm run server` (port 4993)
  3. Start the dev server: `npm run dev` (port 4973)
  4. Verify both are up: `curl -s -o /dev/null -w "%{http_code}" http://localhost:4993/api/health` and `curl -s -o /dev/null -w "%{http_code}" http://localhost:4973`
  5. Open browser: `open http://localhost:4973`
- **When the user says something correlating to "pass"** (e.g. "pass", "looks good", "it works", "approved"), ask them if they want to commit and push
- **When the user says "add a rule"**, add the rule to this CLAUDE.md file

## Naming

- **Page body / description** — refers to Notion block content (the page body text), not a database property field. It is fetched and saved separately from bug properties.

## Ports

Both ports are prime numbers, chosen to avoid conflicts with common dev tools.

- **Frontend (Vite):** `4973` — `strictPort: true`, will fail if port is taken
- **Backend (Express):** `4993`
- Do NOT change these ports — the Cloudflare Tunnel is configured to point to `localhost:4973`

## Deployment

- **Domain:** `nobugs.max-the-solution.com`
- **Tunnel:** Cloudflare Tunnel → `http://localhost:4973`
- Cloudflare handles HTTPS automatically; local servers run HTTP
- **Process manager:** pm2 manages all 3 services (`nobugs-api`, `nobugs-fe`, `nobugs-tunnel`)
- **Auto-start:** pm2 is registered with launchd — all services start on reboot
- **pm2 commands:** `pm2 status`, `pm2 logs`, `pm2 restart all`, `pm2 stop all`
- **Config:** `ecosystem.config.cjs` defines all 3 processes

## Security

- **CORS:** Restricted to `https://nobugs.max-the-solution.com` and `http://localhost:4973` only
- **Auth:** Email allowlist + invite code, JWT sessions (httpOnly cookies)
- **JWT:** 8h expiry, httpOnly + secure + sameSite=lax cookies
- **Rate limiting:** Login: 10 attempts per 15 min; API: 100 requests per min
- **Proxy trust:** `trust proxy` enabled for Cloudflare Tunnel
- **Network:** Cloudflare Tunnel — no open ports, device IP hidden, DDoS protection included
- **SSL:** Handled by Cloudflare, local servers run HTTP

## TODO

- [ ] Remove OAuth integration from Notion (no longer used)
- [ ] Set up production deployment
- [ ] Add member email-to-name mapping for better display in Header
