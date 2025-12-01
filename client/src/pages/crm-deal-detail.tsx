import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  ArrowLeft,
  DollarSign,
  Building,
  User,
  Calendar,
  Clock,
  StickyNote,
  CheckSquare,
  Activity,
  Plus,
} from "lucide-react";
import type { CrmDeal, PipelineStage, Contact, User as UserType, DealNote, Task, DealActivity } from "@shared/schema";

export default function CrmDealDetailPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const dealId = params.id;

  const [newNote, setNewNote] = useState("");
  const [newTask, setNewTask] = useState({ title: "", dueDate: "" });

  const { data: deal, isLoading: dealLoading } = useQuery<CrmDeal>({
    queryKey: ["/api/crm/deals", dealId],
    enabled: !!dealId,
  });

  const { data: stages = [] } = useQuery<PipelineStage[]>({
    queryKey: ["/api/admin/pipeline-stages"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: notes = [] } = useQuery<DealNote[]>({
    queryKey: ["/api/crm/deals", dealId, "notes"],
    queryFn: async () => {
      const res = await fetch(`/api/crm/deals/${dealId}/notes`);
      return res.json();
    },
    enabled: !!dealId,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/crm/deals", dealId, "tasks"],
    queryFn: async () => {
      const res = await fetch(`/api/crm/deals/${dealId}/tasks`);
      return res.json();
    },
    enabled: !!dealId,
  });

  const { data: activities = [] } = useQuery<DealActivity[]>({
    queryKey: ["/api/crm/deals", dealId, "activity"],
    queryFn: async () => {
      const res = await fetch(`/api/crm/deals/${dealId}/activity`);
      return res.json();
    },
    enabled: !!dealId,
  });

  const updateDealMutation = useMutation({
    mutationFn: async (updates: Partial<CrmDeal>) => {
      const response = await apiRequest("PATCH", `/api/crm/deals/${dealId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", dealId] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", dealId, "activity"] });
      toast({ title: "Deal updated" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/crm/deals/${dealId}/notes`, {
        content,
        authorId: user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", dealId, "notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", dealId, "activity"] });
      setNewNote("");
      toast({ title: "Note added" });
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: async (taskData: { title: string; dueDate?: string }) => {
      const response = await apiRequest("POST", `/api/crm/deals/${dealId}/tasks`, {
        ...taskData,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null,
        assignedToId: user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", dealId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", dealId, "activity"] });
      setNewTask({ title: "", dueDate: "" });
      toast({ title: "Task added" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", dealId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", dealId, "activity"] });
    },
  });

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
    if (!userId) return "Unknown";
    const foundUser = users.find(u => u.id === userId);
    return foundUser?.name || "Unknown";
  };

  const currentStage = stages.find(s => s.id === deal?.stageId);

  const getActivityDescription = (activity: DealActivity) => {
    const data = activity.data as any;
    switch (activity.type) {
      case "DEAL_CREATED":
        return `Deal created: ${data?.title || "New deal"}`;
      case "STAGE_CHANGED":
        const oldStage = stages.find(s => s.id === data?.oldStageId);
        const newStage = stages.find(s => s.id === data?.newStageId);
        return `Stage changed from ${oldStage?.name || "Unknown"} to ${newStage?.name || "Unknown"}`;
      case "NOTE_ADDED":
        return "Note added";
      case "TASK_CREATED":
        return `Task created: ${data?.title || "New task"}`;
      case "TASK_COMPLETED":
        return `Task completed: ${data?.title || "Task"}`;
      default:
        return activity.type;
    }
  };

  if (dealLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Deal not found</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-4 mb-6 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/crm/deals")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{deal.title}</h1>
          <div className="flex items-center gap-4 text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {formatCurrency(deal.amount)}
            </span>
            <span className="flex items-center gap-1">
              <Building className="h-4 w-4" />
              {getContactName(deal.contactId)}
            </span>
            {currentStage && (
              <Badge variant="secondary">{currentStage.name}</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 overflow-hidden">
        <div className="lg:col-span-2 overflow-auto">
          <Tabs defaultValue="notes" className="h-full flex flex-col">
            <TabsList className="flex-shrink-0">
              <TabsTrigger value="notes" data-testid="tab-notes">
                <StickyNote className="h-4 w-4 mr-2" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="tasks" data-testid="tab-tasks">
                <CheckSquare className="h-4 w-4 mr-2" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity">
                <Activity className="h-4 w-4 mr-2" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="flex-1 mt-4 overflow-hidden flex flex-col">
              <Card className="mb-4 flex-shrink-0">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      data-testid="input-new-note"
                    />
                    <Button
                      onClick={() => addNoteMutation.mutate(newNote)}
                      disabled={!newNote.trim() || addNoteMutation.isPending}
                      data-testid="button-add-note"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <ScrollArea className="flex-1">
                <div className="space-y-3 pr-4">
                  {notes.map((note) => (
                    <Card key={note.id} data-testid={`note-${note.id}`}>
                      <CardContent className="pt-4">
                        <p className="whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {getUserName(note.authorId)}
                          <Clock className="h-3 w-3 ml-2" />
                          {new Date(note.createdAt).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {notes.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No notes yet</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="tasks" className="flex-1 mt-4 overflow-hidden flex flex-col">
              <Card className="mb-4 flex-shrink-0">
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <Input
                      placeholder="Task title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="flex-1"
                      data-testid="input-new-task"
                    />
                    <Input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      className="w-40"
                      data-testid="input-task-due-date"
                    />
                    <Button
                      onClick={() => addTaskMutation.mutate(newTask)}
                      disabled={!newTask.title.trim() || addTaskMutation.isPending}
                      data-testid="button-add-task"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <ScrollArea className="flex-1">
                <div className="space-y-2 pr-4">
                  {tasks.map((task) => (
                    <Card key={task.id} className={task.status === "DONE" ? "opacity-60" : ""} data-testid={`task-${task.id}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={task.status === "DONE"}
                            onCheckedChange={(checked) => {
                              updateTaskMutation.mutate({
                                taskId: task.id,
                                updates: { status: checked ? "DONE" : "OPEN" },
                              });
                            }}
                            data-testid={`checkbox-task-${task.id}`}
                          />
                          <span className={task.status === "DONE" ? "line-through" : ""}>
                            {task.title}
                          </span>
                          {task.dueDate && (
                            <Badge variant="outline" className="ml-auto">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No tasks yet</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="activity" className="flex-1 mt-4 overflow-auto">
              <ScrollArea className="h-full">
                <div className="space-y-3 pr-4">
                  {activities.map((activity) => (
                    <Card key={activity.id} data-testid={`activity-${activity.id}`}>
                      <CardContent className="pt-4">
                        <p className="font-medium">{getActivityDescription(activity)}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          {activity.userId && (
                            <>
                              <User className="h-3 w-3" />
                              {getUserName(activity.userId)}
                            </>
                          )}
                          <Clock className="h-3 w-3 ml-2" />
                          {new Date(activity.createdAt).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {activities.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No activity yet</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select
                  value={deal.stageId || ""}
                  onValueChange={(value) => updateDealMutation.mutate({ stageId: value })}
                >
                  <SelectTrigger data-testid="select-stage">
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

              <div className="space-y-2">
                <Label>Owner</Label>
                <Select
                  value={deal.ownerId || ""}
                  onValueChange={(value) => updateDealMutation.mutate({ ownerId: value })}
                >
                  <SelectTrigger data-testid="select-owner">
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Contact</Label>
                <Select
                  value={deal.contactId || ""}
                  onValueChange={(value) => updateDealMutation.mutate({ contactId: value })}
                >
                  <SelectTrigger data-testid="select-contact">
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

              <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span>{new Date(deal.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Updated</span>
                  <span>{new Date(deal.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
