# Red Iron Building Designer - 3D Configurator

## Overview

This is a 3D building configurator application that allows users to design and customize red iron buildings in real-time. The application provides an interactive 3D visualization where users can adjust building dimensions, colors, roof styles, add doors and windows, and configure lean-to extensions. Built with React and Three.js, it offers a complete visual design experience for metal building customization.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**2025-11-24: Fixed Auto-Delete for Wall Enclosure Presets**
- **Issue**: Auto-delete of doors/windows only worked when using "Customize by Wall" but not when using wall enclosure presets (fully-enclosed, fully-open, gable-ends)
  - Root Cause: The auto-delete useEffect checked only `customWalls` which is ignored when using presets. Also missing `wallEnclosure` from dependency array.
  - Fix: Added `getMainWallVisibility()` helper function that determines which walls exist based on wallEnclosure mode:
    - "fully-enclosed" → all walls exist
    - "fully-open" → no walls exist
    - "gable-ends" → only front/back walls exist
    - "customize" → uses customWalls state
  - Added `wallEnclosure` to dependency array so useEffect fires on preset changes
  - Result: Doors and windows now auto-delete correctly when walls are removed via any method (presets or customize mode) and when lean-to walls are toggled off

**2025-11-24: Fixed Lean-to Door/Window Dragging + Auto-Delete + Smooth Motion**
- **Issue 1**: Door and window dragging on lean-to walls was using incorrect wall length calculations, causing misalignment between 3D dragging and overlap detection
  - Root Cause: The `leanToWallLength` position calculation was inverted, and `axisLen` clamping calculation was also wrong
  - Fix: Corrected on lines 3027, 3212 (position), and 3126, 3305 (clamping) to use correct dimensions for front vs. sidewalls
  - Result: Door/window dragging now perfectly matches overlap detection with smooth 1:1 movement
  
- **Issue 2**: Doors/windows would slide visually past wall corners on lean-to sidewalls before snapping back
  - Root Cause: Same clamping calculation issue - sidewalls were using wrong dimension for max position
  - Fix: Swapped `effectiveWidth` and `attachWallLength` in axisLen calculations so sidewalls clamp correctly
  - Result: Doors/windows stay perfectly within wall boundaries during drag with no visual overshoot
  
- **Issue 3**: When removing wall sheeting from main building or lean-to, doors/windows remained visible
  - Root Cause: No cleanup logic when `customWalls` or `leanTo.walls` changed
  - Fix: Added useEffect in Index.tsx (lines 149-183) that auto-deletes doors/windows when their wall is removed
  - Result: Clean, automatic removal of doors/windows when wall is toggled off

## System Architecture

### Frontend Architecture

**Framework & Core Libraries**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR (Hot Module Replacement)
- React Router (wouter) for lightweight client-side routing
- TanStack Query for server state management and data fetching

**3D Visualization**
- React Three Fiber (@react-three/fiber) wraps Three.js in a declarative React API
- @react-three/drei provides useful 3D helpers (OrbitControls, PerspectiveCamera, Environment)
- Custom BuildingModel component renders the building geometry using THREE.js primitives
- Scene3D component manages camera positioning, lighting, and orbit controls

**UI Component Library**
- shadcn/ui components built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- CSS variables define the complete design system (colors, shadows, transitions)
- Components use class-variance-authority for type-safe variant management

**State Management Strategy**
- Local component state (useState) for UI controls and configuration
- Refs (useRef) for imperative access to Three.js objects and DOM elements
- Custom hooks for reusable logic (use-mobile, use-toast)
- Props drilling for sharing building configuration between components

**Key Design Patterns**
- Component composition: ConfigPanel, LeanToConfig, BuildingModel are separate concerns
- Controlled components: All inputs are controlled with onChange handlers
- Render optimization: useMemo for expensive calculations, refs to avoid re-renders
- Interactive 3D: Click handlers and drag interactions on 3D meshes for door/window positioning

### Backend Architecture

**Server Framework**
- Express.js HTTP server with TypeScript
- Development mode uses Vite middleware for SSR (Server-Side Rendering) of HTML
- Production mode serves pre-built static assets from dist/public
- RESTful API endpoints for building design CRUD operations

**Database Layer**
- PostgreSQL database (Neon-backed) for persistent storage
- Drizzle ORM for type-safe database queries and schema management
- @neondatabase/serverless for database connectivity
- Database schema defined in shared/schema.ts
- Zod validation schemas generated from Drizzle schema using drizzle-zod

**API Endpoints**
- GET /api/designs - Fetch all building designs
- GET /api/designs/:id - Fetch a single building design
- POST /api/designs - Create a new building design
- PATCH /api/designs/:id - Update an existing building design
- DELETE /api/designs/:id - Delete a building design

**Build & Development**
- tsx for running TypeScript directly in Node.js (development and production)
- Watch mode with auto-restart during development, ignoring Vite timestamp files
- Separate client and server TypeScript configurations
- Path aliases (@/, @shared/, @assets/) for clean imports
- Database migration scripts: npm run db:push, npm run db:studio

**Architecture Decisions**
- Monorepo structure: client code in /client, server in /server, shared types in /shared
- SSR approach: Vite dev middleware transforms HTML in dev, static files in production
- Express middleware logs API requests with duration and response payload
- Global error handler catches and formats errors as JSON
- Relative imports in server code (tsx doesn't resolve tsconfig paths by default)

### External Dependencies

**UI & Styling**
- @radix-ui/* - Accessible, unstyled UI primitives (dialogs, dropdowns, tabs, etc.)
- tailwindcss - Utility-first CSS framework
- class-variance-authority - Type-safe component variants
- lucide-react - Icon library

**3D Graphics**
- three - Core 3D rendering library
- @react-three/fiber - React renderer for Three.js
- @react-three/drei - Helpers and abstractions for React Three Fiber

**Form & Data Management**
- react-hook-form - Performant form library
- @hookform/resolvers - Schema validation resolvers
- @tanstack/react-query - Async state management

**Development Tools**
- vite - Fast build tool and dev server
- typescript-eslint - TypeScript linting
- lovable-tagger - Component tagging for Lovable platform integration

**Database & Validation**
- Drizzle ORM - Type-safe PostgreSQL ORM with schema migrations
- drizzle-kit - Database migration tool and Drizzle Studio
- @neondatabase/serverless - Neon PostgreSQL driver for serverless environments
- drizzle-zod - Automatic Zod schema generation from Drizzle schemas
- Zod - Runtime type validation for API request bodies

**Database Schema**
- buildingDesigns table stores saved building configurations with:
  - Dimensions (width, length, height)
  - Colors (wall, roof, trim)
  - Roof configuration (style, pitch)
  - Lean-to configuration (enabled, width, side)
  - Timestamps (createdAt, updatedAt)

**Notable Absence**
- No authentication/authorization system
- No external service integrations (analytics, payments, etc.)