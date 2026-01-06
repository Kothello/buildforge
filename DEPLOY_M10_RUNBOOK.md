# M10 CSV Export Feature - Deployment Runbook

**Feature:** CSV Export functionality for Leads, Contacts, CRM Deals, and Building Deals  
**Date:** 2026-01-06  
**Commits:** 508e18f (M10.1 & M10.2.1), 41e9e2e (M10.1.1), a19c514 (M10.3)

---

## Overview

This deployment adds CSV export functionality with streaming, access control, and audit logging:

- **Backend Routes:** `GET /api/exports/:entityType.csv` for lead, contact, crm_deal, building_deal
- **Frontend Buttons:** Export buttons on Leads, CRM Contacts, and CRM Deals pages
- **Access Control:** Role-based (ADMIN/MANAGER see all, REP sees owned records)
- **Audit Logging:** All exports logged to `audit_logs` table
- **Dependencies:** `csv-stringify` npm package

---

## Pre-Deployment Checklist

- [ ] **Review changes:** `git log --oneline 508e18f..a19c514`
- [ ] **Verify branch:** Ensure you're deploying from the correct branch (e.g., `main`)
- [ ] **Database backup:** Backup production database before running migrations
- [ ] **Dependencies installed:** Verify `csv-stringify` is in `package.json`
- [ ] **TypeScript compiled:** Run `npm run build` successfully
- [ ] **Tests passed:** Run `npm test` (if applicable)
- [ ] **Environment variables:** No new env vars required
- [ ] **Migration reviewed:** Review `migrations/0017_create_audit_logs.sql`

---

## Required Migrations

**Yes - Migration Required:**

```bash
# Migration file: migrations/0017_create_audit_logs.sql
# Creates audit_logs table with indexes
```

### Migration Content:
- Creates `audit_logs` table with fields: id, user_id, action, entity_type, entity_id, metadata, ip_address, user_agent, created_at
- Adds 5 indexes for query performance (user_id, action, entity_type, created_at, composite user+action)

### Migration Command:
```bash
# If using Drizzle Kit:
npm run db:migrate

# Or if using custom migration runner:
psql $DATABASE_URL -f migrations/0017_create_audit_logs.sql

# Or if using node-pg-migrate:
npm run migrate up
```

---

## Deployment Steps

### 1. Install Dependencies
```bash
npm install
# Ensures csv-stringify is installed
```

### 2. Run Database Migration
```bash
npm run db:migrate
# Or manually: psql $DATABASE_URL -f migrations/0017_create_audit_logs.sql
```

### 3. Build Application
```bash
npm run build
```

### 4. Deploy Backend
```bash
# For PM2:
pm2 reload ecosystem.config.js

# For Docker:
docker-compose up -d --build

# For Render/Heroku:
git push render main
# (or use deploy webhook)
```

### 5. Deploy Frontend (if separate)
```bash
# If frontend is separate build:
npm run build:client
# Deploy to CDN/static hosting
```

### 6. Restart Application
```bash
# Ensure clean restart to load new routes
pm2 restart all
# or
systemctl restart your-app
```

---

## Post-Deployment Verification

### Quick Health Check (2 minutes)
```bash
# 1. Verify app is running
curl https://your-domain.com/api/health

# 2. Check migration applied
psql $DATABASE_URL -c "SELECT COUNT(*) FROM audit_logs;"
# Expected: Should return 0 (table exists, no errors)
```

### Export Functionality Tests (5-10 minutes)

#### Test 1: Lead Export (as ADMIN)
```bash
# Login as ADMIN user and get auth token
TOKEN="your-jwt-token"

# Export all leads
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-domain.com/api/exports/lead.csv?limit=10000" \
  -o leads_export.csv

# Verify:
# - HTTP 200 status
# - Content-Type: text/csv
# - File downloads with .csv extension
# - CSV has header row
# - At least 1 data row (if leads exist)
```

**Expected Output:**
```csv
ID,Name,Email,Phone,Company,Status,Source,Owner ID,Created At,Updated At
lead-123,John Doe,john@example.com,555-1234,Acme Corp,new,website,user-456,2025-12-01T10:00:00Z,2025-12-15T14:30:00Z
```

#### Test 2: Contact Export with Search Filter
```bash
# Export contacts matching search query
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-domain.com/api/exports/contact.csv?q=john&limit=10000" \
  -o contacts_filtered.csv

# Verify filtered results contain "john" in name/email
```

#### Test 3: CRM Deal Export (as REP - limited access)
```bash
# Login as REP user
REP_TOKEN="rep-jwt-token"

# Export deals (should only see owned deals)
curl -H "Authorization: Bearer $REP_TOKEN" \
  "https://your-domain.com/api/exports/crm_deal.csv?limit=10000" \
  -o deals_rep.csv

# Verify:
# - Only deals owned by this REP user appear
# - Other users' deals are NOT included
```

