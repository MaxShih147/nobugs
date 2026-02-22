# nobugs

A flexible bug tracker dashboard that uses **Notion as its database**. Your team keeps working in Notion — you get a powerful, multi-view dashboard with authentication.

![Summary dashboard](docs/images/summary-dashboard.png)

![Roadmap sprint view](docs/images/roadmap-sprint-view.png)

## Views

| View | Description |
|------|-------------|
| Summary | Stats, breakdowns by status/priority, workload per member, critical bugs |
| Kanban | Drag-style columns: Open → In Progress → In Review → Done |
| Members | Click a member to filter their bugs, see who's overloaded |
| Projects | Per-project cards with resolution %, filter by project |
| Roadmap | Sprint timeline with progress bars and bug cards |
| Admin | Manage databases, property/value mappings, and member email mappings |

All views support global filters (project, priority, status, search).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 6, inline styles |
| Backend | Express 4, Notion SDK |
| Auth | Invite code + email, JWT (httpOnly cookie) |
| Runtime | Node.js 20 |
| Deployment | Docker / Docker Compose |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Browser                         │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Login Page   │  │ Header   │  │ Views      │ │
│  │ (email+code) │  │ (user,   │  │ (Summary,  │ │
│  │              │  │  logout) │  │  Kanban,   │ │
│  │              │  │          │  │  Members,  │ │
│  │              │  │          │  │  Projects, │ │
│  │              │  │          │  │  Roadmap)  │ │
│  └──────┬───────┘  └────┬─────┘  └─────┬──────┘ │
│         │               │              │         │
│         └───────┬───────┴──────────────┘         │
│                 │ fetch /api/* & /auth/*          │
└─────────────────┼────────────────────────────────┘
                  │
    ┌─────────────▼──────────────┐
    │        Express API Server          │  port 4993
    │  ┌──────────┐ ┌──────────────────┐│
    │  │ auth.js   │ │ notion.js        ││
    │  │ (JWT,     │ │ (CRUD, prop map, ││
    │  │  invite   │ │  value translate)││
    │  │  code)    │ └────────┬─────────┘│
    │  └──────────┘          │           │
    │  ┌──────────────┐ ┌────▼────────┐  │
    │  │ databases.js  │ │ members.js  │  │
    │  │ (multi-db,    │ │ (name→email │  │
    │  │  propMap,     │ │  mappings)  │  │
    │  │  valueMap)    │ └─────────────┘  │
    │  └──────────────┘                   │
    └─────────────────────┼───────────────┘
                          │ Notion SDK
    ┌─────────────────────▼──────┐
    │     Notion Database(s)      │
    │  (bugs, members, sprints)   │
    └────────────────────────────┘
```

**Data flow:**
```
App.jsx → useBugs() hook → api.js → mock data (default)
                                   → /api/* → Express → Notion (production)
```

Mock mode (`VITE_DATA_SOURCE` unset) uses seeded fake data — no server needed.

## Quick Start (Mock Data)

No Notion setup needed — uses built-in mock data:

```bash
npm install
npm run dev
```

Open http://localhost:4973

## Connect to Notion

### 1. Create a Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click **"New integration"**
3. Name it "nobugs", select your workspace
4. Copy the **Internal Integration Secret**

### 2. Share Your Database

1. Open your bug tracking database in Notion
2. Click **...** → **Connections** → **Connect to** → select "nobugs"
3. Copy the **database ID** from the URL:
   ```
   https://www.notion.so/{workspace}/{database_id}?v=...
                                      ^^^^^^^^^^^^
   ```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
NOTION_API_KEY=secret_abc123...
NOTION_DATABASE_ID=abc123def456...
DATA_SOURCE=notion
```

### 4. Map Your Properties

Property mapping is configured through the **Admin UI** — no code changes needed:

1. Start the server and open the app
2. Go to the **Admin** panel
3. Click **"Add Database"** or **"Edit Mapping"** on an existing database
4. Enter your Notion database ID and click **"Fetch Properties"**
5. Map each app field (Title, Status, Priority, etc.) to the matching Notion property name
6. Optionally configure **Value Mapping** to translate Notion option values to cleaner display names (e.g. emoji-heavy priorities like "🔥🔥🔥🔥P1" → "P1")
7. Save — mappings are stored in `data/databases.json`

Multiple databases are supported — each gets its own property mapping and value mapping.

### 5. Run with Notion

```bash
# Terminal 1: API server
npm run server

# Terminal 2: Frontend
VITE_DATA_SOURCE=notion npm run dev
```

## Authentication

Auth is **optional**. If `INVITE_CODE` and `JWT_SECRET` are set in `.env`, the app requires login. Otherwise it runs with open access.

### Setup

Add to `.env`:
```
INVITE_CODE=your_shared_code
JWT_SECRET=<run: openssl rand -hex 32>
ALLOWED_EMAILS=alice@example.com,bob@example.com
```

- **INVITE_CODE** — shared passphrase, give it to your team
- **JWT_SECRET** — signs session cookies (8h expiry)
- **ALLOWED_EMAILS** — comma-separated allowlist; leave empty to allow anyone with the code

### How it works

1. User opens the app → sees login form
2. Enters email + invite code → server validates → JWT cookie set
3. All `/api/*` routes are protected by `requireAuth` middleware
4. On 401, the frontend redirects back to the login page

### Security

- **JWT cookies:** httpOnly, secure (HTTPS only), sameSite=lax, 8h expiry
- **Rate limiting:** Login endpoint limited to 10 attempts per 15 minutes; API limited to 100 requests per minute
- **CORS:** Locked to production domain only
- **Proxy trust:** Enabled for Cloudflare Tunnel

## Deploy with Cloudflare Tunnel

The recommended deployment runs on a local machine with Cloudflare Tunnel — no cloud server needed.

### Prerequisites

- Node.js 20+
- `cloudflared` (`brew install cloudflared`)
- `pm2` (`npm install -g pm2`)
- A domain on Cloudflare

### Setup

1. Create a Cloudflare Tunnel in Zero Trust → Networks → Connectors
2. Point the tunnel to `http://localhost:4993`
3. Configure `.env` (see above)
4. Start all services:

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

5. Enable auto-start on reboot:

```bash
pm2 startup
# Run the sudo command it outputs
```

### What's included

| Concern | Handled by |
|---------|-----------|
| HTTPS / SSL | Cloudflare (automatic) |
| DDoS protection | Cloudflare (free tier) |
| CORS | Express (locked to production domain) |
| Auth | Email allowlist + invite code + JWT |
| Process management | pm2 (auto-restart on crash) |
| Boot recovery | pm2 + launchd (auto-start on reboot) |

### pm2 Commands

```bash
pm2 status          # Check all services
pm2 logs            # View live logs
pm2 restart all     # Restart everything
pm2 stop all        # Stop everything
```

## Deploy with Docker

```bash
cp .env.example .env
# Edit .env with your Notion credentials

docker-compose up -d
```

nobugs will be available at http://localhost:4993

## Notion Database Template

If you're setting up a new Notion database, create these properties:

| Property | Type | Options |
|----------|------|---------|
| Title | Title | — |
| Status | Select | Open, In Progress, In Review, Done |
| Priority | Select | Critical, High, Medium, Low |
| Assignee | Select | (your team members) |
| Project | Select | (your project names) |
| Tags | Multi-select | UI, Backend, API, Performance, Security, etc. |
| Sprint | Select | Sprint 1, Sprint 2, etc. |
| Due Date | Date | — |
| Description | Rich text | — |

## Project Structure

```
nobugs/
├── src/
│   ├── components/      # Shared UI components
│   │   ├── ui.jsx       # Badge, Pill, StatCard, BugRow, etc.
│   │   ├── Header.jsx   # Top nav + filters + user menu
│   │   └── BugDetail.jsx
│   ├── views/           # Dashboard views
│   │   ├── SummaryView.jsx
│   │   ├── KanbanView.jsx
│   │   ├── MemberView.jsx
│   │   ├── ProjectView.jsx
│   │   ├── RoadmapView.jsx
│   │   └── AdminView.jsx  # Database, value mapping, member management
│   ├── hooks/
│   │   └── useBugs.js   # Data fetching + filter state
│   ├── lib/
│   │   ├── api.js       # Frontend API client (mock/notion) + auth helpers
│   │   └── mockData.js  # Mock data generator
│   ├── styles/
│   │   ├── global.css
│   │   └── tokens.js    # Design tokens
│   ├── App.jsx          # Root component, auth gate, view routing
│   └── main.jsx
├── server/
│   ├── index.js         # Express API server
│   ├── auth.js          # Invite code auth, JWT, requireAuth middleware
│   ├── notion.js        # Notion SDK client, value translation, CRUD
│   ├── databases.js     # Multi-database config, propMap, valueMap
│   ├── members.js       # Member name → email mappings
│   └── roadmaps.js      # Roadmap CRUD
├── data/
│   └── databases.json   # Persisted database configs + mappings
├── docker/
│   └── serve-static.js  # Production combined server
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
├── vite.config.js
└── README.md
```

## TODO

- [ ] Map logged-in email to Notion member for personalized views (e.g. "My Bugs")
- [ ] Add drag-and-drop to Kanban board
- [ ] Bug comments / activity log
- [ ] Email notifications for assigned bugs
- [x] Production deployment (Cloudflare Tunnel + pm2)
- [ ] Dark/light theme toggle

## License

MIT
