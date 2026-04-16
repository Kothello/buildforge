import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Lead, Activity, Deal } from "@shared/schema";
import { PipelineBoard } from "@/components/pipeline-board";
import { LeadDetailSheet } from "@/components/lead-detail-sheet";
import { LeadDropZone } from "@/components/lead-drop-zone";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLeadNavigation } from "@/hooks/useLeadNavigation";
import { normalizeArray } from "@/lib/normalize";
import { Plus, Sparkles, LayoutGrid, TrendingDown } from "lucide-react";
import confetti from "canvas-confetti";
import { Link, useLocation, useRoute } from "wouter";

export default function Pipeline() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showDropZone, setShowDropZone] = useState(false);
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Determine if this is a manager/admin view or rep view
  const isManagerView = user?.role === "ADMIN" || user?.role === "MANAGER";

  // Handle stage filtering from URL params
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const stageFilter = urlParams.get('stage');

  // Fetch leads - use "mine" query for reps, all leads for managers
  const { data: allLeads = [] } = useQuery<Lead[]>({
    queryKey: isManagerView ? ["/api/leads"] : ["/api/leads", "mine"],
    queryFn: async () => {
      const endpoint = isManagerView ? "/api/leads" : "/api/leads?mine=true";
      const r = await fetch(endpoint, { credentials: "include" });
      if (!r.ok) return [];
      const data = await r.json();
      return normalizeArray<Lead>(data);
    },
  });

  // Filter leads by stage if specified in URL
  const leads = useMemo(() => {
    if (!stageFilter) return allLeads;
    return allLeads.filter(lead => 
      lead.stage === stageFilter || lead.status === stageFilter
    );
  }, [allLeads, stageFilter]);

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities", selectedLead?.id],
    enabled: !!selectedLead,
  });

  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/crm/deals"],
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, stage, fromStage }: { id: string; stage: string; fromStage?: string }) => {
      return await apiRequest("POST", `/api/leads/${id}/stage`, { 
        toStage: stage,
        fromStage: fromStage,
        notes: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      // Invalidate pipeline stats (funnel) - use predicate to catch all scope variants
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/pipeline/stats",
      });
    },
  });

  const parseLeadMutation = useMutation({
    mutationFn: async (data: { content: string; filename: string }) => {
      return await apiRequest("POST", "/api/leads/parse", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead Created!",
        description: "AI has successfully parsed and created the lead",
      });
      setShowDropZone(false);
    },
  });

  const handleStageChange = (leadId: string, newStage: string) => {
    const lead = leads.find((l) => l.id === leadId);
    
    if (newStage === "won") {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      toast({
        title: "🎉 Deal Won!",
        description: `${lead?.companyName} is now a customer!`,
      });
    }

    updateLeadMutation.mutate({ id: leadId, stage: newStage });
  };

  const { viewLead } = useLeadNavigation();
  
  const handleLeadClick = (lead: Lead) => {
    // Navigate to the appropriate detail page based on user role
    viewLead(lead.id);
  };

  const handleFileDrop = (file: File, content: string) => {
    parseLeadMutation.mutate({
      content,
      filename: file.name,
    });
  };

  const selectedDeal = selectedLead
    ? deals.find((d) => d.leadId === selectedLead.id)
    : undefined;

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pipeline</h1>
              <div className="flex gap-1 border rounded-lg p-1">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 text-xs"
                >
                  <LayoutGrid className="h-3 w-3" />
                  Kanban
                </Button>
                <Link href="/pipeline-funnel">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                  >
                    <TrendingDown className="h-3 w-3" />
                    Funnel
                  </Button>
                </Link>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {stageFilter 
                ? `Showing ${isManagerView ? 'all' : 'your'} leads filtered by stage: ${stageFilter}`
                : isManagerView 
                  ? "Drag deals between stages to update their status"
                  : "Your assigned leads - drag between stages to update"}
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDropZone(!showDropZone)}
              className="gap-2 text-xs sm:text-sm"
              data-testid="button-toggle-dropzone"
            >
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{showDropZone ? "Hide" : "Show"} Drop Zone</span>
              <span className="sm:hidden">{showDropZone ? "Hide" : "Show"}</span>
            </Button>
            <Button size="sm" variant="default" className="gap-2 text-xs sm:text-sm" data-testid="button-add-lead">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Add Lead</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {showDropZone && (
          <LeadDropZone onDrop={handleFileDrop} />
        )}

        <PipelineBoard
          leads={leads}
          onStageChange={handleStageChange}
          onLeadClick={handleLeadClick}
        />
      </div>

      <LeadDetailSheet
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
      />
    </div>
  );
}
