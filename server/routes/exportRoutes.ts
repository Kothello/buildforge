/**
 * CSV Export Routes (M10.1)
 * Provides streaming CSV exports for entities with access control
 */

import { Router } from "express";
import { storage } from "../storage";
import { authMiddleware, type AuthenticatedRequest } from "../auth";
import { stringify } from "csv-stringify";

const router = Router();

type EntityType = "lead" | "contact" | "crm_deal" | "building_deal";

/**
 * GET /api/exports/:entityType.csv
 * Stream CSV export with access control and filtering
 */
router.get("/:entityType.csv", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const entityType = req.params.entityType as EntityType;

    // Validate entity type
    if (!["lead", "contact", "crm_deal", "building_deal"].includes(entityType)) {
      return res.status(400).json({ error: "Invalid entity type" });
    }

    // Parse query params
    const q = (req.query.q as string) || "";
    const limitParam = parseInt(req.query.limit as string) || 10000;
    const limit = Math.min(limitParam, 10000); // Enforce max 10k

    // Entity-specific filters
    const status = req.query.status as string;
    const pipeline = req.query.pipeline as string;

    // Set CSV response headers
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `${entityType}_export_${timestamp}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Create CSV stringifier
    const stringifier = stringify({
      header: true,
      columns: getColumnsForEntity(entityType),
    });

    // Pipe stringifier to response
    stringifier.pipe(res);

    // Fetch and stream records in chunks
    const CHUNK_SIZE = 500;
    let offset = 0;
    let hasMore = true;
    let totalExported = 0;

    while (hasMore && totalExported < limit) {
      const chunkLimit = Math.min(CHUNK_SIZE, limit - totalExported);
      
      // Fetch records based on entity type
      let records: any[] = [];

      if (entityType === "lead") {
        records = await fetchLeads(user, { q, status, limit: chunkLimit, offset });
      } else if (entityType === "contact") {
        records = await fetchContacts(user, { q, limit: chunkLimit, offset });
      } else if (entityType === "crm_deal") {
        records = await fetchCrmDeals(user, { q, status, pipeline, limit: chunkLimit, offset });
      } else if (entityType === "building_deal") {
        records = await fetchBuildingDeals(user, { q, status, limit: chunkLimit, offset });
      }

      // Write records to CSV stream
      for (const record of records) {
        const row = flattenRecordForCSV(record, entityType);
        stringifier.write(row);
      }

      totalExported += records.length;
      offset += CHUNK_SIZE;
      hasMore = records.length === chunkLimit;
    }

    // End the stream
    stringifier.end();

    console.log(`[export-csv] Exported ${totalExported} ${entityType} records for user ${user.id}`);

    // Best-effort audit logging (don't fail the export if audit fails)
    try {
      const metadata: Record<string, any> = { 
        entityType,
        count: totalExported,
        limit 
      };
      if (q) metadata.q = q;
      if (status) metadata.status = status;
      if (pipeline) metadata.pipeline = pipeline;

      await storage.createAuditLog({
        userId: user.id,
        action: "export.csv",
        entityType,
        metadata,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
      });
    } catch (auditError: any) {
      console.error("[export-csv] Audit logging failed:", auditError.message);
      // Continue - export already succeeded
    }
  } catch (error: any) {
    console.error("[export-csv] Error:", error);
    
    // Check if headers already sent
    if (!res.headersSent) {
      res.status(500).json({ error: "Export failed" });
    } else {
      // Stream already started, just end it
      res.end();
    }
  }
});

/**
 * Define CSV columns for each entity type
 */
function getColumnsForEntity(entityType: EntityType): Record<string, string> {
  const commonCols = {
    id: "ID",
    createdAt: "Created At",
    updatedAt: "Updated At",
  };

  if (entityType === "lead") {
    return {
      ...commonCols,
      name: "Name",
      email: "Email",
      phone: "Phone",
      company: "Company",
      status: "Status",
      source: "Source",
      ownerId: "Owner ID",
    };
  } else if (entityType === "contact") {
    return {
      ...commonCols,
      name: "Name",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      phone: "Phone",
      company: "Company",
      title: "Title",
      ownerId: "Owner ID",
    };
  } else if (entityType === "crm_deal") {
    return {
      ...commonCols,
      title: "Title",
      value: "Value",
      currency: "Currency",
      stage: "Stage",
      pipeline: "Pipeline",
      probability: "Probability",
      expectedCloseDate: "Expected Close Date",
      contactId: "Contact ID",
      leadId: "Lead ID",
      ownerId: "Owner ID",
    };
  } else if (entityType === "building_deal") {
    return {
      ...commonCols,
      projectName: "Project Name",
      status: "Status",
      totalValue: "Total Value",
      leadId: "Lead ID",
      contactId: "Contact ID",
      ownerId: "Owner ID",
    };
  }

  return commonCols;
}

/**
 * Flatten a record for CSV output, including custom fields as cf_* columns
 */
function flattenRecordForCSV(record: any, entityType: EntityType): Record<string, any> {
  const flat: Record<string, any> = {};
  const columns = getColumnsForEntity(entityType);

  // Add standard columns
  for (const key of Object.keys(columns)) {
    flat[key] = record[key] ?? "";
  }

  // Flatten custom fields as cf_<key>
  if (record.customFields && typeof record.customFields === "object") {
    for (const [key, value] of Object.entries(record.customFields)) {
      flat[`cf_${key}`] = value ?? "";
    }
  }

  // Format timestamps
  if (flat.createdAt) {
    flat.createdAt = new Date(flat.createdAt).toISOString();
  }
  if (flat.updatedAt) {
    flat.updatedAt = new Date(flat.updatedAt).toISOString();
  }
  if (flat.expectedCloseDate) {
    flat.expectedCloseDate = new Date(flat.expectedCloseDate).toISOString();
  }

  return flat;
}

/**
 * Fetch leads with access control
 * Access: ADMIN/MANAGER see all, REP sees only owned
 */
async function fetchLeads(user: any, filters: { q: string; status?: string; limit: number; offset: number }) {
  const isAdminOrManager = user.role === "ADMIN" || user.role === "MANAGER";
  
  // Fetch leads with role-based access control
  let allLeads: any[];
  if (isAdminOrManager) {
    allLeads = await storage.getLeads();
  } else if (user.role === "REP") {
    allLeads = await storage.getLeads(user.id);
  } else {
    allLeads = [];
  }
  
  // Apply status filter
  if (filters.status) {
    allLeads = allLeads.filter((l: any) => l.status === filters.status);
  }
  
  // Apply search filter
  if (filters.q) {
    const search = filters.q.toLowerCase();
    allLeads = allLeads.filter((l: any) => 
      l.name?.toLowerCase().includes(search) ||
      l.email?.toLowerCase().includes(search) ||
      l.company?.toLowerCase().includes(search)
    );
  }
  
  // Apply pagination
  const start = filters.offset;
  const end = start + filters.limit;
  return allLeads.slice(start, end);
}

/**
 * Fetch contacts with access control
 * Note: Current app has no auth on /api/contacts - returns all contacts to everyone
 * Applying same behavior for exports (all users can export all contacts)
 */
async function fetchContacts(user: any, filters: { q: string; limit: number; offset: number }) {
  // Fetch all contacts (matches current /api/contacts endpoint behavior)
  const search = filters.q || undefined;
  let allContacts = await storage.getContacts(search);
  
  // Apply pagination
  const start = filters.offset;
  const end = start + filters.limit;
  return allContacts.slice(start, end);
}

/**
 * Fetch CRM deals with access control
 * Note: Current app has no auth on /api/crm/deals - returns all deals to everyone
 * Applying same behavior for exports (all users can export all deals)
 */
async function fetchCrmDeals(user: any, filters: { q: string; status?: string; pipeline?: string; limit: number; offset: number }) {
  // Fetch CRM deals (matches current /api/crm/deals endpoint behavior)
  let allDeals = await storage.getCrmDeals({ 
    stageId: filters.status
  });
  
  // Apply pipeline filter (if provided)
  if (filters.pipeline) {
    allDeals = allDeals.filter((d: any) => d.pipeline === filters.pipeline);
  }
  
  // Apply search filter
  if (filters.q) {
    const search = filters.q.toLowerCase();
    allDeals = allDeals.filter((d: any) => 
      d.title?.toLowerCase().includes(search)
    );
  }
  
  // Apply pagination
  const start = filters.offset;
  const end = start + filters.limit;
  return allDeals.slice(start, end);
}

/**
 * Fetch building deals with access control
 * Note: No frontend page exists yet, assuming same pattern as leads
 * Access: ADMIN/MANAGER see all, REP sees only owned
 */
async function fetchBuildingDeals(user: any, filters: { q: string; status?: string; limit: number; offset: number }) {
  const isAdminOrManager = user.role === "ADMIN" || user.role === "MANAGER";
  
  // Fetch building deals with role-based access control
  let allDeals = await storage.getDeals();
  
  // Filter by ownership if not admin/manager
  if (!isAdminOrManager && user.role === "REP") {
    allDeals = allDeals.filter((d: any) => d.ownerId === user.id);
  } else if (!isAdminOrManager) {
    allDeals = [];
  }
  
  // Apply status filter
  if (filters.status) {
    allDeals = allDeals.filter((d: any) => d.status === filters.status);
  }
  
  // Apply search filter
  if (filters.q) {
    const search = filters.q.toLowerCase();
    allDeals = allDeals.filter((d: any) => 
      d.projectName?.toLowerCase().includes(search)
    );
  }
  
  // Apply pagination
  const start = filters.offset;
  const end = start + filters.limit;
  return allDeals.slice(start, end);
}

export default router;
