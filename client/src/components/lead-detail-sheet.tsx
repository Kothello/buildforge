import { Lead, Activity, Deal } from "@shared/schema";
import { BuildingViewer3D } from "./building-viewer-3d";
import { ActionButtons } from "./action-buttons";
import { AIMessageCard } from "./ai-message-card";
import { PricingBreakdown } from "./pricing-breakdown";
import { ActivityTimeline } from "./activity-timeline";
import { TemperatureBadge } from "./temperature-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCheck, Sparkles, DollarSign, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LeadConfiguratorEmbed } from "@/configurator/LeadConfiguratorEmbed";

interface LeadDetailViewProps {
  lead: Lead;
  deal?: Deal;
  activities: Activity[];
  onClose?: () => void;
  onGenerateContract?: () => void;
  onUnstickDeal?: () => void;
  onLeadUpdate?: (updatedLead: Lead) => void;
}

export function LeadDetailView({
  lead,
  deal,
  activities,
  onClose,
  onGenerateContract,
  onUnstickDeal,
  onLeadUpdate,
}: LeadDetailViewProps) {
  return (
    <div className="h-full w-full flex flex-col lg:flex-row bg-background">
      {/* Left Side - Lead Details (40%) */}
      <div className="w-full lg:w-[40%] lg:border-r border-border flex flex-col h-full">
        <div className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-semibold truncate" data-testid="text-lead-title">
                {lead.companyName}
              </h2>
              <p className="text-muted-foreground mt-1 truncate">{lead.contactName}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <TemperatureBadge temperature={lead.temperature as any} />
              {onClose && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose}
                  data-testid="button-close-lead"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline">{lead.email}</Badge>
            <Badge variant="outline">{lead.phone}</Badge>
            <Badge variant="secondary">{lead.source}</Badge>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="3d-viewer" data-testid="tab-3d">3D View</TabsTrigger>
                <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
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
                  buildingSpecs={deal?.buildingWidth ? {
                    width: deal.buildingWidth,
                    length: deal.buildingLength || undefined,
                    height: deal.buildingHeight || undefined,
                    roofStyle: deal.roofStyle || undefined,
                  } : undefined}
                  cost={deal?.cost ? parseFloat(deal.cost) : undefined}
                  price={deal?.price ? parseFloat(deal.price) : undefined}
                  margin={deal?.margin ? parseFloat(deal.margin) : undefined}
                />

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 text-xs sm:text-sm"
                    onClick={onGenerateContract}
                    data-testid="button-generate-contract"
                  >
                    <FileCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Generate Contract</span>
                    <span className="sm:hidden">Contract</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 text-xs sm:text-sm"
                    onClick={onUnstickDeal}
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

              <TabsContent value="3d-viewer" className="mt-6">
                <div className="h-[400px] rounded-lg overflow-hidden border border-border">
                  <BuildingViewer3D
                    buildingSpecs={deal?.buildingWidth ? {
                      width: deal.buildingWidth,
                      length: deal.buildingLength || undefined,
                      height: deal.buildingHeight || undefined,
                      roofStyle: deal.roofStyle || undefined,
                      color: deal.color || undefined,
                    } : undefined}
                  />
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-6">
                <ActivityTimeline activities={activities} />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>

      {/* Right Side - Configurator (60%) */}
      <div className="w-full lg:w-[60%] flex flex-col h-full bg-background">
        <div className="p-4 border-b shrink-0">
          <h3 className="font-semibold text-sm" data-testid="text-configurator-title">Building Configurator</h3>
        </div>
        <div className="flex-1 overflow-hidden">
          <LeadConfiguratorEmbed lead={lead} onSave={onLeadUpdate} />
        </div>
      </div>
    </div>
  );
}
