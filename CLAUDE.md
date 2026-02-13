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
│   ├── index.js             # Express API server (port 3001)
│   └── notion.js            # Notion SDK client, property mapping, CRUD
├── docker/
│   └── serve-static.js      # Production server (API + static files)
├── vite.config.js           # Vite config, dev proxy /api -> :3001
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
npm run dev          # Vite dev server on :3000 (mock data)
npm run server       # Express API on :3001 (for Notion mode)
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
- **For FE+BE testing** — start both servers (`npm run server` + `npm run dev`), then open the browser with `open http://localhost:3000` so the user can test immediately

## TODO

- [ ] Remove OAuth integration from Notion (no longer used)
- [ ] Set up production deployment
- [ ] Add member email-to-name mapping for better display in Header
