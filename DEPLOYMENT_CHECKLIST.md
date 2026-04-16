# Admin User Delete Fix - Deployment Checklist

**Fix Date:** 2026-01-09  
**Branch:** improvements/m11-ui-perfection  
**Status:** ✅ Ready for Deployment

---

## Pre-Deployment Steps

### 1. Review Changes
```bash
git diff server/storage.ts
git diff server/routes.ts
git diff client/src/pages/admin-users.tsx
```

### 2. Run Quality Gates
```bash
# TypeScript check
npm run check

# Build verification
npm run build

# E2E tests (requires running server)
npm run test:e2e
```

### 3. Manual Testing (Recommended)
1. Start dev server: `npm run dev`
2. Login as ADMIN: `admin@steelflow.com`
3. Navigate to `/admin/users`
4. Test scenarios:
   - Try to delete yourself → Should show "Cannot delete your own account"
   - Try to delete a user with assigned leads → Should show references + deactivate option
   - Create a new test user → Delete it → Should succeed

---

## Deployment

### Commit Changes
```bash
git add server/storage.ts
git add server/routes.ts
git add server/db.ts
git add client/src/pages/admin-users.tsx
git add package.json package-lock.json
git add playwright.config.ts
git add tests/e2e/admin-users-delete.spec.ts
git add docs/ADMIN_USERS_DELETE_EVIDENCE.md

git commit -m "fix: Admin user delete now returns proper error codes instead of 500

- Added reference counting across all tables (leads, deals, callbacks, etc)
- Implemented business rules: no self-delete, no last admin, no users with records
- Return 409 with actionable errors instead of generic 500
- Frontend shows reference counts and offers deactivate alternative
- Added 6 comprehensive E2E tests with Playwright
- Fixed delete modal title to show 'Delete User' during deletion
- Zero new TypeScript errors introduced

Fixes admin user deletion that was failing with 500 errors due to FK constraints.
Now returns proper 409 errors with reference counts and deactivate option.

Related: M11.2 UI Perfection milestone"
```

### Push to Repository
```bash
git push origin improvements/m11-ui-perfection
```

### Create Pull Request
- **Title:** Fix: Admin user delete - proper error handling and business rules
- **Description:** See docs/ADMIN_USERS_DELETE_EVIDENCE.md for full details
- **Labels:** bug, enhancement, admin-tools
- **Reviewers:** Assign appropriate team members

---

## Post-Deployment Verification

### 1. Smoke Test Production
- Login as admin
- Navigate to `/admin/users`
- Try deleting a user with references
- Verify 409 error displays with reference counts
- Verify "Deactivate User Instead" button appears

### 2. Monitor Logs
- Watch for any 500 errors related to user deletion
- Confirm 409 errors are being logged correctly

### 3. Database Check
```sql
-- Verify no orphaned records
SELECT COUNT(*) FROM leads WHERE assigned_to NOT IN (SELECT id FROM users);
SELECT COUNT(*) FROM crm_deals WHERE owner_id NOT IN (SELECT id FROM users);
```

---

## Rollback Plan (if needed)

### Revert Commit
```bash
git revert HEAD
git push origin improvements/m11-ui-perfection
```

### Or Cherry-Pick Previous Version
```bash
git log --oneline -10
git checkout <previous-commit-hash> -- server/storage.ts server/routes.ts client/src/pages/admin-users.tsx
git commit -m "revert: Rollback admin user delete changes"
```

---

## Documentation Links

- **Evidence Document:** `docs/ADMIN_USERS_DELETE_EVIDENCE.md`
- **Test Specification:** `tests/e2e/admin-users-delete.spec.ts`
- **Original Feature Doc:** `docs/ADMIN_USERS_EVIDENCE.md`

---

## Success Metrics

After deployment, track:
- ✅ Zero 500 errors for user deletion attempts
- ✅ 409 errors logged with proper error codes
- ✅ User deactivation rate when delete is blocked
- ✅ Successful deletion rate for unreferenced users

---

**Prepared by:** Rovo Dev  
**Date:** 2026-01-09
