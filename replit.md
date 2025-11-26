# SteelFlow One - Next.js 15 Migration IN PROGRESS

## Overview

SteelFlow One is migrating to Next.js 15 + Supabase for a complete feature rewrite targeting the steel building industry premium CRM market.

**NEW CORE FEATURES (Under Development):**
- Multi-page Next.js 15 App Router (Admin, Sales, Projects)
- Supabase PostgreSQL with RLS for role-based access
- Advanced lead automation (3x reschedule, no-show nurture)
- Intelligent pricing rules editor
- Project management kanban board
- Role-based routing & access control
- Zapier webhooks on all events

## MIGRATION STATUS

### Completed ✅
- Next.js 15 project scaffold created
- Page structure: /admin, /sales, /projects
- Basic API routes stub for auth & leads
- Tailwind + design system with glassmorphism
- TypeScript types for all models

### IN PROGRESS 🔄
- Replit Auth integration
- Supabase database connection
- Lead ingestion & AI parsing
- Automation workflows (scheduling, reschedules, no-show nurture)
- Pricing rules editor
- Project board with drag-and-drop

### TODO ⏳
- Full Supabase schema with RLS
- Automated scheduling flow (Calendly → SMS/email)
- 3x auto-resend logic with timestamps
- No-show nurture board & resurrection emails
- Role-based page access
- Infinite-scroll list virtualization
- Framer Motion animations
- Production deployment

## Tech Stack (FINAL)
- **Frontend:** Next.js 15, React 18, TypeScript, Tailwind, Framer Motion, shadcn/ui
- **Backend:** Supabase (Postgres + RLS + Realtime)
- **Auth:** Replit Auth via OpenID Connect
- **AI:** OpenAI GPT-5 for lead parsing & automation
- **Integrations:** Zapier webhooks, Sendblue/LoopMessage for SMS/Email
- **Deployment:** Vercel

## Development Notes

### Running Locally
```bash
npm run dev  # Starts Next.js on port 5000
```

### Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
SESSION_SECRET=
REPL_ID=
```

### Key Architecture Decisions

1. **Pages as Role Gates:** Each page (/admin, /sales, /projects) auto-routes based on user role
2. **Supabase RLS:** Row-level security ensures reps only see their leads
3. **No-Show Automation:** Leads moved to "no_show_nurture" after 3 failed reschedules
4. **Infinite Scroll:** TanStack Query for efficient lead list pagination
5. **Real-time Updates:** Supabase subscriptions for live deal/project changes

### File Structure
```
/app
  /(admin)/admin/page.tsx      # Pricing, settings, user mgmt
  /(sales)/sales/page.tsx      # My Leads sidebar + detail view
  /(projects)/projects/page.tsx # Kanban board for sold deals
  /api/auth/session            # Session endpoint
  /api/leads                   # CRUD operations
  /api/automation              # Scheduling & reschedules
/lib
  /auth.ts                     # Auth utilities
  /supabase.ts                 # Supabase client
/types
  /index.ts                    # All TypeScript models
```

## User Preferences
- Simple, everyday language
- Desktop-first but fully responsive
- Ruthless focus on automation (zero busy work)
- God-tier UI that feels like magic

## Next Steps
1. Connect Supabase database
2. Implement Replit Auth session middleware
3. Build lead ingestion pipeline
4. Create scheduling automation flow
5. Deploy to Vercel
