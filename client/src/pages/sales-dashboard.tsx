import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Lead } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { PIPELINE_STAGES, StageId } from "@shared/pipelineStages";
import { StageFilterBar } from "@/components/leads/StageFilterBar";
import { useLeadNavigation } from "@/hooks/useLeadNavigation";
import { normalizeStageId } from "@/lib/stage";
import { fetchLeadsPage } from "@/lib/leadsApi";

const prefetchLeadEdit = () => {
  import("@/pages/lead-edit");
  import("@/configurator/BuilderPage");
};

const STALE_DISPO_DAYS = 7;
const STALE_STAGE_DAYS = 14;

type AgingFilter = "ALL" | "STALE_DISPO" | "LONG_STAGE" | "NEEDS_ATTENTION";
type StageFilter = "ALL" | StageId;
type SortColumn = "customer" | "status" | "daysOnStage" | "daysSinceDispo" | "project" | "price";
type SortDirection = "asc" | "desc";

const STAGE_LABELS: Record<string, string> = {
  "new": "New",
  "in_progress": "In Progress",
  "sold": "Sold",
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  engineering: "Engineering",
  fabrication: "Fabrication",
  delivery_scheduled: "Delivery Scheduled",
  delivered: "Delivered",
  closed_out: "Closed Out",
};

// Mapping function from DB value → UI StageId (same as manager's leads page)
const mapLeadToStageId = (lead: any): StageId | null => {
  const raw = String(lead.stage || lead.status || "").toLowerCase();
  
  switch (raw) {
    case "working":
    case "working_lead":
      return "working_lead";
    case "callbacks":
    case "callback":
      return "callbacks";
    case "welcome_stage":
    case "welcome":
      return "welcome_stage";
    case "storage":
      return "storage";
    case "carport":
      return "carport";
    case "sold_building":
    case "sold":
      return "sold_building";
    case "new":
      return "welcome_stage"; // Map "new" to welcome_stage since "new" isn't a valid StageId
    case "building_preparation":
      return "building_preparation";
    case "building_finalization":
      return "building_finalization";
    case "pending_delivery_date":
      return "pending_delivery_date";
    case "permit_hold":
      return "permit_hold";
    case "red_iron_fabrication":
      return "red_iron_fabrication";
    case "cold_form_fabrication":
      return "cold_form_fabrication";
    case "concrete_hold":
      return "concrete_hold";
    case "carport_fabrication":
      return "carport_fabrication";
    case "delivered_red_iron":
      return "delivered_red_iron";
    case "delivered_c_channel":
      return "delivered_c_channel";
    case "delivered_carport":
      return "delivered_carport";
    case "new_parts_order":
      return "new_parts_order";
    case "canceled":
    case "cancelled":
      return "canceled";
    default:
      return null;
  }
};

