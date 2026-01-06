# M11 UI Perfection - Progress Tracker

**Branch:** `improvements/m11-ui-perfection`  
**Started:** 2026-01-06  
**Goal:** Make every major surface feel like one cohesive product with consistent UX patterns

---

## Baseline Status

### TypeScript Check Results
```
npm run check
```
**Status:** ❌ 13 pre-existing TypeScript errors (unrelated to M11 work)

**Errors:**
- `client/src/components/lead-card.tsx(57,11)`: Type 'unknown' not assignable to 'ReactNode'
- `client/src/components/lead-detail-sheet.tsx(185,52)`: onSave prop type mismatch
- `client/src/components/morning-brief-card.tsx(48,11)`: Type 'unknown' not assignable to 'ReactNode'
- `client/src/configurator/BuilderPage.tsx(1454,15)`: onTotalChange prop missing
- `client/src/configurator/LeanToConfig.tsx(649,27)`: connectedWalls implicit any[]
- `server/pricingEngine.ts(724)`: Export declaration conflicts (4 errors)
- `server/pricingRoutes.ts(234,48)`: Parameter 'lt' implicit any
- `server/routes.ts(4,25)`: Missing @types/pdfkit
- `server/routes.ts(1139,24)`: Parameter 'err' implicit any

**Action:** These errors existed before M11. Will not fix unless they block M11 work.

### Test Suite Results
```
npm test
```
**Status:** ❌ No test script defined in package.json

**Action:** Tests are not currently set up. Will proceed with manual testing per runbook.

---

## Page Inventory

### List Pages
1. **Leads List** (`/leads`) - `client/src/pages/leads.tsx`
2. **CRM Contacts List** (`/crm-contacts`) - `client/src/pages/crm-contacts.tsx`
3. **CRM Deals List** (`/crm-deals`) - `client/src/pages/crm-deals.tsx`
4. **Building Deals List** - ❌ **NOT FOUND** (no UI page exists yet)

### Detail Pages
1. **Lead Detail/Edit** (`/sales/leads/:id`) - `client/src/pages/lead-edit.tsx`
2. **Contact Detail** - ❌ **NOT FOUND** (no dedicated detail page, inline editing in list)
3. **CRM Deal Detail** (`/crm/deals/:id`) - `client/src/pages/crm-deal-detail.tsx`
4. **Building Deal Detail** - ❌ **NOT FOUND** (no UI page exists yet)

### Admin Pages
1. **Admin Dashboard** (`/admin`) - `client/src/pages/admin.tsx`
2. **Admin Users** (`/admin/users`) - `client/src/pages/admin-users.tsx`
3. **CRM Admin** (`/crm/admin`) - `client/src/pages/crm-admin.tsx` (includes pipeline stages)
4. **Imports Admin** - ❌ **NOT FOUND IN PAGES** (may be in crm-admin.tsx as tabs/sections)
5. **Dedupe Admin** - ❌ **NOT FOUND** (feature may not exist yet)
6. **Merge Batches Admin** - ❌ **NOT FOUND** (feature may not exist yet)

### Other Pages
- Dashboard (`/dashboard`) - `client/src/pages/dashboard.tsx`
- Sales Dashboard (`/sales-dashboard`) - `client/src/pages/sales-dashboard.tsx`
- Pipeline (`/pipeline`) - `client/src/pages/pipeline.tsx`
- Projects (`/projects`) - `client/src/pages/projects.tsx`
- Automation (`/automation`) - `client/src/pages/automation.tsx`
- Settings (`/settings`) - `client/src/pages/settings.tsx`
- Reports (`/crm-reports`) - `client/src/pages/crm-reports.tsx`

---

## UX Inconsistencies Found (Pre-M11)

### 1. **Page Headers - Inconsistent Layout**
| Page | Header Style | Actions Placement | Has Subtitle |
|------|--------------|-------------------|--------------|
| Leads | Icon + Title inline, Export button right | ✅ Right side | ❌ No |
| CRM Contacts | Title + Subtitle stacked | ❌ Mixed (search + buttons right) | ✅ Yes |
| CRM Deals | Title + Subtitle stacked | ❌ Mixed (tabs + buttons right) | ✅ Yes |
| Admin Dashboard | Title only | ❌ None | ❌ No |

**Issue:** No consistent pattern. Some have icons, some have subtitles, actions placement varies.

