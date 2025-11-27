import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp } from "lucide-react";
import { useState, lazy, Suspense } from "react";
import { Lead, Activity, Deal } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const LazyLeadDetailSheet = lazy(() => import("@/components/lead-detail-sheet").then(m => ({ default: m.LeadDetailSheet })));

const prefetchConfigurator = () => {
  import("@/configurator/BuilderPage");
};

export default function SalesDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities", selectedLead?.id],
    enabled: !!selectedLead,
  });

  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
    enabled: !!selectedLead,
  });

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setSheetOpen(true);
  };

  const selectedDeal = selectedLead
    ? deals.find((d) => d.leadId === selectedLead.id)
    : undefined;

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-full overflow-auto p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">My Leads</h1>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="bg-primary/10 backdrop-blur-sm">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{leads.length}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 backdrop-blur-sm">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{leads.filter((l) => l.status === "new").length}</div>
            <p className="text-xs text-muted-foreground">New</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 backdrop-blur-sm">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{leads.filter((l) => l.status === "in_progress").length}</div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 backdrop-blur-sm">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{leads.filter((l) => l.status === "sold").length}</div>
            <p className="text-xs text-muted-foreground">Sold</p>
          </CardContent>
        </Card>
      </div>

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
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Customer</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold">Price</th>
                <th className="text-right py-3 px-3 sm:px-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-border/50 hover:bg-card/30 transition" onMouseEnter={prefetchConfigurator}>
                  <td className="py-3 px-3 sm:px-4">
                    <div>
                      <p className="font-medium truncate">{lead.companyName}</p>
                      <p className="text-xs text-muted-foreground">{lead.contactName}</p>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <Badge variant={lead.status === "sold" ? "default" : "outline"} className="text-xs">
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    ${parseFloat(lead.totalPrice || "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-right">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      data-testid={`button-view-lead-${lead.id}`}
                      onClick={() => handleLeadClick(lead)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sheetOpen && (
        <Suspense fallback={null}>
          <LazyLeadDetailSheet
            lead={selectedLead}
            deal={selectedDeal}
            activities={activities}
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            onGenerateContract={() => {
              toast({
                title: "Generating Contract",
                description: "AI is creating a custom contract...",
              });
            }}
            onUnstickDeal={() => {
              toast({
                title: "AI Analysis",
                description: "Analyzing deal obstacles and generating suggestions...",
              });
            }}
            onLeadUpdate={(updatedLead) => {
              setSelectedLead(updatedLead);
              queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
              toast({
                title: "Lead Updated",
                description: "Configuration has been saved successfully.",
              });
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
