import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { lazy, Suspense, useState, useEffect } from "react";
import { Lead, Activity, Deal, LeadQuote, LeadHistory, DISPOSITIONS, STAGES } from "@shared/schema";
import { ActionButtons } from "@/components/action-buttons";
import { AIMessageCard } from "@/components/ai-message-card";
import { PricingBreakdown } from "@/components/pricing-breakdown";
import { ActivityTimeline } from "@/components/activity-timeline";
import { TemperatureBadge } from "@/components/temperature-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileCheck, Sparkles, DollarSign, ArrowLeft, Send, User, Clock, MessageSquare, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { getDayDiff } from "@/lib/date-utils";

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

const DISPOSITION_LABELS: Record<string, string> = {
  LEFT_VOICEMAIL: "Left Voicemail",
  NO_ANSWER: "No Answer",
  NO_SHOW: "No Show",
  SPOKE_WITH: "Spoke With",
  BOOKED_CALL: "Booked Call",
  SENT_QUOTE: "Sent Quote",
  FOLLOW_UP: "Follow Up",
  NOT_INTERESTED: "Not Interested",
  COMPETITOR: "Competitor",
  SOLD: "Sold",
  CANCELED: "Canceled",
};

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  working: "Working",
  callback: "Callback",
  welcome: "Welcome",
  quote_sent: "Quote Sent",
  negotiating: "Negotiating",
  storage: "Storage",
  building_prep: "Building Prep",
  pending_delivery: "Pending Delivery",
  sold: "Sold",
  canceled: "Canceled",
};

const PROJECT_STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "engineering", label: "Engineering" },
  { value: "fabrication", label: "Fabrication" },
  { value: "delivery_scheduled", label: "Delivery Scheduled" },
  { value: "delivered", label: "Delivered" },
  { value: "closed_out", label: "Closed Out" },
] as const;

const PROJECT_STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  engineering: "Engineering",
  fabrication: "Fabrication",
  delivery_scheduled: "Delivery Scheduled",
  delivered: "Delivered",
  closed_out: "Closed Out",
};

type DispositionTemplateId =
  | "NO_SHOW"
  | "LEFT_VM"
  | "CALLBACK_3_DAYS"
  | "CALLBACK_7_DAYS"
  | "NOT_INTERESTED";

interface DispositionTemplate {
  id: DispositionTemplateId;
  label: string;
  dispositionText: string;
  defaultNote?: string;
  callbackOffsetDays?: number;
}

const DISPOSITION_TEMPLATES: DispositionTemplate[] = [
  { id: "NO_SHOW", label: "No Show", dispositionText: "NO_SHOW", callbackOffsetDays: 3 },
  { id: "LEFT_VM", label: "Left VM", dispositionText: "LEFT_VOICEMAIL" },
  { id: "CALLBACK_3_DAYS", label: "Call in 3 Days", dispositionText: "BOOKED_CALL", callbackOffsetDays: 3 },
  { id: "CALLBACK_7_DAYS", label: "Call in 7 Days", dispositionText: "FOLLOW_UP", callbackOffsetDays: 7 },
  { id: "NOT_INTERESTED", label: "Not Interested", dispositionText: "NOT_INTERESTED" },
];

