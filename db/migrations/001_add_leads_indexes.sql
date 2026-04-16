-- Add indexes for My Leads performance
-- These indexes optimize queries filtered by assignedTo and ordered by createdAt

-- Index for assigned leads query: WHERE assignedTo = ? ORDER BY createdAt DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to_created_at ON leads(assigned_to, created_at DESC, id DESC);

-- Index for salesRepId if used
CREATE INDEX IF NOT EXISTS idx_leads_sales_rep_created_at ON leads(sales_rep_id, created_at DESC, id DESC) WHERE sales_rep_id IS NOT NULL;

-- Index for all leads query (manager view): ORDER BY createdAt DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_leads_created_at_id ON leads(created_at DESC, id DESC);

-- Index for stage filtering (commonly used)
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage) WHERE stage IS NOT NULL;

-- Composite index for common filters
CREATE INDEX IF NOT EXISTS idx_leads_status_stage ON leads(status, stage) WHERE status IS NOT NULL AND stage IS NOT NULL;