#### Test 4: Building Deal Export (if applicable)
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-domain.com/api/exports/building_deal.csv?limit=10000" \
  -o building_deals.csv

# Note: No UI page exists yet, but API endpoint works
```

### Access Control Tests

#### Test 5: ADMIN sees all records
```bash
# As ADMIN, export leads
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://your-domain.com/api/exports/lead.csv" \
  -o admin_leads.csv

# Count rows: should include ALL leads in system
wc -l admin_leads.csv
```

#### Test 6: REP sees only owned records
```bash
# As REP, export leads
curl -H "Authorization: Bearer $REP_TOKEN" \
  "https://your-domain.com/api/exports/lead.csv" \
  -o rep_leads.csv

# Count rows: should only include leads where ownerId = REP's user ID
wc -l rep_leads.csv
# Should be <= admin count
```

#### Test 7: Unauthenticated request fails
```bash
# Without token
curl "https://your-domain.com/api/exports/lead.csv"
# Expected: HTTP 401 Unauthorized
```

### Audit Logging Tests

#### Test 8: Verify audit log entry created
```bash
# After any export, check audit_logs table
psql $DATABASE_URL -c "
  SELECT action, entity_type, metadata->>'count' as count, created_at 
  FROM audit_logs 
  WHERE action = 'export.csv' 
  ORDER BY created_at DESC 
  LIMIT 5;
"
```

**Expected Output:**
```
 action     | entity_type | count | created_at
------------+-------------+-------+-------------------------
 export.csv | lead        | 42    | 2026-01-06 12:34:56
 export.csv | contact     | 15    | 2026-01-06 12:30:12
```

#### Test 9: Audit metadata includes filters
```bash
# Export with filters
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-domain.com/api/exports/lead.csv?q=test&status=new" \
  -o filtered_export.csv

# Check audit log metadata
psql $DATABASE_URL -c "
  SELECT metadata 
  FROM audit_logs 
  WHERE action = 'export.csv' 
  ORDER BY created_at DESC 
  LIMIT 1;
"
# Expected: {"entityType":"lead","count":5,"limit":10000,"q":"test","status":"new"}
```

### Frontend UI Tests (Manual - in Browser)

#### Test 10: Export button on Leads page
1. Navigate to `/leads`
2. Click **Export** button (top right, Download icon)
3. Verify CSV downloads with filename: `lead_export_YYYY-MM-DD.csv`
4. Open CSV in spreadsheet - verify data is correct

#### Test 11: Export button on CRM Contacts page
1. Navigate to `/crm-contacts`
2. Enter search query (e.g., "john")
3. Click **Export** button
4. Verify downloaded CSV only contains filtered results

#### Test 12: Export button on CRM Deals page
1. Navigate to `/crm-deals`
2. Click **Export** button
3. Verify all visible deals are exported

### Performance Tests

#### Test 13: Large export (stress test)
```bash
# Export with max limit
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-domain.com/api/exports/lead.csv?limit=10000" \
  -o large_export.csv

