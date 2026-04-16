# BuildForge

**A 3D steel building configurator with CRM pipeline — React Three Fiber + TypeScript + PostgreSQL.**

Customers design their building in 3D, submit a quote, and the full configuration — dimensions, doors, windows, lean-tos, wall enclosure, colors — round-trips through a JSONB column so sales reps can edit the exact same scene in the CRM and save changes back.

<p align="center">
  <img src="docs/demo.gif" alt="BuildForge demo" width="800"/>
  <br/>
  <em>Add a demo GIF here: see <code>docs/RECORDING.md</code> for a 60-second recording script.</em>
</p>

---

## What makes it interesting

- **Camera-aware placement** — add a door and it lands on whichever wall you're facing. Extends to lean-to walls (nested structures).
- **Drag-to-reposition** — doors and windows can be dragged along walls with live overlap prevention.
- **Parent-child lean-tos** — attach lean-tos to other lean-tos (real steel building feature), with wraparound geometry around corners and gable orientation variants.
- **JSONB round-trip** — the entire `BuildingConfig` (including nested lean-tos) serializes to Postgres JSONB, reloads on the CRM edit page, and renders the exact same 3D scene.
- **Pricing engine** — dimension-based pricing with height multiplier, gable premium, door/window/lean-to line items. Updates live as the customer configures.
- **Red-team tested** — 27 Playwright assertions cover every button + a full public-quote → CRM-edit → save → reload round trip.

## Stack

| Layer     | Tech                                                              |
| --------- | ----------------------------------------------------------------- |
| 3D        | React Three Fiber 8.18 · Drei · Three.js r170                     |
| Frontend  | React 18 · TypeScript · Vite · Tailwind · shadcn/ui               |
| Backend   | Express · Drizzle ORM · JWT auth                                  |
| Database  | Neon Postgres (JSONB for building configuration)                  |
| 3D assets | Blender 5.1 Python API (7 GLB models: C-channel, I-beam, etc.)    |
| Tests     | Playwright (27 end-to-end button/flow assertions)                 |

## Demo

Clone and run in under 2 minutes:

```bash
git clone https://github.com/Kothello/buildforge.git
cd buildforge
npm install
cp .env.example .env        # add your DATABASE_URL (Neon free tier works)
npm run dev
```

Open http://localhost:3000/builder for the public configurator, or log in at `/login` for the CRM.

**Default admin (dev):** `admin@buildforge.com` / `admin123` (seeded on first run).

## Architecture

```
Public builder (/builder)
  ↓ Get a Quote
POST /api/leads  →  leads table  (configuration JSONB)
                         ↓
CRM lead detail (/sales/leads/:id)
  ↓ Edit Building
BuilderPage loads config from JSONB, renders same 3D scene
  ↓ Save Changes
PATCH /api/leads/:id  →  updates configuration JSONB
```

Every configuration detail — every door's wall/position/width, every lean-to's parent/wraparound corner, every enclosure mode — persists and reloads byte-for-byte.

## Project structure

```
client/src/configurator/
├── SteelBuilding.tsx      # 3D scene: walls, roof, lean-tos, openings
├── Scene3D.tsx            # R3F Canvas + orbit controls + lighting
├── BuilderPage.tsx        # Top-level container (public + CRM modes)
├── ConfigPanel.tsx        # Sidebar: presets, dimensions, colors, lean-tos
├── LeadConfiguratorEmbed.tsx # CRM wrapper with PATCH save
├── placement.ts           # Camera-aware door/window placement, drag logic
├── pricing.ts             # Dimension-based pricing engine
└── types.ts               # BuildingConfig + 4 prefab presets

client/public/models/steel/ # 7 Blender-generated GLB models
scripts/generate-steel-models.py  # Blender 5.1 generator
```

## Deploy

### One-click Render blueprint

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Kothello/buildforge)

The included `render.yaml` provisions a web service on Render's free tier. You'll need to supply:

- `DATABASE_URL` — a Postgres connection string (free Neon tier works perfectly)
- `JWT_SECRET` and `JWT_REFRESH_SECRET` — any two random strings

### Manual build

```bash
npm run build
NODE_ENV=production npm start
```

## Red-team results

27/27 end-to-end assertions passing across:

- All 4 presets apply (Warehouse, Garage, Barndominium, Workshop)
- Dimension dropdowns update the 3D view
- All 4 wall enclosure modes (Enclosed, Open, Gable Ends, Customize)
- Lean-tos: add, change wall, delete, nest, wraparound
- Public quote submission → lead creation (200 OK)
- CRM login → lead detail → Edit Building restores full config
- Save Changes → PATCH /api/leads/:id (200) → reload persists

Run locally:

```bash
node tests/redteam/test-redteam-public.mjs
node tests/redteam/test-redteam-crm.mjs
```

## Built with

BuildForge was built as a focused portfolio piece over a weekend, pair-programmed with [Claude Code](https://claude.com/claude-code) as an engineering collaborator. Commits are co-authored; architecture, product decisions, geometry conventions, and red-team coverage are the author's.

## License

MIT — use freely for your own configurator builds.