function LeadHistoryItem({ entry, user }: { entry: LeadHistory; user?: { id: string; name: string } }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Card
      className="cursor-pointer transition-all hover-elevate"
      onClick={() => setIsOpen(!isOpen)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsOpen(!isOpen);
        }
      }}
      data-testid={`card-history-item-${entry.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[9px]">
                {DISPOSITION_LABELS[entry.disposition || ""] || entry.disposition}
              </Badge>
              {entry.newStage && entry.prevStage && (
                <Badge variant="secondary" className="text-[9px]">
                  {STAGE_LABELS[entry.prevStage]} → {STAGE_LABELS[entry.newStage]}
                </Badge>
              )}
              <span className="text-[9px] text-muted-foreground ml-auto">
                {user?.name || "Unknown"} • {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          <div className="text-muted-foreground flex-shrink-0">
            {isOpen ? "−" : "+"}
          </div>
        </div>

        {isOpen && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            {entry.note && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">Note</p>
                <p className="text-xs text-foreground">{entry.note}</p>
              </div>
            )}
            {entry.newStage && entry.prevStage && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">Stage Change</p>
                <p className="text-xs text-foreground">
                  {STAGE_LABELS[entry.prevStage]} → {STAGE_LABELS[entry.newStage]}
                </p>
              </div>
            )}
            {entry.disposition && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">Disposition Code</p>
                <p className="text-xs text-foreground font-mono">{entry.disposition}</p>
              </div>
            )}
            {entry.nextCallbackAt && (
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground">Next Callback</p>
                  <p className="text-xs text-foreground">{format(new Date(entry.nextCallbackAt), "MMM d, yyyy h:mm a")}</p>
                </div>
              </div>
            )}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{user?.name || "Unknown"}</span>
                </div>
                <span className="text-[9px] text-muted-foreground">{format(new Date(entry.createdAt), "MMM d, yyyy h:mm:ss a")}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LeadEditPage() {
  const [, params] = useRoute("/sales/leads/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const leadId = params?.id;

  const [disposition, setDisposition] = useState<string>("");
  const [newStage, setNewStage] = useState<string>("");
  const [note, setNote] = useState("");
  const [nextCallbackAt, setNextCallbackAt] = useState("");
  const [statusValue, setStatusValue] = useState<string>("");
  const [activeTemplateId, setActiveTemplateId] = useState<DispositionTemplateId | null>(null);

  const [projectStatus, setProjectStatus] = useState<string>("");
  const [projectTargetDeliveryDate, setProjectTargetDeliveryDate] = useState<string>("");
  const [projectNotes, setProjectNotes] = useState<string>("");

  const handleTemplateClick = (template: DispositionTemplate) => {
    setActiveTemplateId(template.id);
    setDisposition(template.dispositionText);
    
    if (template.defaultNote && !note) {
      setNote(template.defaultNote);
    }
    
    if (template.callbackOffsetDays) {
      const callbackDate = new Date();
      callbackDate.setDate(callbackDate.getDate() + template.callbackOffsetDays);
      callbackDate.setHours(9, 0, 0, 0);
      const formatted = callbackDate.toISOString().slice(0, 16);
      setNextCallbackAt(formatted);
    }
  };

  const handleDispositionChange = (value: string) => {
    setDisposition(value);
    const matchingTemplate = DISPOSITION_TEMPLATES.find(t => t.dispositionText === value);
    if (!matchingTemplate || matchingTemplate.id !== activeTemplateId) {
      setActiveTemplateId(null);
    }
  };

  const { data: queryLead, isLoading: isLoadingLead } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    queryFn: () => fetch(`/api/leads/${leadId}`).then(r => r.json()),
    enabled: !!leadId,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  const [localLead, setLocalLead] = useState<Lead | null>(null);
  
  useEffect(() => {
    if (queryLead) {
      console.log('[lead-edit] Query lead updated:', queryLead.totalPrice);
      setLocalLead(queryLead);
      setProjectStatus(queryLead.projectStatus || "");
      setProjectNotes(queryLead.projectNotes || "");
      if (queryLead.projectTargetDeliveryDate) {
        const date = new Date(queryLead.projectTargetDeliveryDate);
        setProjectTargetDeliveryDate(date.toISOString().split("T")[0]);
      } else {
        setProjectTargetDeliveryDate("");
      }
    }
  }, [queryLead]);
  
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

  const { data: history = [], isLoading: historyLoading } = useQuery<LeadHistory[]>({
    queryKey: ["/api/leads", leadId, "history"],
    enabled: !!leadId,
  });

  const { data: users = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/users"],
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest("PATCH", `/api/leads/${leadId}`, { status });
    },
    onSuccess: (data) => {
      toast({ title: "Status updated", description: "Lead status changed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  const dispositionMutation = useMutation({
    mutationFn: async (data: { disposition: string; newStage?: string; note?: string; nextCallbackAt?: string }) => {
      const res = await apiRequest("POST", `/api/leads/${leadId}/dispositions`, data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Disposition saved", description: "Lead updated successfully" });
      if (data.lead) {
        setLocalLead(data.lead);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setDisposition("");
      setNewStage("");
      setNote("");
      setNextCallbackAt("");
      setActiveTemplateId(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to save disposition", variant: "destructive" });
    },
  });

  const projectMutation = useMutation({
    mutationFn: async (data: { projectStatus?: string | null; projectTargetDeliveryDate?: string | null; projectNotes?: string | null }) => {
      return await apiRequest("PATCH", `/api/leads/${leadId}`, data);
    },
    onSuccess: async (res) => {
      const updatedLead = await res.json();
      toast({ title: "Project saved", description: "Project information updated successfully" });
      setLocalLead(updatedLead);
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save project info", variant: "destructive" });
    },
  });

  const handleSaveProject = () => {
    projectMutation.mutate({
      projectStatus: projectStatus || null,
      projectTargetDeliveryDate: projectTargetDeliveryDate || null,
      projectNotes: projectNotes || null,
    });
  };

  const handleSaveDisposition = () => {
    if (!disposition) {
      toast({ title: "Required", description: "Please select a disposition", variant: "destructive" });
      return;
    }
    dispositionMutation.mutate({
      disposition,
      newStage: newStage || undefined,
      note: note || undefined,
      nextCallbackAt: nextCallbackAt || undefined,
    });
  };

  const deal = lead ? deals.find((d) => d.leadId === lead.id) : undefined;

  const handleBack = () => {
    navigate("/sales");
  };

  const handleLeadUpdated = (updatedLead: Lead) => {
    console.log('[lead-edit] handleLeadUpdated called with:', updatedLead.totalPrice);
    setLocalLead(updatedLead);
  };

  const handleDownloadQuotePdf = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/quotes/${quoteId}/pdf`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to download PDF");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Quote-${leadId}-${quoteId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
      toast({ title: "PDF downloaded successfully" });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to download PDF", variant: "destructive" });
    }
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
          <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
            <div>
              <p className="font-semibold">Days on Stage</p>
              <p className="text-sm">{getDayDiff(lead.stageEnteredAt) ?? 0} days</p>
            </div>
            <div>
              <p className="font-semibold">Days Since Dispo</p>
              <p className="text-sm">{getDayDiff(lead.lastDispositionAt) ?? "N/A"}</p>
            </div>
            <div>
              <p className="font-semibold">Project</p>
              <Badge 
                variant={lead.projectStatus ? "secondary" : "outline"} 
                className="text-[10px] mt-0.5"
                data-testid="badge-project-status"
              >
                {PROJECT_STATUS_LABELS[lead.projectStatus || ""] || "Not Started"}
              </Badge>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6 h-8">
                <TabsTrigger value="overview" data-testid="tab-overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="project" data-testid="tab-project" className="text-xs">Project</TabsTrigger>
                <TabsTrigger value="history" data-testid="tab-history" className="text-xs">History</TabsTrigger>
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

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Pipeline Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <Label className="text-xs">Status</Label>
                      <Select 
                        value={statusValue || lead?.status || ""} 
                        onValueChange={(val) => {
                          setStatusValue(val);
                          statusMutation.mutate(val);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs" data-testid="select-pipeline-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new" className="text-xs">New</SelectItem>
                          <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                          <SelectItem value="sold" className="text-xs">Sold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Disposition & Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {DISPOSITION_TEMPLATES.map((template) => (
                        <Button
                          key={template.id}
                          type="button"
                          size="sm"
                          variant={activeTemplateId === template.id ? "default" : "outline"}
                          className="h-7 text-[10px] px-2"
                          onClick={() => handleTemplateClick(template)}
                          data-testid={`button-template-${template.id}`}
                        >
                          {template.label}
                          {template.callbackOffsetDays && (
                            <Clock className="h-3 w-3 ml-1 opacity-60" />
                          )}
                        </Button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Disposition</Label>
                        <Select value={disposition} onValueChange={handleDispositionChange}>
                          <SelectTrigger className="h-8 text-xs" data-testid="select-disposition">
                            <SelectValue placeholder="Select disposition" />
                          </SelectTrigger>
                          <SelectContent>
                            {DISPOSITIONS.map((d) => (
                              <SelectItem key={d} value={d} className="text-xs">
                                {DISPOSITION_LABELS[d] || d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Stage (optional)</Label>
                        <Select value={newStage} onValueChange={setNewStage}>
                          <SelectTrigger className="h-8 text-xs" data-testid="select-stage">
                            <SelectValue placeholder={STAGE_LABELS[lead.stage] || lead.stage} />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGES.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                {STAGE_LABELS[s] || s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Next Callback (optional)</Label>
                      <Input
                        type="datetime-local"
                        value={nextCallbackAt}
                        onChange={(e) => setNextCallbackAt(e.target.value)}
                        className="h-8 text-xs"
                        data-testid="input-next-callback"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Note (optional)</Label>
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a note about this interaction..."
                        className="text-xs resize-none"
                        rows={2}
                        data-testid="input-disposition-note"
                      />
                    </div>
                    <Button
                      onClick={handleSaveDisposition}
                      disabled={dispositionMutation.isPending || !disposition}
                      className="w-full h-8 text-xs gap-2"
                      data-testid="button-save-disposition"
                    >
                      <Send className="h-3 w-3" />
                      {dispositionMutation.isPending ? "Saving..." : "Save Disposition"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="project" className="space-y-3 mt-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Project Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Status</Label>
                      <Select value={projectStatus} onValueChange={setProjectStatus}>
                        <SelectTrigger className="h-8 text-xs" data-testid="select-project-status">
                          <SelectValue placeholder="Select project status" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-xs">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Target Delivery Date</Label>
                      <Input
                        type="date"
                        value={projectTargetDeliveryDate}
                        onChange={(e) => setProjectTargetDeliveryDate(e.target.value)}
                        className="h-8 text-xs"
                        data-testid="input-project-target-date"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Project Notes</Label>
                      <Textarea
                        value={projectNotes}
                        onChange={(e) => setProjectNotes(e.target.value)}
                        placeholder="Internal project notes (engineering, fabrication, delivery details...)"
                        className="text-xs resize-none"
                        rows={4}
                        data-testid="input-project-notes"
                      />
                    </div>

                    <Button
                      onClick={handleSaveProject}
                      disabled={projectMutation.isPending}
                      className="w-full h-8 text-xs"
                      data-testid="button-save-project"
                    >
                      {projectMutation.isPending ? "Saving..." : "Save Project"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-3 space-y-3">
                {historyLoading && (
                  <div className="text-xs text-muted-foreground">Loading history...</div>
                )}
                {!historyLoading && history.length === 0 && (
                  <div className="text-xs text-muted-foreground">No disposition history yet.</div>
                )}
                <div className="space-y-2">
                  {history.map((entry) => {
                    const user = users.find((u) => u.id === entry.createdByUserId);
                    return <LeadHistoryItem key={entry.id} entry={entry} user={user} />;
                  })}
                </div>
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
                          <div className="flex items-center gap-2">
                            {quote.source && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] shrink-0"
                                data-testid={`badge-quote-source-${quote.id}`}
                              >
                                {quote.source}
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadQuotePdf(quote.id)}
                              data-testid={`button-download-pdf-${quote.id}`}
                              className="h-6 text-[10px] gap-1"
                            >
                              <Download className="h-3 w-3" />
                              PDF
                            </Button>
                          </div>
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
