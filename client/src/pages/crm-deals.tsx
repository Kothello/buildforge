import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, LayoutGrid, Table as TableIcon, DollarSign, User, Building } from "lucide-react";
import type { CrmDeal, PipelineStage, Contact, User as UserType } from "@shared/schema";

export default function CrmDealsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDeal, setNewDeal] = useState({ title: "", amount: "", contactId: "", stageId: "" });

  const { data: deals = [], isLoading: dealsLoading } = useQuery<CrmDeal[]>({
    queryKey: ["/api/crm/deals"],
  });

  const { data: stages = [], isLoading: stagesLoading } = useQuery<PipelineStage[]>({
    queryKey: ["/api/admin/pipeline-stages"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const createDealMutation = useMutation({
    mutationFn: async (dealData: { title: string; amount: string; contactId?: string; stageId?: string }) => {
      const response = await apiRequest("POST", "/api/crm/deals", {
        ...dealData,
        amount: dealData.amount || "0",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals"] });
      setIsCreateDialogOpen(false);
      setNewDeal({ title: "", amount: "", contactId: "", stageId: "" });
      toast({ title: "Deal created successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to create deal", description: error.message });
    },
  });

  const updateDealStageMutation = useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      const response = await apiRequest("PATCH", `/api/crm/deals/${dealId}/stage`, { stageId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals"] });
    },
  });

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData("dealId", dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("dealId");
    if (dealId) {
      updateDealStageMutation.mutate({ dealId, stageId });
    }
  };

  const getStageColor = (stage: PipelineStage) => {
    if (stage.isWon) return "bg-green-500/20 text-green-500 border-green-500/30";
    if (stage.isClosed) return "bg-red-500/20 text-red-500 border-red-500/30";
    return "bg-blue-500/20 text-blue-500 border-blue-500/30";
  };

  const formatCurrency = (amount: string | null | undefined) => {
    const num = parseFloat(amount || "0");
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };

  const getContactName = (contactId: string | null) => {
    if (!contactId) return "No contact";
    const contact = contacts.find(c => c.id === contactId);
    return contact?.name || "Unknown";
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const user = users.find(u => u.id === userId);
    return user?.name || "Unknown";
  };

  if (dealsLoading || stagesLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-96 w-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Deals Pipeline</h1>
          <p className="text-muted-foreground">Manage your sales deals</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "kanban" | "table")}>
            <TabsList>
              <TabsTrigger value="kanban" data-testid="button-view-kanban">
                <LayoutGrid className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="table" data-testid="button-view-table">
                <TableIcon className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-deal">
                <Plus className="h-4 w-4 mr-2" />
                New Deal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Deal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newDeal.title}
                    onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                    placeholder="Deal title"
                    data-testid="input-deal-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={newDeal.amount}
                    onChange={(e) => setNewDeal({ ...newDeal, amount: e.target.value })}
                    placeholder="0.00"
                    data-testid="input-deal-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact</Label>
                  <Select value={newDeal.contactId} onValueChange={(v) => setNewDeal({ ...newDeal, contactId: v })}>
                    <SelectTrigger data-testid="select-deal-contact">
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={newDeal.stageId} onValueChange={(v) => setNewDeal({ ...newDeal, stageId: v })}>
                    <SelectTrigger data-testid="select-deal-stage">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={() => createDealMutation.mutate(newDeal)}
                  disabled={!newDeal.title || createDealMutation.isPending}
                  data-testid="button-submit-deal"
                >
                  {createDealMutation.isPending ? "Creating..." : "Create Deal"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === "kanban" ? (
        <div className="flex-1 overflow-x-auto min-h-0">
          <div className="flex gap-4 h-full pb-4" style={{ minWidth: `${stages.length * 280}px` }}>
            {stages.map((stage) => {
              const stageDeals = deals.filter((d) => d.stageId === stage.id);
              const stageTotal = stageDeals.reduce((sum, d) => sum + parseFloat(d.amount || "0"), 0);

              return (
                <div
                  key={stage.id}
                  className="w-72 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  data-testid={`stage-column-${stage.id}`}
                >
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{stage.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {stageDeals.length}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatCurrency(stageTotal.toString())}
                    </p>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                    {stageDeals.map((deal) => (
                      <Card
                        key={deal.id}
                        className="cursor-pointer hover-elevate"
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onClick={() => setLocation(`/crm/deals/${deal.id}`)}
                        data-testid={`deal-card-${deal.id}`}
                      >
                        <CardContent className="p-3 space-y-2">
                          <h4 className="font-medium text-sm truncate">{deal.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(deal.amount)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building className="h-3 w-3" />
                            {getContactName(deal.contactId)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {getUserName(deal.ownerId)}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => {
                const stage = stages.find((s) => s.id === deal.stageId);
                return (
                  <TableRow
                    key={deal.id}
                    className="cursor-pointer"
                    onClick={() => setLocation(`/crm/deals/${deal.id}`)}
                    data-testid={`deal-row-${deal.id}`}
                  >
                    <TableCell className="font-medium">{deal.title}</TableCell>
                    <TableCell>{formatCurrency(deal.amount)}</TableCell>
                    <TableCell>
                      {stage && (
                        <Badge className={getStageColor(stage)}>{stage.name}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{getContactName(deal.contactId)}</TableCell>
                    <TableCell>{getUserName(deal.ownerId)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(deal.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
              {deals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No deals yet. Create your first deal to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
