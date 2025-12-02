import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { lazy, Suspense, useState, useEffect } from "react";
import { Lead, Activity, Deal, LeadQuote } from "@shared/schema";
import { ActionButtons } from "@/components/action-buttons";
import { AIMessageCard } from "@/components/ai-message-card";
import { PricingBreakdown } from "@/components/pricing-breakdown";
import { ActivityTimeline } from "@/components/activity-timeline";
import { TemperatureBadge } from "@/components/temperature-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCheck, Sparkles, DollarSign, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const BuildingViewer3D = lazy(() => import("@/components/building-viewer-3d").then(m => ({ default: m.BuildingViewer3D })));
const LeadConfiguratorEmbed = lazy(() => import("@/configurator/LeadConfiguratorEmbed").then(m => ({ default: m.LeadConfiguratorEmbed })));

function ConfiguratorSkeleton() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Loading configurator...</span>
      </div>
    </div>
  );
}

export default function LeadEditPage() {
  const [, params] = useRoute("/sales/leads/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const leadId = params?.id;

  const { data: queryLead, isLoading: isLoadingLead } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    queryFn: () => fetch(`/api/leads/${leadId}`).then(r => r.json()),
    enabled: !!leadId,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  // Local state to ensure immediate UI updates after save
  const [localLead, setLocalLead] = useState<Lead | null>(null);
  
  // Sync local state when query data changes
  useEffect(() => {
    if (queryLead) {
      console.log('[lead-edit] Query lead updated:', queryLead.totalPrice);
      setLocalLead(queryLead);
    }
  }, [queryLead]);
  
  // Use local state if available, otherwise fall back to query data
  const lead = localLead || queryLead;

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities", leadId],
    enabled: !!leadId,
  });

  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<LeadQuote[]>({
    queryKey: ["/api/leads", leadId, "quotes"],
    enabled: !!leadId,
  });

  const deal = lead ? deals.find((d) => d.leadId === lead.id) : undefined;

  const handleBack = () => {
    navigate("/sales");
  };

  const handleLeadUpdated = (updatedLead: Lead) => {
    console.log('[lead-edit] handleLeadUpdated called with:', updatedLead.totalPrice);
    setLocalLead(updatedLead);
  };

  if (isLoadingLead) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading lead...</span>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Lead not found</p>
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Leads
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-row">
      {/* Left Side - Lead Details */}
      <div className="w-[35%] border-r border-border flex flex-col h-full bg-background">
        <div className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Back to My Leads</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate" data-testid="text-lead-title">
                {lead.companyName}
              </h1>
              <p className="text-muted-foreground mt-1 truncate text-sm">{lead.contactName}</p>
            </div>
            <TemperatureBadge temperature={lead.temperature as any} className="shrink-0" />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline" className="text-xs">{lead.email}</Badge>
            <Badge variant="outline" className="text-xs">{lead.phone}</Badge>
            <Badge variant="secondary" className="text-xs">{lead.source}</Badge>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-8">
                <TabsTrigger value="overview" data-testid="tab-overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="quotes" data-testid="tab-quotes" className="text-xs">Quotes</TabsTrigger>
                <TabsTrigger value="3d-viewer" data-testid="tab-3d" className="text-xs">3D View</TabsTrigger>
                <TabsTrigger value="activity" data-testid="tab-activity" className="text-xs">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3 mt-3">
                <ActionButtons
                  phone={lead.phone || undefined}
                  email={lead.email || undefined}
                />

                {lead.aiFirstMessage && (
                  <AIMessageCard
                    message={lead.aiFirstMessage}
                    title="AI-Generated First Message"
                  />
                )}

                {lead.aiNotes && (
                  <AIMessageCard
                    message={lead.aiNotes}
                    title="AI Analysis"
                  />
                )}

                <PricingBreakdown
                  configuration={lead.configuration as any}
                  totalPrice={lead.totalPrice || undefined}
                />

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 text-xs sm:text-sm"
                    onClick={() => toast({ title: "Generating Contract", description: "AI is creating a custom contract..." })}
                    data-testid="button-generate-contract"
                  >
                    <FileCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Generate Contract</span>
                    <span className="sm:hidden">Contract</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 text-xs sm:text-sm"
                    onClick={() => toast({ title: "AI Analysis", description: "Analyzing deal obstacles..." })}
                    data-testid="button-unstick-deal"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">Unstick Deal</span>
                    <span className="sm:hidden">Unstick</span>
                  </Button>
                </div>

                {deal?.contractStatus && deal.contractStatus !== "pending" && (
                  <div className="p-4 rounded-lg bg-accent border border-accent-border">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">Contract Status</p>
                        <p className="text-xs text-muted-foreground capitalize">{deal.contractStatus}</p>
                      </div>
                      {!deal.depositPaid && deal.depositAmount && (
                        <Button variant="default" size="sm" className="gap-2 shrink-0 text-xs">
                          <DollarSign className="h-3 w-3" />
                          <span className="hidden sm:inline">Pay ${parseFloat(deal.depositAmount).toLocaleString()}</span>
                          <span className="sm:hidden">Pay</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="quotes" className="mt-3 space-y-3">
                <div className="space-y-2">
                  {quotesLoading && (
                    <div className="text-xs text-muted-foreground">Loading quotes...</div>
                  )}
                  {!quotesLoading && quotes.length === 0 && (
                    <div className="text-xs text-muted-foreground">No quote history yet.</div>
                  )}
                  <div className="space-y-2">
                    {quotes.map((quote) => (
                      <div
                        key={quote.id}
                        className="rounded-md border border-border p-3 text-xs hover-elevate"
                        data-testid={`card-quote-${quote.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground">
                              {quote.totalPrice
                                ? `$${Number(quote.totalPrice).toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`
                                : "N/A"}
                            </div>
                            <div className="text-muted-foreground text-[10px] mt-1">
                              {quote.createdAt
                                ? formatDistanceToNow(new Date(quote.createdAt), {
                                    addSuffix: true,
                                  })
                                : "Unknown"}
                            </div>
                          </div>
                          {quote.source && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] shrink-0"
                              data-testid={`badge-quote-source-${quote.id}`}
                            >
                              {quote.source}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="3d-viewer" className="mt-6">
                <div className="h-[400px] rounded-lg overflow-hidden border border-border">
                  <Suspense fallback={<div className="h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
                    <BuildingViewer3D
                      buildingSpecs={deal?.buildingWidth ? {
                        width: deal.buildingWidth,
                        length: deal.buildingLength || undefined,
                        height: deal.buildingHeight || undefined,
                        roofStyle: deal.roofStyle || undefined,
                        color: deal.color || undefined,
                      } : undefined}
                    />
                  </Suspense>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-6">
                <ActivityTimeline activities={activities} />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>

      {/* Right Side - Configurator */}
      <div className="w-[65%] flex flex-col h-full bg-background overflow-hidden">
        <div className="p-3 border-b shrink-0">
          <h3 className="font-semibold text-sm" data-testid="text-configurator-title">Building Configurator</h3>
        </div>
        <div className="flex-1 overflow-hidden w-full">
          <Suspense fallback={<ConfiguratorSkeleton />}>
            <LeadConfiguratorEmbed 
              key={lead.id} 
              lead={lead}
              leadId={leadId!}
              onLeadUpdated={handleLeadUpdated} 
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
