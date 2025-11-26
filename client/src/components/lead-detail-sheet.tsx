import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { FileCheck, Sparkles, DollarSign } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LeadConfiguratorEmbed } from "@/configurator/LeadConfiguratorEmbed";

interface LeadDetailSheetProps {
  lead: Lead | null;
  deal?: Deal;
  activities: Activity[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerateContract?: () => void;
  onUnstickDeal?: () => void;
  onLeadUpdate?: (updatedLead: Lead) => void;
}

export function LeadDetailSheet({
  lead,
  deal,
  activities,
  open,
  onOpenChange,
  onGenerateContract,
  onUnstickDeal,
  onLeadUpdate,
}: LeadDetailSheetProps) {
  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full p-0 max-w-full">
        <div className="h-full flex flex-col md:flex-row">
          {/* Left Side - Lead Details */}
          <div className="w-full md:w-[35%] md:border-r border-border flex flex-col h-full">
            <SheetHeader className="p-6 pb-4 border-b shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-2xl truncate" data-testid="text-lead-title">
                    {lead.companyName}
                  </SheetTitle>
                  <p className="text-muted-foreground mt-1 truncate">{lead.contactName}</p>
                </div>
                <TemperatureBadge temperature={lead.temperature as any} className="shrink-0" />
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline">{lead.email}</Badge>
                <Badge variant="outline">{lead.phone}</Badge>
                <Badge variant="secondary">{lead.source}</Badge>
              </div>
            </SheetHeader>

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

          {/* Right Side - Configurator */}
          <div className="w-full md:w-[65%] md:border-r-0 flex flex-col h-full bg-background">
            <div className="p-4 border-b shrink-0">
              <h3 className="font-semibold text-sm" data-testid="text-configurator-title">Building Configurator</h3>
            </div>
            <div className="flex-1 overflow-hidden">
              <LeadConfiguratorEmbed lead={lead} onSave={onLeadUpdate} />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