### 2. **Toolbars - Inconsistent Filter/Action Layout**
| Page | Search/Filter Position | Action Buttons | View Toggle |
|------|------------------------|----------------|-------------|
| Leads | Below header (full width filters) | Top right | ❌ No |
| CRM Contacts | Top right (inline with actions) | Top right | ❌ No |
| CRM Deals | Top right (inline with actions) | Top right | ✅ Kanban/Table tabs |

**Issue:** Filter placement inconsistent. Leads has dedicated filter row, others inline.

### 3. **Empty States - Missing or Inconsistent**
| Page | Has Empty State | Style | Has Action Button |
|------|-----------------|-------|-------------------|
| Leads | ⚠️ Implicit (shows empty table) | ❌ No custom empty | ❌ No |
| CRM Contacts | ⚠️ Implicit (shows empty table) | ❌ No custom empty | ❌ No |
| CRM Deals | ⚠️ Implicit (shows empty columns/table) | ❌ No custom empty | ❌ No |

**Issue:** No EmptyState component. Just shows empty tables which looks broken.

### 4. **Loading States - Inconsistent Skeleton Patterns**
| Page | Loading Style | Skeleton Count | Consistent |
|------|---------------|----------------|------------|
| Leads | ❌ No skeleton (React Query default) | N/A | ❌ No |
| CRM Contacts | ✅ Skeleton header + table | 2 items | ✅ Yes |
| CRM Deals | ✅ Skeleton header + cards | 4 items | ✅ Yes |

**Issue:** Leads page has no loading skeleton. Contacts/Deals do but inconsistent patterns.

### 5. **Detail Pages - Inconsistent Edit Flows**
| Page | Edit Mode | Save/Cancel Buttons | Success Toast | Error Handling |
|------|-----------|---------------------|---------------|----------------|
| Lead Detail | ✅ Inline edit mode | ⚠️ Custom layout | ✅ Yes | ✅ Yes |
| CRM Deal Detail | ✅ Dialog-based edit | ✅ Standard dialog buttons | ✅ Yes | ✅ Yes |
| Contact Detail | ❌ No detail page (inline only) | N/A | ✅ Yes | ✅ Yes |

**Issue:** Lead uses inline edit, Deal uses dialog. No consistent pattern.

### 6. **URL State Management - Missing on All Pages**
| Page | Filters in URL | Pagination in URL | Refresh Preserves State |
|------|----------------|-------------------|-------------------------|
| Leads | ❌ No | ❌ No | ❌ No |
| CRM Contacts | ❌ No | ❌ No | ❌ No |
| CRM Deals | ❌ No | ❌ No | ❌ No |

**Issue:** Refreshing page loses all filter state. Back button doesn't work as expected.

### 7. **Export Button Placement - Inconsistent**
| Page | Export Button Location | Icon | Label |
|------|------------------------|------|-------|
| Leads | Top right (separate from other actions) | ✅ Download | ✅ "Export" |
| CRM Contacts | Top right (inline with search/create) | ✅ Download | ✅ "Export" |
| CRM Deals | Top right (inline with view toggle/create) | ✅ Download | ✅ "Export" |

**Issue:** Placement varies - sometimes isolated, sometimes grouped with other actions.

### 8. **Table Row Interactions - Inconsistent Click Behavior**
| Page | Row Click Navigation | Button Click Behavior | Hover State |
|------|---------------------|----------------------|-------------|
| Leads | ✅ Navigates to detail | ⚠️ May propagate | ✅ Yes |
| CRM Contacts | ❌ No row click | ✅ Explicit edit/delete buttons | ⚠️ Unclear |
| CRM Deals (table) | ✅ Navigates to detail | ⚠️ Unknown | ✅ Yes |

**Issue:** Contacts has no row click, others do. Button propagation may be buggy.

### 9. **Action Button Visibility - No Access Control**
| Page | Manager-Only Actions | Role Check | Conditional Rendering |
|------|---------------------|------------|----------------------|
| Leads | ⚠️ Bulk assign (should be manager?) | ❌ No check | ❌ Visible to all |
| CRM Contacts | ⚠️ Delete (should be manager?) | ❌ No check | ❌ Visible to all |
| CRM Deals | ⚠️ Create/edit (unclear policy) | ❌ No check | ❌ Visible to all |

**Issue:** No `ManagerOnly` component. Role-based visibility not implemented in UI.

