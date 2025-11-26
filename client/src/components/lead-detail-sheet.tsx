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
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SheetTitle className="text-2xl" data-testid="text-lead-title">
                  {lead.companyName}
                </SheetTitle>
                <p className="text-muted-foreground mt-1">{lead.contactName}</p>
              </div>
              <TemperatureBadge temperature={lead.temperature as any} />
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
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                  <TabsTrigger value="configurator" data-testid="tab-configurator">Config</TabsTrigger>
                  <TabsTrigger value="3d-viewer" data-testid="tab-3d">3D Viewer</TabsTrigger>
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
                      className="flex-1 gap-2"
                      onClick={onGenerateContract}
                      data-testid="button-generate-contract"
                    >
                      <FileCheck className="h-4 w-4" />
                      Generate Contract
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={onUnstickDeal}
                      data-testid="button-unstick-deal"
                    >
                      <Sparkles className="h-4 w-4" />
                      Unstick This Deal
                    </Button>
                  </div>

                  {deal?.contractStatus && deal.contractStatus !== "pending" && (
                    <div className="p-4 rounded-lg bg-accent border border-accent-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Contract Status</p>
                          <p className="text-sm text-muted-foreground capitalize">{deal.contractStatus}</p>
                        </div>
                        {!deal.depositPaid && deal.depositAmount && (
                          <Button variant="default" size="sm" className="gap-2">
                            <DollarSign className="h-4 w-4" />
                            Pay ${parseFloat(deal.depositAmount).toLocaleString()} Deposit
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="configurator" className="mt-6">
                  <LeadConfiguratorEmbed lead={lead} onSave={onLeadUpdate} />
                </TabsContent>

                <TabsContent value="3d-viewer" className="mt-6">
                  <div className="h-[600px] rounded-lg overflow-hidden border border-border">
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
      </SheetContent>
    </Sheet>
  );
}
