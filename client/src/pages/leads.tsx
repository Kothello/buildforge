import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Users, Trash2, Loader2 } from "lucide-react";
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

export default function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  if (!isAdminOrManager) {
    navigate("/my-leads");
    toast({ title: "Access Denied", description: "Ask a manager to assign leads to you.", variant: "destructive" });
    return null;
  }

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["/api/leads", "all"],
    queryFn: () => fetch("/api/leads").then(r => r.json()),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => fetch("/api/users").then(r => r.json()),
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

  const filteredLeads = useMemo(() => {
    let filtered = leads.filter((lead: any) =>
      lead.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (statusFilter !== "all") {
      filtered = filtered.filter((lead: any) => lead.status === statusFilter);
    }
    return filtered;
  }, [leads, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter((l: any) => l.status === "new").length,
    inProgress: leads.filter((l: any) => l.status === "in_progress").length,
    sold: leads.filter((l: any) => l.status === "sold").length,
  }), [leads]);

  const handleLeadClick = (lead: Lead) => {
    navigate(`/sales/leads/${lead.id}`);
  };

  const getAssignedRepName = (leadId: string) => {
    const lead = leads.find((l: any) => l.id === leadId);
    if (!lead?.assignedTo) return "Unassigned";
    const rep = allUsers.find((u: any) => u.id === lead.assignedTo);
    return rep?.name || "Unknown";
  };

  return (
    <div className="h-full overflow-auto p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">All Leads</h1>
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
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Company</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Contact</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Assigned To</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Price</th>
                <th className="text-right py-3 px-3 sm:px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead: any) => (
                <tr key={lead.id} className="border-b border-border/50 hover:bg-card/30 transition" onMouseEnter={prefetchLeadEdit}>
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
