# Navigation & Funnel Implementation Notes

## Canonical Routes

| Route | Behavior | Access |
|-------|----------|--------|
| `/dashboard` | Prefab Agent Dashboard (deterministic, same for all roles) | All authenticated |
| `/agent-dashboard` | Alias for `/dashboard` | All authenticated |
| `/manager-dashboard` | Manager Dashboard ("Today's Priority Deals") | MANAGER/ADMIN only; REPs redirect to `/dashboard` |
| `/pipeline` | Pipeline Kanban board | All authenticated |
| `/pipeline-funnel` | Pipeline Funnel view with live stats | All authenticated |
| `/my-leads` | REP's assigned leads (sales-dashboard.tsx) | All authenticated |
| `/sales/all-leads` | All leads (manager view) | MANAGER/ADMIN only |

## Legacy Redirects

### `/leads?...` Redirect

The legacy `/leads` route redirects to the role-appropriate leads page:

- **REP** → `/my-leads`
- **MANAGER/ADMIN** → `/sales/all-leads`

Query string and hash fragments are preserved:
```
/leads?stage=working_lead#section → /my-leads?stage=working_lead#section
```

If user is not authenticated:
```
/leads?stage=x → /login?next=/my-leads?stage=x
```

## Funnel Stats Endpoint

### Contract

```
GET /api/pipeline/stats?scope=global|my
Authorization: Required (JWT)
```

### Response

```json
{
  "working_lead": 42,
  "callbacks": 15,
  "sold_building": 8,
  "welcome_stage": 3,
  ...
}
```

### Behavior

- REP always receives `scope=my` (server enforces regardless of requested scope)
- MANAGER/ADMIN receives requested scope (default: `global`)
- Returns all canonical stage IDs initialized to `0` (stable keys for UI)

## Stage Normalization

### Canonical Stage IDs (defined in `shared/pipelineStages.ts`)

```
working_lead, callbacks, sold_building, welcome_stage, storage, carport,
building_preparation, building_finalization, pending_delivery_date,
permit_hold, red_iron_fabrication, cold_form_fabrication, concrete_hold,
carport_fabrication, delivered_red_iron, delivered_c_channel,
delivered_carport, new_parts_order, canceled
```

### Normalization Function (`client/src/lib/stage.ts`)

```ts
normalizeStageId(raw: string | null | undefined): StageId | null
```

Handles variations:
- `sold_buildings` → `sold_building` (canonical singular)
- `working-lead` → `working_lead`
- `Working Lead` → `working_lead`
- `new` → `working_lead` (legacy mapping)

### Hard Requirement

```
UI stage id strings == stats keys == URL ?stage= == server filter value
```

## React Query Invalidation

When lead stage or assignment changes, invalidate funnel stats using predicate:

```ts
queryClient.invalidateQueries({
  predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/pipeline/stats",
});
```

This catches all scope variants (`scope=global`, `scope=my`, etc.).

### Mutations That Invalidate Stats

| File | Mutation | Trigger |
|------|----------|---------|
| `agent-dashboard.tsx` | `claimLeadMutation` | Claim next lead |
| `pipeline.tsx` | `updateLeadMutation` | Drag/drop stage change |
| `sales-dashboard.tsx` | `assignMutation` | Lead assignment |
| `leads.tsx` | `assignMutation` | Lead assignment |
| `leads.tsx` | `handleBulkAssign` | Bulk assignment |

## E2E Test Specs Added

| Spec | Purpose |
|------|---------|
| `e2e/dashboard-routing.spec.ts` | Dashboard determinism, manager redirect |
| `e2e/sidebar-links.spec.ts` | Sidebar no-404 coverage (data-driven) |
| `e2e/nav-pipeline-dashboard.spec.ts` | Navigation structure tests |
| `e2e/funnel-stage-links.spec.ts` | Funnel stage deep linking |
| `e2e/funnel-stats-from-api.spec.ts` | Funnel UI matches API stats |
| `e2e/funnel-stage-filters-leads.spec.ts` | Stage click filters leads correctly |
| `e2e/screenshots.spec.ts` | Proof screenshots to artifacts/ |

## Proof Screenshots

Located in `artifacts/screens/`:
- `dashboard-agent.png` - Prefab Agent Dashboard
- `pipeline-funnel.png` - Funnel with live counts
- `manager-dashboard.png` - Today's Priority Deals
- `sidebar-navigation.png` - Sidebar IA

---

*Last updated: 2026-01-11*
