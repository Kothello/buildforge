import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Trash2, Loader2, UserPlus, Download } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Lead } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { buildExportUrl } from "@/lib/utils";
import { PageHeader } from "@/components/app/PageHeader";
import { Toolbar } from "@/components/app/Toolbar";
import { EmptyState } from "@/components/app/EmptyState";
import { LoadState } from "@/components/app/LoadState";
import { ManagerOnly } from "@/components/app/ManagerOnly";
import { normalizeStageId } from "@/lib/stage";

const prefetchLeadEdit = () => {
  import("@/pages/lead-edit");
  import("@/configurator/BuilderPage");
};

const STALE_DISPO_DAYS = 7;
const STALE_STAGE_DAYS = 14;

type StageFilter = "ALL" | string;

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

export default function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState<StageFilter>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkAssignUserId, setBulkAssignUserId] = useState<string>("");
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Read ?stage= from URL on mount and sync with location changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawStageParam = params.get("stage");
    const normalizedStage = normalizeStageId(rawStageParam);
    if (normalizedStage) {
      setStageFilter(normalizedStage);
    } else {
      setStageFilter("ALL");
    }
  }, []);

  // Update URL when stage filter changes (URL ↔ UI sync)
  const handleStageFilterChange = (newStage: StageFilter) => {
    setStageFilter(newStage);
    
    const params = new URLSearchParams(window.location.search);
    if (newStage === "ALL") {
      params.delete("stage");
    } else {
      params.set("stage", newStage);
    }
    
    const query = params.toString();
    const newUrl = query ? `/sales/all-leads?${query}` : "/sales/all-leads";
    navigate(newUrl, { replace: true });
  };

  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  if (!isAdminOrManager) {
    navigate("/my-leads");
    toast({ title: "Access Denied", description: "Ask a manager to assign leads to you.", variant: "destructive" });
    return null;
  }

  const { data: leads = [], isLoading, error: leadsError } = useQuery({
    queryKey: ["/api/leads", "all"],
    queryFn: async () => {
      const r = await fetch("/api/leads");
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  // Use /api/users/assignable - returns active REPs only, available to all authenticated users
  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/users/assignable"],
    queryFn: async () => {
      const r = await fetch("/api/users/assignable", { credentials: "include" });
      if (!r.ok) {
        console.error("Failed to fetch assignable users:", r.status);
        return [];
      }
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete lead");
      }
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Lead[]>(["/api/leads", "all"], (old) =>
        old ? old.filter((lead) => lead.id !== id) : old
      );
      queryClient.invalidateQueries({ queryKey: ["/api/leads", "mine"] });
      toast({ title: "Lead deleted", description: "The lead has been permanently removed." });
      setDeletingId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setDeletingId(null);
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ leadId, userId }: { leadId: string; userId: string }) => {
      return await apiRequest("PATCH", `/api/leads/${leadId}/assign`, { assignedTo: userId });
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
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this lead permanently? This cannot be undone.")) return;
    setDeletingId(id);
    deleteLeadMutation.mutate(id);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(filteredLeads.map((l: any) => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeadIds((prev) => [...prev, leadId]);
    } else {
      setSelectedLeadIds((prev) => prev.filter((id) => id !== leadId));
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignUserId) {
      toast({ title: "Select a rep", description: "Please choose a rep to assign leads to.", variant: "destructive" });
      return;
    }
    if (selectedLeadIds.length === 0) {
      toast({ title: "No leads selected", description: "Please select at least one lead.", variant: "destructive" });
      return;
    }

    setIsBulkAssigning(true);
    try {
      await Promise.all(
        selectedLeadIds.map((leadId) =>
          apiRequest("PATCH", `/api/leads/${leadId}/assign`, { assignedTo: bulkAssignUserId })
        )
      );
      const repName = allUsers.find((u: any) => u.id === bulkAssignUserId)?.name || "rep";
      toast({ title: "Leads assigned", description: `Assigned ${selectedLeadIds.length} leads to ${repName}.` });
      setSelectedLeadIds([]);
      setBulkAssignUserId("");
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      // Invalidate pipeline stats (funnel) - use predicate to catch all scope variants
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/pipeline/stats",
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to assign some leads.", variant: "destructive" });
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const filteredLeads = useMemo(() => {
    if (!Array.isArray(leads)) return [];
    let filtered = leads.filter((lead: any) =>
      lead.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (statusFilter !== "all") {
      filtered = filtered.filter((lead: any) => lead.status === statusFilter);
    }
    // Apply stage filter - normalize lead.stage and compare to filter
    const filteredByStage = filtered.filter((lead: any) => {
      if (stageFilter === "ALL") return true;
      const normalizedLeadStage = normalizeStageId(lead.stage);
      return normalizedLeadStage === stageFilter;
    });
    return filteredByStage;
  }, [leads, searchTerm, statusFilter, stageFilter]);

  const stageBuckets = useMemo(() => {
    const buckets: Record<string, { count: number }> = {};
    // Use leads after search and status filters but before stage filter
    if (!Array.isArray(leads)) return buckets;
    let filtered = leads.filter((lead: any) =>
      lead.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (statusFilter !== "all") {
      filtered = filtered.filter((lead: any) => lead.status === statusFilter);
    }

    filtered.forEach((lead: any) => {
      // Use normalized stage for bucketing
      const stageKey = normalizeStageId(lead.stage) ?? "unknown";
      if (!buckets[stageKey]) {
        buckets[stageKey] = { count: 0 };
      }
      buckets[stageKey].count += 1;
    });
    return buckets;
  }, [leads, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    if (!Array.isArray(leads)) return { total: 0, new: 0, inProgress: 0, sold: 0 };
    return {
      total: leads.length,
      new: leads.filter((l: any) => l.status === "new").length,
      inProgress: leads.filter((l: any) => l.status === "in_progress").length,
      sold: leads.filter((l: any) => l.status === "sold").length,
    };
  }, [leads]);

  const pipelineHealth = useMemo(() => {
    if (!Array.isArray(leads)) {
      return {
        totalLeads: 0,
        staleDispoCount: 0,
        longStageCount: 0,
        needsAttentionCount: 0,
        avgDaysOnStageByStage: {},
      };
    }

    const staleDispoCount = leads.filter(
      (l: any) => l.daysSinceLastDispo !== null && l.daysSinceLastDispo >= STALE_DISPO_DAYS
    ).length;

    const longStageCount = leads.filter(
      (l: any) => (l.daysOnStage ?? 0) >= STALE_STAGE_DAYS
    ).length;

    const needsAttentionCount = leads.filter((l: any) => {
      const daysSinceDispo = l.daysSinceLastDispo ?? 0;
      const daysOnStage = l.daysOnStage ?? 0;
      return daysSinceDispo >= STALE_DISPO_DAYS || daysOnStage >= STALE_STAGE_DAYS;
    }).length;

    // Calculate average days on stage per stage
    const stageGroups: { [key: string]: { sum: number; count: number } } = {};
    leads.forEach((lead: any) => {
      const stage = lead.stage || "unknown";
      if (!stageGroups[stage]) {
        stageGroups[stage] = { sum: 0, count: 0 };
      }
      stageGroups[stage].sum += lead.daysOnStage ?? 0;
      stageGroups[stage].count += 1;
    });

    const avgDaysOnStageByStage: { [key: string]: number } = {};
    Object.entries(stageGroups).forEach(([stage, data]) => {
      avgDaysOnStageByStage[stage] = data.sum / data.count;
    });

    return {
      totalLeads: leads.length,
      staleDispoCount,
      longStageCount,
      needsAttentionCount,
      avgDaysOnStageByStage,
    };
  }, [leads]);

  const handleLeadClick = (lead: Lead) => {
    navigate(`/sales/leads/${lead.id}`);
  };

  const getAssignedRepName = (leadId: string) => {
    const lead = leads.find((l: any) => l.id === leadId);
    if (!lead?.assignedTo) return "Unassigned";
    const rep = allUsers.find((u: any) => u.id === lead.assignedTo);
    return rep?.name || "Unknown";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full overflow-auto p-3 sm:p-6">
        <LoadState rows={8} />
      </div>
    );
  }

  // Error state
  if (leadsError) {
    return (
      <div className="h-full overflow-auto p-3 sm:p-6">
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title="Failed to load leads"
          description="There was an error loading your leads. Please try again."
          action={
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["leads"] })}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-3 sm:p-6 space-y-6">
      <PageHeader
        title="All Leads"
        left={<Users className="w-5 h-5 text-primary" />}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const url = buildExportUrl('lead');
              window.open(url, '_blank');
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
      />

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

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <div className="p-3 sm:p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Leads</p>
            <div className="text-2xl font-bold mt-2">{pipelineHealth.totalLeads}</div>
          </div>
        </Card>
        <Card className="bg-destructive/5 backdrop-blur-sm border-border/50">
          <div className="p-3 sm:p-4">
            <p className="text-xs font-medium text-muted-foreground">Needs Attention</p>
            <div className="text-2xl font-bold mt-2">{pipelineHealth.needsAttentionCount}</div>
            <p className="text-xs text-muted-foreground mt-1">≥ {STALE_DISPO_DAYS}d or ≥ {STALE_STAGE_DAYS}d</p>
          </div>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <div className="p-3 sm:p-4">
            <p className="text-xs font-medium text-muted-foreground">Stale Since Dispo</p>
            <div className="text-2xl font-bold mt-2">{pipelineHealth.staleDispoCount}</div>
          </div>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <div className="p-3 sm:p-4">
            <p className="text-xs font-medium text-muted-foreground">Long On Stage</p>
            <div className="text-2xl font-bold mt-2">{pipelineHealth.longStageCount}</div>
          </div>
        </Card>
      </div>

      {Object.entries(pipelineHealth.avgDaysOnStageByStage).length > 0 && (
        <div className="text-xs text-muted-foreground px-3 sm:px-4">
          <p className="font-medium mb-1">Avg days on stage:</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(pipelineHealth.avgDaysOnStageByStage).map(([stage, avg]) => (
              <span key={stage}>
                <span className="font-medium">{stage}:</span> {(avg as number).toFixed(1)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by company name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="input-search-all-leads"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          data-testid="select-status-filter-all"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="sold">Sold</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <Button
          size="sm"
          variant={stageFilter === "ALL" ? "default" : "outline"}
          onClick={() => setStageFilter("ALL")}
          data-testid="button-stage-all-all-leads"
        >
          All ({filteredLeads.length})
        </Button>
        {Object.entries(stageBuckets).map(([stageKey, stats]) => (
          <Button
            key={stageKey}
            size="sm"
            variant={stageFilter === stageKey ? "default" : "outline"}
            onClick={() => setStageFilter(stageKey)}
            data-testid={`button-stage-${stageKey}-all-leads`}
          >
            {STAGE_LABELS[stageKey] ?? stageKey} ({stats.count})
          </Button>
        ))}
      </div>

      {selectedLeadIds.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium">
                {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? "s" : ""} selected
              </span>
              <Select value={bulkAssignUserId} onValueChange={setBulkAssignUserId}>
                <SelectTrigger className="w-[180px] h-8" data-testid="select-bulk-assign-user">
                  <SelectValue placeholder="Select rep..." />
                </SelectTrigger>
                <SelectContent>
                  {allUsers
                    .filter((u: any) => u.role === "REP" || u.role === "MANAGER")
                    .map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleBulkAssign}
                disabled={isBulkAssigning || !bulkAssignUserId}
                data-testid="button-bulk-assign"
              >
                {isBulkAssigning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign to Rep
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedLeadIds([])}
                data-testid="button-clear-selection"
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-card/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
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
                <th className="py-3 px-2 sm:px-3 w-10">
                  <Checkbox
                    checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Select all leads"
                    data-testid="checkbox-select-all"
                  />
                </th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Company</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Contact</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Days on Stage</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Days Since Dispo</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Assigned To</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Project</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Price</th>
                <th className="text-right py-3 px-3 sm:px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead: any) => (
                <tr key={lead.id} className="border-b border-border/50 hover:bg-card/30 transition" onMouseEnter={prefetchLeadEdit}>
                  <td className="py-3 px-2 sm:px-3">
                    <Checkbox
                      checked={selectedLeadIds.includes(lead.id)}
                      onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                      aria-label={`Select ${lead.companyName}`}
                      data-testid={`checkbox-lead-${lead.id}`}
                    />
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <p className="font-medium truncate">{lead.companyName}</p>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <p className="text-xs text-muted-foreground truncate">{lead.contactName}</p>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <Badge variant={lead.status === "sold" ? "default" : "outline"} className="text-xs">
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <p className="text-xs text-muted-foreground">{lead.daysOnStage ?? 0} days</p>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <p className="text-xs text-muted-foreground">{lead.daysSinceLastDispo !== null ? `${lead.daysSinceLastDispo} days` : "N/A"}</p>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
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
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <span className="text-xs text-muted-foreground">{PROJECT_STATUS_LABELS[lead.projectStatus || ""] || "Not Started"}</span>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    ${parseFloat(lead.totalPrice || "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        data-testid={`button-view-lead-${lead.id}`}
                        onClick={() => handleLeadClick(lead)}
                      >
                        View
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        data-testid={`button-delete-lead-${lead.id}`}
                        onClick={() => handleDelete(lead.id)}
                        disabled={deletingId === lead.id}
                      >
                        {deletingId === lead.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
