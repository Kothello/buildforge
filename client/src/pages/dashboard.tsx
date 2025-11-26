import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lead, Activity, Deal } from "@shared/schema";
import { MorningBriefCard } from "@/components/morning-brief-card";
import { LeadDetailSheet } from "@/components/lead-detail-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

export default function Dashboard() {
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
  });

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  const hotLeads = leads
    .filter((lead) => lead.temperature === "hot" || lead.temperature === "fire")
    .sort((a, b) => {
      const tempOrder = { fire: 4, hot: 3, warm: 2, cold: 1 };
      return tempOrder[b.temperature as keyof typeof tempOrder] - tempOrder[a.temperature as keyof typeof tempOrder];
    })
    .slice(0, 10);

  const handleSendMessage = (lead: Lead) => {
    toast({
      title: "Message Sent!",
      description: `AI-generated message sent to ${lead.contactName}`,
    });
  };

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setSheetOpen(true);
  };

  const selectedDeal = selectedLead
    ? deals.find((d) => d.leadId === selectedLead.id)
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
              <AvatarFallback>SF</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                {greeting}, <span className="text-primary">Emperor</span>
              </h1>
              <p className="text-muted-foreground mt-1">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">
              {hotLeads.length} Hot Deals Today
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-3 mb-6">
            <h2 className="text-2xl font-bold">Today's Priority Deals</h2>
            <p className="text-sm text-muted-foreground">
              Top {hotLeads.length} deals ranked by AI, ready to close
            </p>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : hotLeads.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-lg border-2 border-dashed border-muted-foreground/25">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Hot Leads Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Import leads from the pipeline or use the universal drop zone to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {hotLeads.map((lead, index) => (
                <MorningBriefCard
                  key={lead.id}
                  lead={lead}
                  priority={index + 1}
                  aiScript={lead.aiFirstMessage || undefined}
                  onSend={() => handleSendMessage(lead)}
                  onView={() => handleViewLead(lead)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <LeadDetailSheet
        lead={selectedLead}
        deal={selectedDeal}
        activities={activities}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
