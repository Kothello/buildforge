# Fix: Dashboard & Pipeline `leads.filter is not a function` Crashes

**Date:** 2026-01-10  
**Issue:** Runtime crashes on `/dashboard` and `/pipeline` with error: `leads.filter is not a function`

---

## Root Cause

The crash occurred because:

1. **No `res.ok` check before parsing JSON** - When the API returns an error (401/403/500), the fetch still calls `res.json()`, which returns an error object like `{ error: "Unauthorized" }` instead of an array.

2. **React Query passes error objects as "data"** - Without throwing on bad responses, React Query treats the error JSON as successful data and passes it to the component.

3. **Components assume arrays** - Both `dashboard.tsx` and `pipeline-board.tsx` call `.filter()` on leads without checking if it's actually an array.

**Example failure flow:**
```
fetch("/api/leads") → 401 Unauthorized → { error: "..." } → leads = errorObject → leads.filter() → CRASH
```

---

## Solution: Defense in Depth

### 1. Created `normalizeArray` Helper

**File:** `client/src/lib/normalize.ts`

```typescript
export function normalizeArray<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response;
  if (response?.leads) return response.leads;  // { leads: [] }
  if (response?.data) return response.data;    // { data: [] }
  if (response?.items) return response.items;  // { items: [] }
  return [];  // Fallback: never crash
}

export async function extractErrorMessage(response: Response): Promise<string> {
  // Best-effort error message extraction
}
```

### 2. Safe Fetching with Error Throwing

**Files:** `dashboard.tsx`, `pipeline.tsx`

```typescript
const { data: leads = [] } = useQuery<Lead[]>({
  queryKey: ["/api/leads"],
  queryFn: async () => {
    const res = await fetch("/api/leads", { credentials: "include" });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res));  // ← Triggers error state
    }
    const data = await res.json();
    return normalizeArray<Lead>(data);  // ← Ensures array
  },
});
```

### 3. Crash-Proof PipelineBoard Component

**File:** `pipeline-board.tsx`

```typescript
export function PipelineBoard({ leads: rawLeads, ... }: PipelineBoardProps) {
  // Normalize on entry - prevents .filter/.map crashes even if parent passes bad data
  const leads = normalizeArray<Lead>(rawLeads);
  // ...
}
```

---

## Files Changed

| File | Change |
|------|--------|
| `client/src/lib/normalize.ts` | **NEW** - `normalizeArray()` and `extractErrorMessage()` utilities |
| `client/src/pages/dashboard.tsx` | Added safe queryFn with `res.ok` check and `normalizeArray()` |
| `client/src/pages/pipeline.tsx` | Added safe queryFn with `res.ok` check and `normalizeArray()` |
| `client/src/components/pipeline-board.tsx` | Added `normalizeArray()` on props entry |

---

## Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| API returns 401 | Red overlay crash | Error state with "Retry" button |
| API returns `{ leads: [] }` | Crash | Works (normalized to array) |
| API returns `{ error: "..." }` | Crash | Error state (thrown in queryFn) |
| API returns `[]` | Works | Works |

---

## Verification

```bash
npm run build  # ✓ Passes

# Manual test:
1. Login → Navigate to Dashboard → Should load without crash
2. Login → Navigate to Pipeline → Should load without crash
3. If auth expires, shows error state instead of crashing
```

---

## Lead Builder (Goal B) - Already Restored

The Sales Rep Lead Builder flow was already in place:

- **Sidebar:** "Lead Builder" → `/sales/lead-builder` (under Sales section)
- **Route:** `/sales/lead-builder` → `<ProtectedRoute><LazyBuilderPage mode="crm" /></ProtectedRoute>`
- **Submission:** CRM mode posts to `/api/leads` with `source: "crm_builder"`
- **Backend:** Forces `assignedTo` and `salesRepId` to `req.user.id` when `source === "crm_builder"`
- **Public builder:** `/builder` remains available unauthenticated

---

## Additional Fixes (Route Drift)

### `/users` Redirect Added
- Route `/users` now redirects to `/admin/users`
- Prevents 404 for users who bookmarked the old URL

---

## Verification Checklist

| Test | Expected Result | Route/Endpoint |
|------|-----------------|----------------|
| Click Lead Builder as REP | Opens `/sales/lead-builder` | Sidebar → `/sales/lead-builder` |
| Submit lead from CRM builder | POST `/api/leads` returns 200/201, redirects to `/sales/leads/:id` | `POST /api/leads` with `source: "crm_builder"` |
| Open `/dashboard` | Loads without crash, shows greeting | `/dashboard` |
| Open `/pipeline` | Loads without crash, shows stage columns | `/pipeline` |
| Click Callbacks | Loads crash-proof calendar | `/callbacks` → `callback-calendar.tsx` |
| Open `/admin/users` | Admin users page loads | `/admin/users` |
| Open `/users` | Redirects to `/admin/users` | `/users` → `/admin/users` |
| Open `/admin/pricing` | Pricing rules load (or 403 if not admin) | `/admin/pricing` |
| Public `/builder` | Works unauthenticated, creates unassigned leads | `/builder` → `/api/public/intake` |

### Network Call Verification (DevTools)

**CRM Lead Builder Submit:**
```
POST /api/leads
Request Body: { ..., "source": "crm_builder" }
Response: 200/201 { "id": <leadId>, "assignedTo": <userId>, "salesRepId": <userId>, ... }
```

**Dashboard/Pipeline Leads:**
```
GET /api/leads (with credentials)
Response: 200 [...leads array...]
```

**If auth fails (401/403):**
- UI shows error state with "Retry" button
- No red crash overlay