### 10. **Toasts - Inconsistent Messaging**
| Action | Success Message | Error Message | Duration |
|--------|-----------------|---------------|----------|
| Create Contact | "Contact created successfully" | "Failed to create contact" + description | Default |
| Update Lead | ⚠️ Custom messages vary | ⚠️ May not show error details | Default |
| Delete Deal | ⚠️ Varies by page | ⚠️ Inconsistent | Default |

**Issue:** No consistent toast message format. Some verbose, some terse.

---

## Component Inventory (Current State)

### UI Components (Shadcn-based)
- ✅ Button, Card, Input, Select, Dialog, Table, Badge, Skeleton, Tabs
- ✅ Toast system (via useToast hook)
- ❌ **Missing:** PageHeader, Toolbar, EmptyState, LoadState components

### Auth/Access Components
- ❌ **Missing:** `ManagerOnly` component for conditional rendering
- ❌ **Missing:** `useCurrentUser()` hook for role checks
- ❌ **Missing:** `hasManagerAccess(role)` utility

### Custom Components
- ✅ `lead-card.tsx` - Lead card component
- ✅ `lead-detail-sheet.tsx` - Lead detail sheet
- ✅ `morning-brief-card.tsx` - Dashboard widget
- ⚠️ Many inline/ad-hoc components without reusability

---

## M11 Milestones Checklist

- [x] **M11.0** - Branch + Baseline Snapshot ✅ (this document)
- [x] **M11.1** - Shared UI Primitives (PageHeader, Toolbar, EmptyState, LoadState, access utils) ✅
- [ ] **M11.2** - List Pages Polish (Leads, Contacts, Deals + URL state)
- [ ] **M11.3** - Detail Pages Polish (Lead, Contact, Deal + consistent edit flows)
- [ ] **M11.4** - Admin Imports UX Upgrade (if imports feature exists)
- [ ] **M11.5** - Admin Dedupe + Merge Batches UX (if features exist)
- [ ] **M11.6** - Final UI QA Pass + Smoke Checklist
- [ ] **M11.7** - Consolidation + PR

---

## Notes

### Missing Features (Not in Scope for M11)
- **Building Deals UI:** No list or detail pages exist yet (backend ready per M10)
- **Imports Admin:** Not found as separate page (may be integrated elsewhere or not built)
- **Dedupe Feature:** Not found in current codebase
- **Merge Batches:** Not found in current codebase

**Action:** M11.4 and M11.5 prompts will be adapted or skipped if features don't exist.

### Pre-existing Issues (Not Blocking M11)
- TypeScript errors in configurator and pricing components
- Missing @types/pdfkit dependency
- No test suite configured

---

## Progress Log

### 2026-01-06 - Baseline Created (M11.0)
- Created branch `improvements/m11-ui-perfection`
- Ran `npm run check`: 13 pre-existing TS errors
- Ran `npm test`: No test script
- Inventoried 18 pages across leads, CRM, admin, dashboards
- Identified 10 major UX inconsistency categories
- Confirmed 3 features don't exist yet (building deals UI, imports, dedupe/merge)

### 2026-01-06 - Shared UI Primitives Created (M11.1)
**Components Created:**
- ✅ `PageHeader.tsx` - Consistent page title, subtitle, icon, and actions layout
- ✅ `Toolbar.tsx` - Left/right slots for filters and actions
- ✅ `EmptyState.tsx` - Centered empty state with icon, title, description, action
- ✅ `LoadState.tsx` - Skeleton loader with header + 8 rows

**Access Utilities Created:**
- ✅ `access.ts` - `hasManagerAccess()`, `hasAdminAccess()`, `hasSalesAccess()` helpers
- ✅ `useCurrentUser.ts` - React Query hook for `/api/user` with 5min cache
- ✅ `ManagerOnly.tsx` - Conditional rendering component for manager-level actions

**Pages Updated (Proof of Pattern):**
- ✅ **Leads page** (`leads.tsx`):
  - Added `PageHeader` with icon and Export action
  - Added `LoadState` for loading skeleton
  - Added `EmptyState` for error state with retry button
  - Added `EmptyState` for no results with clear filters action
  - Improved: No more blank page while loading, better error handling

**TypeScript Status:**
- ✅ Before: 13 errors
- ✅ After: 13 errors (no new errors introduced)
- ✅ All new code passes type checking

**Next Step:** M11.2 - Apply primitives to all list pages + add URL state management