export default function SalesDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState<"daysSinceDispo" | "daysOnStage">("daysSinceDispo");
  const [agingFilter, setAgingFilter] = useState<AgingFilter>("ALL");
  const [stageFilter, setStageFilter] = useState<StageFilter>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("daysSinceDispo");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Highlight support for newly claimed leads
  const [highlightedLeadId, setHighlightedLeadId] = useState<string | null>(null);
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);

  // Valid stage IDs from shared configuration
  const validStageIds: StageId[] = PIPELINE_STAGES.map(s => s.id as StageId);

  // Fetch leads data FIRST (before any effects that use it)
  const {
    data: leadsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["/api/leads", "mine", { stage: stageFilter }],
    queryFn: async ({ pageParam }) => {
      return fetchLeadsPage({
        mine: true,
        stage: stageFilter === "ALL" ? null : stageFilter,
        cursor: pageParam,
        limit: 50,
      });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  // Flatten paginated results into a single array (must be before effects that use leads)
  const leads: Lead[] = useMemo(() => {
    if (!leadsData?.pages) return [];
    return leadsData.pages.flatMap((page) => page.items as Lead[]);
  }, [leadsData]);

  // Sync URL → stageFilter and highlight param whenever the route changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawStageParam = params.get("stage");
    const normalizedStage = normalizeStageId(rawStageParam);
    
    // Handle highlight param
    const highlightParam = params.get("highlight");
    if (highlightParam) {
      setHighlightedLeadId(highlightParam);
      // Clear highlight after 3 seconds
      const timer = setTimeout(() => {
        setHighlightedLeadId(null);
        // Remove highlight from URL
        params.delete("highlight");
        const query = params.toString();
        const newUrl = query ? `${location}?${query}` : location;
        navigate(newUrl, { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }

    if (normalizedStage && validStageIds.includes(normalizedStage)) {
      setStageFilter(normalizedStage as StageFilter);
    } else {
      setStageFilter("ALL");
    }
  }, [location]);
  
  // Scroll highlighted row into view (only if lead is in the current list)
  useEffect(() => {
    if (highlightedLeadId && highlightedRowRef.current) {
      // Only scroll if the highlighted lead is actually in our leads array
      const leadExists = leads.some(lead => lead.id === highlightedLeadId);
      if (leadExists) {
        highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedLeadId, leads]);

  // Update stage filter and URL
  const handleStageChange = (nextStage: StageFilter) => {
    setStageFilter(nextStage);

    const pathname = location; // e.g. "/sales"
    const params = new URLSearchParams(window.location.search);

    if (nextStage === "ALL") {
      params.delete("stage");
    } else {
      params.set("stage", nextStage);
    }

    const query = params.toString();
    const newUrl = query ? `${pathname}?${query}` : pathname;
    navigate(newUrl);
  };

  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const r = await fetch("/api/users");
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: user?.role === "ADMIN" || user?.role === "MANAGER",
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete lead");
      }
    },
    onSuccess: () => {
      // Invalidate all leads queries to refresh data
      queryClient.invalidateQueries({ 
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/leads" 
      });
      toast({ title: "Lead deleted", description: "The lead has been permanently removed." });
      setDeletingId(null);
    },
    onError: () => {
      // Global error handler will show the error toast
      setDeletingId(null);
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ leadId, userId }: { leadId: string; userId: string }) => {
      return await apiRequest("PATCH", `/api/leads/${leadId}/assignment`, { assignedTo: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      // Invalidate pipeline stats (funnel) - use predicate to catch all scope variants
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/pipeline/stats",
      });
      toast({ title: "Lead assigned successfully" });
      setAssigningId(null);
    },
    onError: () => {
      // Global error handler will show the error toast
      setAssigningId(null);
    },
  });

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this lead permanently? This cannot be undone.")) return;
    setDeletingId(id);
    deleteLeadMutation.mutate(id);
  };

  const handleHeaderClick = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const myLeads = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    let filtered = leads;
    
    if (query) {
      filtered = leads.filter((lead: any) => {
        const company = (lead.companyName || "").toLowerCase();
        const contact = (lead.contactName || "").toLowerCase();
        
        return company.includes(query) || contact.includes(query);
      });
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((lead: any) => lead.status === statusFilter);
    }
    
    // Apply aging filter
    const filteredByAging = filtered.filter((lead: any) => {
      const daysOnStage = lead.daysOnStage ?? 0;
      const daysSinceDispo = lead.daysSinceLastDispo ?? 0;
      const needsAttention =
        daysSinceDispo >= STALE_DISPO_DAYS ||
        daysOnStage >= STALE_STAGE_DAYS;

      switch (agingFilter) {
        case "STALE_DISPO":
          return lead.daysSinceLastDispo !== null && daysSinceDispo >= STALE_DISPO_DAYS;
        case "LONG_STAGE":
          return daysOnStage >= STALE_STAGE_DAYS;
        case "NEEDS_ATTENTION":
          return needsAttention;
        case "ALL":
        default:
          return true;
      }
    });
    
    // Apply stage filter using mapping function
    const filteredByStage = filteredByAging.filter((lead: any) => {
      if (stageFilter === "ALL") return true;
      return mapLeadToStageId(lead) === stageFilter;
    });
    
    // Sort by column header clicks
    const sorted = [...filteredByStage].sort((a: any, b: any) => {
      let aVal: any;
      let bVal: any;
      let result = 0;

      switch (sortColumn) {
        case "customer":
          aVal = (a.companyName || "").toLowerCase();
          bVal = (b.companyName || "").toLowerCase();
          result = aVal.localeCompare(bVal);
          break;
        case "status":
          aVal = (a.status || "").toLowerCase();
          bVal = (b.status || "").toLowerCase();
          result = aVal.localeCompare(bVal);
          break;
        case "daysOnStage":
          aVal = a.daysOnStage ?? -1;
          bVal = b.daysOnStage ?? -1;
          // Nulls go to bottom
          if (aVal === -1 && bVal === -1) result = 0;
          else if (aVal === -1) result = 1;
          else if (bVal === -1) result = -1;
          else result = aVal - bVal;
          break;
        case "daysSinceDispo":
          aVal = a.daysSinceLastDispo ?? -1;
          bVal = b.daysSinceLastDispo ?? -1;
          // Nulls go to bottom
          if (aVal === -1 && bVal === -1) result = 0;
          else if (aVal === -1) result = 1;
          else if (bVal === -1) result = -1;
          else result = aVal - bVal;
          break;
        case "project":
          aVal = (a.projectStatus || "not_started").toLowerCase();
          bVal = (b.projectStatus || "not_started").toLowerCase();
          result = aVal.localeCompare(bVal);
          break;
        case "price":
          aVal = parseFloat(a.totalPrice || "0");
          bVal = parseFloat(b.totalPrice || "0");
          result = aVal - bVal;
          break;
        default:
          result = 0;
      }

      // Apply direction
      if (sortDirection === "desc") {
        result = -result;
      }

      // Stable tiebreaker: createdAt desc, then id
      if (result === 0) {
        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
        if (aDate !== bDate) {
          return bDate - aDate; // newer first
        }
        return String(a.id).localeCompare(String(b.id));
      }

      return result;
    });
    return sorted;
  }, [leads, searchTerm, statusFilter, sortMode, agingFilter, stageFilter, sortColumn, sortDirection]);

  const stageBuckets = useMemo(() => {
    const buckets: Record<StageId, number> = {} as Record<StageId, number>;
    // Use leads after search, status, and aging filters but before stage filter
    const query = searchTerm.trim().toLowerCase();
    let filtered = leads;
    
    if (query) {
      filtered = leads.filter((lead: any) => {
        const company = (lead.companyName || "").toLowerCase();
        const contact = (lead.contactName || "").toLowerCase();
        
        return company.includes(query) || contact.includes(query);
      });
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((lead: any) => lead.status === statusFilter);
    }
    const filteredByAging = filtered.filter((lead: any) => {
      const daysOnStage = lead.daysOnStage ?? 0;
      const daysSinceDispo = lead.daysSinceLastDispo ?? 0;
      const needsAttention =
        daysSinceDispo >= STALE_DISPO_DAYS ||
        daysOnStage >= STALE_STAGE_DAYS;

      switch (agingFilter) {
        case "STALE_DISPO":
          return lead.daysSinceLastDispo !== null && daysSinceDispo >= STALE_DISPO_DAYS;
        case "LONG_STAGE":
          return daysOnStage >= STALE_STAGE_DAYS;
        case "NEEDS_ATTENTION":
          return needsAttention;
        case "ALL":
        default:
          return true;
      }
    });

    filteredByAging.forEach((lead: any) => {
      const stageId = mapLeadToStageId(lead);
      if (stageId) {
        buckets[stageId] = (buckets[stageId] || 0) + 1;
      }
    });
    return buckets;
  }, [leads, searchTerm, statusFilter, agingFilter]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter((l: any) => l.status === "new").length,
    inProgress: leads.filter((l: any) => l.status === "in_progress").length,
    sold: leads.filter((l: any) => l.status === "sold").length,
  }), [leads]);

  const { viewLead } = useLeadNavigation();
  
  const handleLeadClick = (lead: Lead) => {
    viewLead(lead.id);
  };

  // Compute header label based on active stage
  const activeStageLabel = stageFilter !== "ALL" 
    ? PIPELINE_STAGES.find(s => s.id === stageFilter)?.label 
    : null;

  // Clear all filters function
  const handleClearAllFilters = () => {
    setStageFilter("ALL");
    setStatusFilter("all");
    setAgingFilter("ALL");
    setSearchTerm("");
    // Remove stage param from URL
    const params = new URLSearchParams(window.location.search);
    params.delete("stage");
    const newUrl = params.toString() ? `${location}?${params.toString()}` : location;
    navigate(newUrl);
  };

  return (
    <div className="h-full overflow-auto p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-baseline gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">My Leads</h1>
          {activeStageLabel && (
            <span className="text-sm text-slate-400">
              · Stage: {activeStageLabel}
            </span>
          )}
        </div>

        {activeStageLabel && (
          <button
            type="button"
            className="text-xs text-blue-400 hover:underline"
            onClick={() => handleStageChange("ALL")}
          >
            Clear stage filter
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.total, color: "bg-primary/10" },
          { label: "New", value: stats.new, color: "bg-blue-500/10" },
          { label: "In Progress", value: stats.inProgress, color: "bg-amber-500/10" },
          { label: "Sold", value: stats.sold, color: "bg-green-500/10" },
        ].map((stat, i) => (
          <Card key={i} className={`${stat.color} backdrop-blur-sm`}>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 1: Search + Status + Clear All */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="input-search-leads"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          data-testid="select-status-filter"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="sold">Sold</option>
        </select>

        <button
          type="button"
          className="text-xs text-slate-400 hover:text-slate-200"
          onClick={handleClearAllFilters}
        >
          Clear filters
        </button>
      </div>

      {/* Row 2: Sort + Aging */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {/* Sort pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Sort by:</span>
          <Button
            variant={sortMode === "daysSinceDispo" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortMode("daysSinceDispo")}
            data-testid="button-sort-dispo"
            className="text-xs h-8"
          >
            Days Since Dispo
          </Button>
          <Button
            variant={sortMode === "daysOnStage" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortMode("daysOnStage")}
            data-testid="button-sort-stage"
            className="text-xs h-8"
          >
            Days on Stage
          </Button>
        </div>

        {/* Aging pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Aging:</span>
          <Button
            size="sm"
            variant={agingFilter === "ALL" ? "default" : "outline"}
            onClick={() => setAgingFilter("ALL")}
            data-testid="button-aging-all"
            className="text-xs h-8"
          >
            All
          </Button>
          <Button
            size="sm"
            variant={agingFilter === "STALE_DISPO" ? "default" : "outline"}
            onClick={() => setAgingFilter("STALE_DISPO")}
            data-testid="button-aging-stale-dispo"
            className="text-xs h-8"
          >
            Stale ≥ {STALE_DISPO_DAYS}d
          </Button>
          <Button
            size="sm"
            variant={agingFilter === "LONG_STAGE" ? "default" : "outline"}
            onClick={() => setAgingFilter("LONG_STAGE")}
            data-testid="button-aging-long-stage"
            className="text-xs h-8"
          >
            On stage ≥ {STALE_STAGE_DAYS}d
          </Button>
          <Button
            size="sm"
            variant={agingFilter === "NEEDS_ATTENTION" ? "default" : "outline"}
            onClick={() => setAgingFilter("NEEDS_ATTENTION")}
            data-testid="button-aging-needs-attention"
            className="text-xs h-8"
          >
            Needs attention
          </Button>
        </div>
      </div>

      {/* Row 3: Stage Filter Bar */}
      <div className="mb-4">
        <StageFilterBar
          stageFilter={stageFilter}
          stageBuckets={stageBuckets}
          totalCount={Object.values(stageBuckets).reduce((sum, count) => sum + count, 0)}
          onStageChange={handleStageChange}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-card/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : myLeads.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
            <p>No leads found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">
                  <button
                    onClick={() => handleHeaderClick("customer")}
                    className="flex items-center gap-1 hover:text-primary cursor-pointer"
                    aria-sort={sortColumn === "customer" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Customer
                    {sortColumn === "customer" ? (
                      sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">
                  <button
                    onClick={() => handleHeaderClick("status")}
                    className="flex items-center gap-1 hover:text-primary cursor-pointer"
                    aria-sort={sortColumn === "status" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Status
                    {sortColumn === "status" ? (
                      sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">
                  <button
                    onClick={() => handleHeaderClick("daysOnStage")}
                    className="flex items-center gap-1 hover:text-primary cursor-pointer"
                    aria-sort={sortColumn === "daysOnStage" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Days on Stage
                    {sortColumn === "daysOnStage" ? (
                      sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">
                  <button
                    onClick={() => handleHeaderClick("daysSinceDispo")}
                    className="flex items-center gap-1 hover:text-primary cursor-pointer"
                    aria-sort={sortColumn === "daysSinceDispo" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Days Since Dispo
                    {sortColumn === "daysSinceDispo" ? (
                      sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">
                  <button
                    onClick={() => handleHeaderClick("project")}
                    className="flex items-center gap-1 hover:text-primary cursor-pointer"
                    aria-sort={sortColumn === "project" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Project
                    {sortColumn === "project" ? (
                      sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">
                  <button
                    onClick={() => handleHeaderClick("price")}
                    className="flex items-center gap-1 hover:text-primary cursor-pointer"
                    aria-sort={sortColumn === "price" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Price
                    {sortColumn === "price" ? (
                      sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="text-right py-3 px-3 sm:px-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {myLeads.map((lead: any) => {
                const needsAttention =
                  (lead.daysSinceLastDispo ?? 0) >= STALE_DISPO_DAYS ||
                  (lead.daysOnStage ?? 0) >= STALE_STAGE_DAYS;
                const isHighlighted = lead.id === highlightedLeadId;
                return (
                <tr 
                  key={lead.id}
                  ref={isHighlighted ? highlightedRowRef : undefined}
                  className={`border-b border-border/50 hover:bg-card/30 transition-all duration-300 ${needsAttention ? "bg-destructive/5" : ""} ${isHighlighted ? "ring-2 ring-primary bg-primary/10 animate-pulse" : ""}`} 
                  onMouseEnter={prefetchLeadEdit}
                >
                  <td className="py-3 px-3 sm:px-4">
                    <div>
                      <p className="font-medium truncate">{lead.companyName}</p>
                      <p className="text-xs text-muted-foreground">{lead.contactName}</p>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <div className="flex flex-col gap-1">
                      <Badge variant={lead.status === "sold" ? "default" : "outline"} className="text-xs w-fit">
                        {lead.status}
                      </Badge>
                      {needsAttention && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide w-fit">
                          Needs Attention
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <p className="text-xs text-muted-foreground">{lead.daysOnStage ?? 0} days</p>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <p className="text-xs text-muted-foreground">{lead.daysSinceLastDispo !== null ? `${lead.daysSinceLastDispo} days` : "N/A"}</p>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <span className="text-xs text-muted-foreground">{PROJECT_STATUS_LABELS[lead.projectStatus || ""] || "Not Started"}</span>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    ${parseFloat(lead.totalPrice || "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
                        <div className="relative">
                          <select
                            value={lead.assignedTo || ""}
                            onChange={(e) => {
                              if (e.target.value) {
                                assignMutation.mutate({ leadId: lead.id, userId: e.target.value });
                              }
                            }}
                            disabled={assigningId === lead.id}
                            className="px-2 py-1 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            data-testid={`select-assign-lead-${lead.id}`}
                          >
                            <option value="">Assign...</option>
                            {allUsers
                              .filter((u: any) => u.role === "REP" || u.role === "MANAGER")
                              .map((u: any) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        data-testid={`button-view-lead-${lead.id}`}
                        onClick={() => handleLeadClick(lead)}
                      >
                        View
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>

          {/* Load More button for pagination */}
          {hasNextPage && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                data-testid="button-load-more"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
