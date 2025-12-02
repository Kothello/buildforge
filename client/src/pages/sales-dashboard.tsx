import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import { Lead } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

const prefetchLeadEdit = () => {
  import("@/pages/lead-edit");
  import("@/configurator/BuilderPage");
};

const STALE_DISPO_DAYS = 7;
const STALE_STAGE_DAYS = 14;

type AgingFilter = "ALL" | "STALE_DISPO" | "LONG_STAGE" | "NEEDS_ATTENTION";
type StageFilter = "ALL" | string;

const STAGE_LABELS: Record<string, string> = {
  "new": "New",
  "in_progress": "In Progress",
  "sold": "Sold",
};

export default function SalesDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState<"daysSinceDispo" | "daysOnStage">("daysSinceDispo");
  const [agingFilter, setAgingFilter] = useState<AgingFilter>("ALL");
  const [stageFilter, setStageFilter] = useState<StageFilter>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["/api/leads", "mine"],
    queryFn: async () => {
      const r = await fetch("/api/leads?mine=true");
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

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
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Lead[]>(["/api/leads", "mine"], (old) =>
        old ? old.filter((lead) => lead.id !== id) : old
      );
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
      return await apiRequest("PATCH", `/api/leads/${leadId}`, { assignedTo: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
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

  const myLeads = useMemo(() => {
    let filtered = leads.filter((lead: any) =>
      lead.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
    
    // Apply stage filter
    const filteredByStage = filteredByAging.filter((lead: any) => {
      if (stageFilter === "ALL") return true;
      const stageKey = lead.status ?? "";
      return stageKey === stageFilter;
    });
    
    // Sort by aging metrics
    const sorted = [...filteredByStage].sort((a: any, b: any) => {
      if (sortMode === "daysSinceDispo") {
        const aVal = a.daysSinceLastDispo ?? -1;
        const bVal = b.daysSinceLastDispo ?? -1;
        // Nulls (represented as -1) go to the end
        if (aVal === -1 && bVal === -1) return 0;
        if (aVal === -1) return 1;
        if (bVal === -1) return -1;
        return bVal - aVal; // descending
      } else {
        const aVal = a.daysOnStage ?? 0;
        const bVal = b.daysOnStage ?? 0;
        return bVal - aVal; // descending
      }
    });
    return sorted;
  }, [leads, searchTerm, statusFilter, sortMode, agingFilter, stageFilter]);

  const stageBuckets = useMemo(() => {
    const buckets: Record<string, { count: number }> = {};
    // Use leads after search, status, and aging filters but before stage filter
    let filtered = leads.filter((lead: any) =>
      lead.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
      const stageKey = lead.status ?? "unknown";
      if (!buckets[stageKey]) {
        buckets[stageKey] = { count: 0 };
      }
      buckets[stageKey].count += 1;
    });
    return buckets;
  }, [leads, searchTerm, statusFilter, agingFilter]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter((l: any) => l.status === "new").length,
    inProgress: leads.filter((l: any) => l.status === "in_progress").length,
    sold: leads.filter((l: any) => l.status === "sold").length,
  }), [leads]);

  const handleLeadClick = (lead: Lead) => {
    navigate(`/sales/leads/${lead.id}`);
  };

  return (
    <div className="h-full overflow-auto p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">My Leads</h1>
        </div>
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

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1 relative">
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
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Sort by:</span>
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

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Aging:</span>
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
            Stale ≥ {STALE_DISPO_DAYS}d since dispo
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

      <div className="flex flex-wrap gap-2 mb-3">
        <Button
          size="sm"
          variant={stageFilter === "ALL" ? "default" : "outline"}
          onClick={() => setStageFilter("ALL")}
          data-testid="button-stage-all"
        >
          All ({myLeads.length})
        </Button>
        {Object.entries(stageBuckets).map(([stageKey, stats]) => (
          <Button
            key={stageKey}
            size="sm"
            variant={stageFilter === stageKey ? "default" : "outline"}
            onClick={() => setStageFilter(stageKey)}
            data-testid={`button-stage-${stageKey}`}
          >
            {STAGE_LABELS[stageKey] ?? stageKey} ({stats.count})
          </Button>
        ))}
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
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Customer</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Days on Stage</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Days Since Dispo</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Price</th>
                <th className="text-right py-3 px-3 sm:px-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {myLeads.map((lead: any) => {
                const needsAttention =
                  (lead.daysSinceLastDispo ?? 0) >= STALE_DISPO_DAYS ||
                  (lead.daysOnStage ?? 0) >= STALE_STAGE_DAYS;
                return (
                <tr 
                  key={lead.id} 
                  className={`border-b border-border/50 hover:bg-card/30 transition ${needsAttention ? "bg-destructive/5" : ""}`} 
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
        </div>
      )}
    </div>
  );
}
