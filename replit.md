# SteelFlow One - CRM for Steel Building Industry

## Overview

SteelFlow One is a luxury CRM platform designed specifically for the steel building industry. It provides lead management, deal tracking, AI-powered automation, and seamless integrations through Zapier. The application emphasizes a premium desktop-first experience with beautiful UI/UX, featuring glassmorphism design, smooth animations, and intelligent AI assistance for sales workflows.

**Core Features:**
- Lead ingestion from multiple sources (email, CSV, manual entry)
- AI-powered lead parsing and message generation
- Visual pipeline with drag-and-drop deal stages
- 3D building visualization and pricing breakdowns
- Zapier webhook integrations for automation
- Real-time activity tracking and call summaries
- Temperature-based lead prioritization (cold → warm → hot → fire)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Routing:**
- React 18 with TypeScript in strict mode
- Wouter for client-side routing (lightweight React Router alternative)
- Vite as build tool with hot module replacement in development

**State Management:**
- TanStack Query (React Query) for server state management
- No global state library - relies on React Query's built-in caching
- Query invalidation pattern for data synchronization after mutations

**UI Component System:**
- shadcn/ui components built on Radix UI primitives (New York style variant)
- Tailwind CSS for styling with custom design tokens
- Framer Motion for animations (spring-based transitions, card slide-ins)
- Custom CSS variables for theming (dark mode as default)

**Design Philosophy:**
- Desktop-first approach optimized for large screens (1440px+)
- Glassmorphism aesthetic with backdrop blur effects
- Deep charcoal backgrounds (#0F1419, #1A1F2E) with electric blue accents (#0EA5E9)
- Generous spacing using Tailwind's 4/6/8/12/16/24/32 scale
- All primary actions require ≤1 click or keyboard shortcut
- Micro-animations on every interaction for premium feel

**Drag & Drop:**
- @dnd-kit for pipeline kanban board functionality
- Sortable contexts for lead card reordering within stages
- Visual feedback with rotation and shadow effects during drag operations

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript
- Separate entry points for development (Vite middleware) and production (static file serving)
- Custom request logging with timestamp formatting

**Database Layer:**
- Drizzle ORM with Neon serverless PostgreSQL
- WebSocket connection via ws package for serverless compatibility
- Schema-first approach with migrations stored in `/migrations`
- Storage abstraction pattern (`IStorage` interface) for potential database swapping

**Data Models:**
- **Users:** Sales reps with name, email, role, avatar
- **Leads:** Company contacts with temperature, stage, building specs (JSONB), AI-generated notes/messages
- **Deals:** Associated with leads, includes building dimensions, pricing, contract status, deposit tracking
- **Activities:** Timeline events (calls, emails, SMS, notes, meetings) linked to leads
- **Zapier Webhooks:** Event subscriptions with URLs and active status

**Stage Pipeline:**
```
new → contacted → quote_sent → negotiating → won/lost
```

**Temperature System:**
```
cold → warm → hot → fire (with visual badges and animations)
```

### Building Configurator

**Location:** `client/src/configurator/`

The building configurator provides 3D visualization and configuration of steel buildings. It operates in two modes:

**Standalone Mode** (`/builder` route):
- Full-featured configurator for designing buildings
- No save functionality (users configure then create lead)
- BuilderPage component renders with default values

**CRM Embedded Mode** (Lead Detail → Config tab):
- LeadConfiguratorEmbed wraps BuilderPage as thin wrapper
- Loads initial configuration from `lead.configuration`
- Shows "Save Changes" button that PATCHes `/api/leads/:id`
- Saves `buildingSpecs`, `configuration`, and `totalPrice` to lead record

**Key Components:**
- `BuilderPage.tsx` - Main configurator with optional props (initialConfig, onSave, isSaving)
- `Scene3D.tsx` - Three.js 3D building visualization
- `ConfigPanel.tsx` - Controls for dimensions, colors, doors, windows, lean-tos
- `PricingHeader.tsx` - Real-time pricing calculation display
- `LeadConfiguratorEmbed.tsx` - Thin wrapper for CRM embedding

**Features:**
- Gable and single-slope roof styles
- Rollup and personnel door placement with collision detection
- Window placement on any wall
- Lean-to configurations (enclosed, open, gable types)
- Wall enclosure options (fully-enclosed, open, gable-ends, customize)
- Camera-based wall selection for door/window placement
- Real-time pricing via `/api/pricing/calculate`

### AI Integration

**Provider:** OpenAI GPT-5 (latest model as of August 2025)

**AI Capabilities:**
1. **Lead Parsing** (`parseLeadFromText`): Extracts structured lead data from unstructured input (emails, CSVs, text files)
2. **First Message Generation** (`generateFirstMessage`): Creates personalized outreach based on company name, contact, and building specs
3. **Call Summary** (`generateCallSummary`): Analyzes call notes and generates structured summaries
4. **Unstick Suggestions** (`generateUnstickSuggestion`): Provides recommendations for stalled deals
5. **Morning Brief** (`generateMorningBrief`): Prioritizes hot leads for daily sales focus

**Error Handling:** Graceful fallback if OpenAI API key is not configured - features degrade but app remains functional

### API Design

**RESTful Endpoints:**
- `GET /api/leads` - List all leads
- `GET /api/leads/:id` - Get single lead
- `POST /api/leads` - Create lead (triggers AI message generation + webhook)
- `PATCH /api/leads/:id` - Update lead (used for stage changes)
- `POST /api/leads/parse` - AI-powered lead parsing from file content
- `GET /api/deals` - List all deals
- `GET /api/deals/:leadId` - Get deal for specific lead
- `GET /api/activities/:leadId` - Get activity timeline
- `POST /api/activities` - Create activity
- `GET /api/webhooks` - List Zapier webhooks
- `POST /api/webhooks` - Register new webhook

**Mutation Pattern:** All mutations invalidate relevant query keys to trigger automatic UI updates

### External Dependencies

**Database:**
- Neon Serverless PostgreSQL (via `@neondatabase/serverless`)
- Drizzle ORM for type-safe queries
- Connection pooling with WebSocket support for serverless environments

**AI Services:**
- OpenAI API (GPT-5 model)
- Requires `OPENAI_API_KEY` environment variable

**Third-Party Integrations:**
- **Zapier Webhooks:** Outbound webhooks triggered on events (new_lead, stage_changed, deal_won, payment_received, contract_signed)
- Webhook delivery pattern: Fire-and-forget with Promise.all for parallel execution
- Failed webhooks are logged but don't block operations

**UI Libraries:**
- Radix UI primitives for accessible components
- Framer Motion for animations
- canvas-confetti for celebration effects on deal wins
- date-fns for time formatting ("2 hours ago" style)

**Development Tools:**
- Replit-specific plugins for cartographer and dev banner (development mode only)
- Runtime error overlay for debugging
- TypeScript with strict mode and path aliases (@/, @shared/, @assets/)

**Build & Deployment:**
- Vite for frontend bundling
- esbuild for backend bundling (ESM format, external packages)
- Static file serving in production from `/dist/public`

**Environment Variables Required:**
- `DATABASE_URL` - Neon PostgreSQL connection string (required)
- `OPENAI_API_KEY` - OpenAI API key (optional but recommended)
- `NODE_ENV` - development/production
- `REPL_ID` - Replit-specific identifier (optional)