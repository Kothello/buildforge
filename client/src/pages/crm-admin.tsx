import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, GripVertical, Users, Layers, Settings, Save, Loader2 } from "lucide-react";
import type { User, PipelineStage } from "@shared/schema";

export default function CrmAdminPage() {
  const { toast } = useToast();
  
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "REP" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [stageForm, setStageForm] = useState({ name: "", order: 0, isClosed: false, isWon: false, color: "#6B7280" });

  const [settingsForm, setSettingsForm] = useState<Record<string, any>>({});

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: stages = [], isLoading: stagesLoading } = useQuery<PipelineStage[]>({
    queryKey: ["/api/admin/pipeline-stages"],
  });

  const { data: settings = {}, isLoading: settingsLoading } = useQuery<Record<string, any>>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      setSettingsForm(data);
      return data;
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof userForm) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsUserDialogOpen(false);
      setUserForm({ name: "", email: "", password: "", role: "REP" });
      toast({ title: "User created successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to create user", description: error.message });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const response = await apiRequest("PATCH", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      setUserForm({ name: "", email: "", password: "", role: "REP" });
      toast({ title: "User updated successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to update user", description: error.message });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log("[deleteUserMutation] Starting delete for ID:", id);
      try {
        const response = await apiRequest("DELETE", `/api/users/${id}`);
        console.log("[deleteUserMutation] Response status:", response.status);
        const data = await response.json();
        console.log("[deleteUserMutation] Response data:", data);
        return data;
      } catch (error) {
        console.error("[deleteUserMutation] Error during delete:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("[deleteUserMutation] onSuccess called with data:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowDeleteConfirm(false);
      setDeleteText("");
      setEditingUser(null);
      setIsUserDialogOpen(false);
      toast({ title: "User deleted successfully" });
    },
    onError: (error: any) => {
      console.error("[deleteUserMutation] onError called:", error);
      toast({ variant: "destructive", title: "Failed to delete user", description: error.message });
    },
  });

  const createStageMutation = useMutation({
    mutationFn: async (data: typeof stageForm) => {
      const response = await apiRequest("POST", "/api/admin/pipeline-stages", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pipeline-stages"] });
      setIsStageDialogOpen(false);
      setStageForm({ name: "", order: 0, isClosed: false, isWon: false, color: "#6B7280" });
      toast({ title: "Stage created successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to create stage", description: error.message });
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PipelineStage> }) => {
      const response = await apiRequest("PATCH", `/api/admin/pipeline-stages/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pipeline-stages"] });
      setEditingStage(null);
      setStageForm({ name: "", order: 0, isClosed: false, isWon: false, color: "#6B7280" });
      toast({ title: "Stage updated successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to update stage", description: error.message });
    },
  });

  const deleteStageMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/pipeline-stages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pipeline-stages"] });
      toast({ title: "Stage deleted" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to delete stage", description: error.message });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await apiRequest("PUT", "/api/admin/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to save settings", description: error.message });
    },
  });

  const handleUserSubmit = () => {
    if (editingUser) {
      const updates: any = { name: userForm.name, email: userForm.email, role: userForm.role };
      if (userForm.password) updates.password = userForm.password;
      updateUserMutation.mutate({ id: editingUser.id, data: updates });
    } else {
      createUserMutation.mutate(userForm);
    }
  };

  const handleConfirmDelete = () => {
    if (!editingUser || deleteText.trim() !== "Delete") return;
    deleteUserMutation.mutate(editingUser.id);
  };

  const handleStageSubmit = () => {
    if (editingStage) {
      updateStageMutation.mutate({ id: editingStage.id, data: stageForm });
    } else {
      createStageMutation.mutate(stageForm);
    }
  };

  const openEditUserDialog = (user: User) => {
    setEditingUser(user);
    setUserForm({ name: user.name, email: user.email, password: "", role: user.role });
  };

  const openEditStageDialog = (stage: PipelineStage) => {
    setEditingStage(stage);
    setStageForm({
      name: stage.name,
      order: stage.order,
      isClosed: stage.isClosed,
      isWon: stage.isWon,
      color: stage.color || "#6B7280",
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ADMIN": return "destructive";
      case "MANAGER": return "default";
      default: return "secondary";
    }
  };

  return (
    <div className="p-4 sm:p-6 h-full overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground">Manage users, pipeline stages, and settings</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="pipeline" data-testid="tab-pipeline">
            <Layers className="h-4 w-4 mr-2" />
            Pipeline Stages
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and roles</CardDescription>
              </div>
              <Dialog open={isUserDialogOpen || !!editingUser} onOpenChange={(open) => {
                if (!open) {
                  setIsUserDialogOpen(false);
                  setEditingUser(null);
                  setUserForm({ name: "", email: "", password: "", role: "REP" });
                  setShowDeleteConfirm(false);
                  setDeleteText("");
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setIsUserDialogOpen(true)} data-testid="button-create-user">
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
                  </DialogHeader>
                  {!showDeleteConfirm ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={userForm.name}
                          onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                          placeholder="Full name"
                          data-testid="input-user-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={userForm.email}
                          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          placeholder="email@company.com"
                          data-testid="input-user-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{editingUser ? "New Password (leave blank to keep current)" : "Password"}</Label>
                        <Input
                          type="password"
                          value={userForm.password}
                          onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                          placeholder={editingUser ? "Enter new password" : "Create password"}
                          data-testid="input-user-password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                          <SelectTrigger data-testid="select-user-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="REP">Sales Rep</SelectItem>
                            <SelectItem value="MANAGER">Manager</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-3">
                        <Button
                          className="w-full"
                          onClick={handleUserSubmit}
                          disabled={!userForm.name || !userForm.email || (!editingUser && !userForm.password) || createUserMutation.isPending || updateUserMutation.isPending}
                          data-testid="button-submit-user"
                        >
                          {createUserMutation.isPending || updateUserMutation.isPending
                            ? "Saving..."
                            : editingUser
                            ? "Update User"
                            : "Create User"}
                        </Button>
                        {editingUser && (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={createUserMutation.isPending || updateUserMutation.isPending}
                            data-testid="button-delete-user"
                          >
                            Delete User
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Are you sure you want to delete this user? Type "Delete" to confirm.
                      </div>
                      <Input
                        type="text"
                        value={deleteText}
                        onChange={(e) => setDeleteText(e.target.value)}
                        placeholder='Type "Delete" to confirm'
                        data-testid="input-delete-confirm"
                      />
                      <div className="flex gap-3 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteText("");
                          }}
                          disabled={deleteUserMutation.isPending}
                          data-testid="button-cancel-delete"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleConfirmDelete}
                          disabled={deleteText.trim() !== "Delete" || deleteUserMutation.isPending}
                          data-testid="button-confirm-delete"
                        >
                          {deleteUserMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Deleting...
                            </>
                          ) : (
                            "Delete"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={user.active}
                            onCheckedChange={(checked) => updateUserMutation.mutate({ id: user.id, data: { active: checked } })}
                            data-testid={`switch-user-active-${user.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditUserDialog(user)}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pipeline Stages</CardTitle>
                <CardDescription>Configure your sales pipeline stages</CardDescription>
              </div>
              <Dialog open={isStageDialogOpen || !!editingStage} onOpenChange={(open) => {
                if (!open) {
                  setIsStageDialogOpen(false);
                  setEditingStage(null);
                  setStageForm({ name: "", order: 0, isClosed: false, isWon: false, color: "#6B7280" });
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setIsStageDialogOpen(true)} data-testid="button-create-stage">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stage
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingStage ? "Edit Stage" : "Create New Stage"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={stageForm.name}
                        onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                        placeholder="Stage name"
                        data-testid="input-stage-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Order</Label>
                      <Input
                        type="number"
                        value={stageForm.order}
                        onChange={(e) => setStageForm({ ...stageForm, order: parseInt(e.target.value) || 0 })}
                        data-testid="input-stage-order"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Is Closed Stage</Label>
                      <Switch
                        checked={stageForm.isClosed}
                        onCheckedChange={(checked) => setStageForm({ ...stageForm, isClosed: checked })}
                        data-testid="switch-stage-closed"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Is Won Stage</Label>
                      <Switch
                        checked={stageForm.isWon}
                        onCheckedChange={(checked) => setStageForm({ ...stageForm, isWon: checked, isClosed: checked ? true : stageForm.isClosed })}
                        data-testid="switch-stage-won"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleStageSubmit}
                      disabled={!stageForm.name || createStageMutation.isPending || updateStageMutation.isPending}
                      data-testid="button-submit-stage"
                    >
                      {createStageMutation.isPending || updateStageMutation.isPending
                        ? "Saving..."
                        : editingStage
                        ? "Update Stage"
                        : "Create Stage"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {stagesLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Closed</TableHead>
                      <TableHead>Won</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stages.map((stage) => (
                      <TableRow key={stage.id} data-testid={`stage-row-${stage.id}`}>
                        <TableCell>
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell className="font-medium">{stage.name}</TableCell>
                        <TableCell>{stage.order}</TableCell>
                        <TableCell>
                          {stage.isClosed && <Badge variant="secondary">Closed</Badge>}
                        </TableCell>
                        <TableCell>
                          {stage.isWon && <Badge variant="default">Won</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditStageDialog(stage)}
                              data-testid={`button-edit-stage-${stage.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteStageMutation.mutate(stage.id)}
                              data-testid={`button-delete-stage-${stage.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {stages.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No stages configured. Add your first pipeline stage.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure system-wide settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <Skeleton className="h-32" />
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Minimum Margin Percent</Label>
                    <Input
                      type="number"
                      value={settingsForm.MIN_MARGIN_PERCENT || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, MIN_MARGIN_PERCENT: parseFloat(e.target.value) || 0 })}
                      placeholder="15"
                      data-testid="input-min-margin"
                    />
                    <p className="text-sm text-muted-foreground">
                      The minimum profit margin required for deals
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Default Pipeline Stage</Label>
                    <Select
                      value={settingsForm.DEFAULT_STAGE_ID || ""}
                      onValueChange={(v) => setSettingsForm({ ...settingsForm, DEFAULT_STAGE_ID: v })}
                    >
                      <SelectTrigger data-testid="select-default-stage">
                        <SelectValue placeholder="Select default stage" />
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
                    onClick={() => saveSettingsMutation.mutate(settingsForm)}
                    disabled={saveSettingsMutation.isPending}
                    data-testid="button-save-settings"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
