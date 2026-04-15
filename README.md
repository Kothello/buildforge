# BuildForge

Full-stack construction CRM and quoting platform for prefabricated steel building companies. Manages the complete sales pipeline from lead capture to contract generation.

## Features

- **Marketing Site** -- Residential, commercial, agricultural, and storage building pages with hero carousels and contact forms
- **Lead Management CRM** -- Full pipeline with stage tracking, dispositions, callbacks, and lead assignment
- **Quote Generator** -- Custom building quotes with PDF export
- **Building Configurator** -- Interactive steel building configuration tool
- **Agent Dashboard** -- Sales rep workspace with callback scheduling and lead management
- **Contract Generation** -- Automated contract PDF creation from approved quotes
- **Admin Panel** -- Pipeline stage configuration, user management, system settings
- **Reporting** -- Revenue over time, deals by stage, performance by rep, pipeline funnel
- **Auth System** -- Registration, login, role-based access control
- **SMS Integration** -- Automated SMS notifications for lead updates

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Radix UI (shadcn/ui)
- **Backend:** Express + TypeScript + Drizzle ORM
- **Database:** Neon Postgres (serverless)
- **PDF:** Server-side PDF generation for quotes and contracts
- **Auth:** JWT-based authentication with role permissions

## Architecture

```
buildforge/
├── client/src/
│   ├── pages/          # 9 marketing pages + CRM views
│   ├── components/     # Reusable UI components (shadcn/ui)
│   ├── hooks/          # Custom React hooks
│   └── lib/            # CRM integration, utilities
├── server/
│   ├── routes/         # Modular API routes (auth, leads, quotes, reports, admin)
│   ├── storage.ts      # Database layer (Drizzle ORM)
│   └── index.ts        # Express server entry
├── shared/             # Shared types between client/server
└── configurator/       # Building configuration engine
```

## API Endpoints

### Auth
- `POST /api/auth/register` -- Create account
- `POST /api/auth/login` -- Login
- `POST /api/auth/logout` -- Logout

### Leads
- `GET /api/leads` -- List leads with filters
- `POST /api/leads` -- Create lead
- `PATCH /api/leads/:id` -- Update lead
- `POST /api/leads/:id/dispositions` -- Add disposition
- `PATCH /api/leads/:id/assign` -- Assign to rep

### Quotes
- `GET /api/leads/:id/quotes` -- Get quotes for lead
- `POST /api/leads/:id/quotes` -- Generate quote
- `GET /api/leads/:leadId/quotes/:quoteId/pdf` -- Download quote PDF

### Projects & Reports
- `GET /api/projects` -- List projects
- `GET /api/reports/overview` -- Dashboard overview
- `GET /api/reports/revenue-over-time` -- Revenue chart data
- `GET /api/reports/deals-by-stage` -- Pipeline breakdown
- `GET /api/reports/performance-by-rep` -- Rep performance

### Admin
- `CRUD /api/admin/pipeline-stages` -- Manage pipeline stages
- `GET/PUT /api/admin/settings` -- System settings

## Setup

```bash
npm install
cp .env.example .env  # Add your Neon database URL
npm run db:push        # Push schema to database
npm run dev            # Start dev server
```

## License

MIT
