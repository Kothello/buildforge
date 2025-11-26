import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Lead, Activity, Deal } from "@shared/schema";
import { PipelineBoard } from "@/components/pipeline-board";
import { LeadDetailSheet } from "@/components/lead-detail-sheet";
import { LeadDropZone } from "@/components/lead-drop-zone";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

export default function Pipeline() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showDropZone, setShowDropZone] = useState(false);
  const { toast } = useToast();

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities", selectedLead?.id],
    enabled: !!selectedLead,
  });

  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      return await apiRequest("PATCH", `/api/leads/${id}`, { stage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
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

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setSheetOpen(true);
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
    <div className="min-h-screen bg-background">
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
            <p className="text-muted-foreground mt-1">
              Drag deals between stages to update their status
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDropZone(!showDropZone)}
              className="gap-2"
              data-testid="button-toggle-dropzone"
            >
              <Sparkles className="h-4 w-4" />
              {showDropZone ? "Hide" : "Show"} Drop Zone
            </Button>
            <Button variant="default" className="gap-2" data-testid="button-add-lead">
              <Plus className="h-4 w-4" />
              Add Lead
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