# Verify:
# - Request completes in < 30 seconds (for 10k records)
# - Memory usage doesn't spike (streaming prevents this)
# - File downloads completely without corruption
```

---

## Troubleshooting

### Problem: CSV file is empty or has only headers

**Symptoms:**
- HTTP 200 response
- CSV downloads but has 0 data rows

**Causes & Solutions:**

1. **No records match filters**
   ```bash
   # Check database for records
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM leads;"
   ```
   - If 0 records exist, this is expected behavior
   - Try exporting without filters: `?limit=10000`

2. **Access control filtering out all records**
   ```bash
   # As REP user, check owned records
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM leads WHERE owner_id = 'rep-user-id';"
   ```
   - REPs only see owned records - may legitimately be 0
   - Test as ADMIN to see all records

3. **Streaming error mid-export**
   - Check server logs for errors during CSV generation
   - Verify `csv-stringify` package installed correctly

---

### Problem: 403 Forbidden error

**Symptoms:**
- HTTP 403 response
- Message: "Forbidden"

**Causes & Solutions:**

1. **User role not authorized**
   ```bash
   # Check user role
   psql $DATABASE_URL -c "SELECT id, email, role FROM users WHERE email = 'user@example.com';"
   ```
   - Only ADMIN, MANAGER, REP roles can export
   - Other roles (e.g., "VIEWER") will get 403

2. **Missing or invalid JWT token**
   ```bash
   # Verify token is valid
   curl -H "Authorization: Bearer $TOKEN" https://your-domain.com/api/user
   ```
   - If this also returns 403, token is invalid/expired

---

### Problem: 500 Internal Server Error

**Symptoms:**
- HTTP 500 response
- Export fails completely

**Causes & Solutions:**

1. **Database connection error**
   ```bash
   # Check database connectivity
   psql $DATABASE_URL -c "SELECT 1;"
   ```
   - Verify DATABASE_URL env var is correct
   - Check database server is running

2. **Missing audit_logs table**
   ```bash
   # Check if migration ran
   psql $DATABASE_URL -c "\d audit_logs"
   ```
   - If table doesn't exist, run migration: `npm run db:migrate`

3. **csv-stringify package missing**
   ```bash
   npm list csv-stringify
   ```
   - If not found: `npm install csv-stringify`

4. **Check server logs**
   ```bash
   # PM2 logs
   pm2 logs your-app --lines 50

   # Or Docker logs
   docker logs your-container --tail 50
   ```
   - Look for stack traces with "[export-csv]" prefix

---

### Problem: Timeout on large exports

**Symptoms:**
- Request times out after 30-60 seconds
- Only happens with `limit=10000` or large datasets

**Causes & Solutions:**

1. **Reverse proxy timeout too low**
   ```nginx
   # Increase nginx timeout
   proxy_read_timeout 300s;
   proxy_connect_timeout 300s;
   ```

2. **Database query slow**
   ```bash
   # Check query performance
   psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM leads LIMIT 10000;"
   ```
   - Add indexes if query is slow (owner_id, created_at, etc.)

3. **Network bandwidth limited**
   - Reduce limit: `?limit=5000`
   - Export in smaller batches

---

### Problem: Audit log not created

**Symptoms:**
- Export succeeds, but no entry in audit_logs table

**Causes & Solutions:**

1. **Audit logging failure (non-blocking)**
   - Check server logs for: `[export-csv] Audit logging failed:`
   - Export still succeeds (best-effort logging)

2. **Database permission issue**
   ```bash
   # Check if app user can INSERT into audit_logs
   psql $DATABASE_URL -c "INSERT INTO audit_logs (id, action, created_at) VALUES ('test-123', 'test', NOW());"
   ```

---

## Rollback Procedure

If critical issues occur post-deployment:

### 1. Quick Rollback (disable feature)
```bash
# Revert to previous commit
git revert a19c514 41e9e2e 508e18f
npm run build
pm2 reload all
```

### 2. Database Rollback (optional)
```sql
-- Only if audit_logs table causes issues
DROP TABLE IF EXISTS audit_logs CASCADE;
```

**Note:** Dropping audit_logs is safe - no foreign keys depend on it (user_id has ON DELETE SET NULL).

### 3. Frontend-only rollback
If backend works but frontend has issues:
- Deploy previous frontend build
- Backend export API remains functional

---

## Monitoring & Alerts

### Key Metrics to Watch

1. **Export request rate**
   - Monitor `/api/exports/*` endpoint usage
   - Alert if sudden spike (potential abuse/data exfiltration)

2. **Export response time**
   - P95 should be < 10s for typical datasets
   - Alert if > 30s consistently

3. **Audit log growth**
   ```sql
   SELECT COUNT(*), DATE(created_at) 
   FROM audit_logs 
   WHERE action = 'export.csv' 
   GROUP BY DATE(created_at);
   ```
   - Normal: 10-50 exports/day
   - Alert if > 500/day (investigate if legitimate)

4. **CSV file sizes**
   - Typical: 100KB - 5MB
   - Alert if > 50MB (very large exports)

---

## Success Criteria

Deployment is successful when:

- [ ] All 4 entity types export successfully (lead, contact, crm_deal, building_deal)
- [ ] Access control verified (ADMIN sees all, REP sees owned only)
- [ ] Audit logs created for each export
- [ ] Frontend Export buttons work on all 3 pages (Leads, Contacts, Deals)
- [ ] CSV files download with proper filenames and content
- [ ] No 500 errors in production logs
- [ ] Database migration applied without errors
- [ ] Performance acceptable (< 10s for typical exports)

---

## Support Contacts

- **On-call Engineer:** [Your Contact]
- **Database Admin:** [DBA Contact]
- **Product Owner:** [PO Contact]

---

## Additional Notes

- **Building Deals:** Export API ready, but no UI page exists yet (future work)
- **Contact Access Control:** Currently no auth on `/api/contacts` - exports match this behavior (all users see all contacts)
- **Future Enhancements:** Consider adding scheduled exports, email delivery, or webhook notifications

---

## Post-Deployment Cleanup

After 1 week of stable operation:

- [ ] Remove temporary debug logging (if any)
- [ ] Archive old audit logs (if retention policy exists)
- [ ] Update documentation with real-world usage patterns
- [ ] Consider adding export rate limiting if needed

---

**End of Runbook**
