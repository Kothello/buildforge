import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Pencil, ArrowLeft, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

export default function AdminUsersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedActive, setSelectedActive] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const response = await apiRequest("PATCH", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      setIsDialogOpen(false);
      toast({ title: "User updated successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to update user", description: error.message });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/users/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowDeleteConfirm(false);
      setDeleteText("");
      setEditingUser(null);
      setIsDialogOpen(false);
      toast({ title: "User deleted successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to delete user", description: error.message });
    },
  });

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setSelectedActive(user.active);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      id: editingUser.id,
      data: {
        role: selectedRole,
        active: selectedActive,
      },
    });
  };

  const handleConfirmDelete = () => {
    if (!editingUser || deleteText.trim() !== "Delete") return;
    deleteUserMutation.mutate(editingUser.id);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN": return "destructive";
      case "MANAGER": return "default";
      default: return "secondary";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "REP": return "Sales Rep";
      case "MANAGER": return "Manager";
      case "ADMIN": return "Admin";
      default: return role;
    }
  };

  return (
    <div className="h-full overflow-auto p-3 sm:p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/admin")}
          data-testid="button-back-admin"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts and roles</p>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">All Users</CardTitle>
          <CardDescription>Edit user roles and status</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeColor(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${user.active ? "bg-green-500" : "bg-gray-400"}`} />
                          {user.active ? "Active" : "Inactive"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog open={isDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                          if (!open) {
                            setEditingUser(null);
                            setIsDialogOpen(false);
                            setShowDeleteConfirm(false);
                            setDeleteText("");
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditDialog(user)}
                              data-testid={`button-edit-user-${user.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User: {user.name}</DialogTitle>
                            </DialogHeader>
                            {!showDeleteConfirm ? (
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="role">Role</Label>
                                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger id="role" data-testid="select-role">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="REP">Sales Rep</SelectItem>
                                      <SelectItem value="MANAGER">Manager</SelectItem>
                                      <SelectItem value="ADMIN">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="active">Active Status</Label>
                                  <Switch
                                    id="active"
                                    checked={selectedActive}
                                    onCheckedChange={setSelectedActive}
                                    data-testid="switch-active"
                                  />
                                </div>
                                <div className="flex flex-col gap-3">
                                  <Button
                                    onClick={handleSave}
                                    disabled={updateUserMutation.isPending}
                                    className="w-full"
                                    data-testid="button-save-user"
                                  >
                                    {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={updateUserMutation.isPending}
                                    data-testid="button-delete-user"
                                  >
                                    Delete User
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4 py-4">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
