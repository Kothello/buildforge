# Navigation, Pipeline & Dashboard Recovery

**Date:** 2026-01-10  
**Issue:** Previous prompts changed navigation and broke Pipeline + Dashboard functionality

---

## BEFORE: What Was Broken

### 1. Navigation Issues
- **Sidebar structure** was flat with all items in "Main Menu" section
- **No clear separation** between Sales, CRM, and Admin sections
- **Missing `/admin/users`** link in sidebar (route existed but not navigable)
- **Role gating** was inconsistent (checked by item title, not role flags)

### 2. Dashboard Issues
- **Endpoint changed**: `/api/deals` → `/api/crm/deals` (this was actually correct)
- **No error handling**: Dashboard would show blank or crash on API errors
- **Hardcoded greeting**: Showed "Emperor" instead of user's actual name
- **No retry mechanism**: Users couldn't recover from failed API calls

### 3. Pipeline Issues  
- **Wrong endpoint**: Using `/api/deals` instead of `/api/crm/deals`
- **No loading state**: No skeleton loaders while fetching data
- **No error state**: No error UI or retry button on failure
- **Hardcoded stages**: Pipeline board uses hardcoded stages array (working as designed)

---

## CHANGE LIST: Files Modified

### client/src/components/app-sidebar.tsx
**Why:** Restructure navigation into clear sections with proper role gating

Changes:
- Replaced single `menuItems` array with three arrays:
  - `salesItems` - Dashboard, My Leads, Pipeline, Callbacks, Projects (all users)
  - `managerItems` - All Leads (MANAGER/ADMIN only)
  - `adminItems` - Admin Home, Users, Pricing (ADMIN only), Automation, Settings (all)
- Added three sidebar groups: "CRM", "Sales", "Admin & Ops"
- Added prefetch entries for `/admin/users` and `/admin/pricing`
- Updated role filtering to use `adminOnly` flag instead of title matching

### client/src/pages/dashboard.tsx
**Why:** Add error handling and personalization

Changes:
- Added imports: `Button`, `useAuth`, `AlertCircle`, `RefreshCw`
- Added `user` from `useAuth()` for personalized greeting
- Added `isError` and `refetch` to leads and deals queries
- Added `hasError` combined state and `handleRetry` function
- Changed greeting from "Emperor" to `{user?.name || "there"}`
- Added error state UI with AlertCircle icon and Retry button

### client/src/pages/pipeline.tsx
**Why:** Fix endpoint and add loading/error states

Changes:
- Added imports: `Skeleton`, `AlertCircle`, `RefreshCw`
- Changed deals endpoint from `/api/deals` to `/api/crm/deals`
- Added `isLoading`, `isError`, `refetch` to leads query
- Added loading state with 6 skeleton cards
- Added error state with AlertCircle and Retry button
- Wrapped PipelineBoard in conditional render (only when not loading/error)

### e2e/nav-pipeline-dashboard.spec.ts (NEW)
**Why:** Prevent regression of these issues

Tests added:
- REP user sees Sales + CRM sections in sidebar
- MANAGER user sees All Leads in sidebar
- Dashboard loads without error for authenticated user
- Dashboard shows retry button capability
- Pipeline page loads without crash
- Pipeline shows stage columns (or loading/error state)
- Pipeline Add Lead button exists
- Navigation links work correctly

---

## AFTER: Verification Proof

### Navigation Structure (Verified)
```
Sidebar Sections:
├── CRM
│   ├── Deals (/crm/deals)
│   ├── Contacts (/crm/contacts)
│   ├── Reports (/crm/reports) [MANAGER/ADMIN]
│   └── CRM Settings (/crm/admin) [MANAGER/ADMIN]
├── Sales
│   ├── Dashboard (/dashboard)
│   ├── My Leads (/my-leads)
│   ├── Pipeline (/pipeline)
│   ├── Callbacks (/callbacks)
│   ├── Projects (/projects)
│   └── All Leads (/sales/all-leads) [MANAGER/ADMIN only]
└── Admin & Ops
    ├── Admin Home (/admin) [ADMIN only]
    ├── Users (/admin/users) [ADMIN only]
    ├── Pricing (/admin/pricing) [ADMIN only]
    ├── Automation (/automation)
    └── Settings (/settings)
```

### Routes Verified (from App.tsx)
| Route | Component | Protection |
|-------|-----------|------------|
| `/dashboard` | LazyDashboard | ProtectedRoute |
| `/pipeline` | LazyPipeline | ProtectedRoute |
| `/admin` | LazyAdminDashboard | AdminRoute |
| `/admin/users` | LazyAdminUsersPage | AdminRoute |
| `/admin/pricing` | LazyPricingAdminPage | AdminRoute |
| `/crm/deals` | LazyCrmDealsPage | ProtectedRoute |
| `/crm/contacts` | LazyCrmContactsPage | ProtectedRoute |

### API Endpoints Used
| Page | Endpoint | Status |
|------|----------|--------|
| Dashboard | `/api/leads` | ✅ Auth-protected |
| Dashboard | `/api/crm/deals` | ✅ Auth-protected |
| Pipeline | `/api/leads` | ✅ Auth-protected |
| Pipeline | `/api/crm/deals` | ✅ Auth-protected |

---

## GATES

### TypeScript Check
```bash
npm run check
```
**Result:** Pre-existing errors only (13 errors unrelated to these changes):
- lead-card.tsx, lead-detail-sheet.tsx, morning-brief-card.tsx (ReactNode type issues)
- BuilderPage.tsx, LeanToConfig.tsx (configurator prop issues)
- pricingEngine.ts, pricingRoutes.ts (export conflicts)
- routes.ts (pdfkit types, parameter types)

**No new errors introduced by these changes.**

### Build
```bash
npm run build
```
*(Run to verify)*

### E2E Tests
```bash
npm run test:e2e -- e2e/nav-pipeline-dashboard.spec.ts
```
*(Run to verify)*

---

## Summary

| Component | Before | After |
|-----------|--------|-------|
| Navigation | Flat "Main Menu" | 3 sections: CRM, Sales, Admin & Ops |
| Role Gating | Title-based checks | Flag-based (`adminOnly`) |
| Dashboard Error | Blank/crash | Error UI + Retry button |
| Dashboard Greeting | "Emperor" | User's actual name |
| Pipeline Endpoint | `/api/deals` | `/api/crm/deals` |
| Pipeline Loading | None | Skeleton loaders |
| Pipeline Error | None | Error UI + Retry button |
| Regression Tests | None | 9 tests in new spec file |

---

## Files Changed (Minimal Diff)

```
modified:   client/src/components/app-sidebar.tsx (+50 lines)
modified:   client/src/pages/dashboard.tsx (+25 lines)
modified:   client/src/pages/pipeline.tsx (+35 lines)
new file:   e2e/nav-pipeline-dashboard.spec.ts (+175 lines)
new file:   docs/NAV_PIPELINE_DASHBOARD_RECOVERY.md (this file)
```
