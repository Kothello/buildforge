import { useState, useMemo } from "react";
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
import { Pencil, ArrowLeft, Loader2, Plus, Search } from "lucide-react";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

export default function AdminUsersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Edit/Create state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  
  // Form fields
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedActive, setSelectedActive] = useState(true);
  
  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; role: string; active: boolean }) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "User created successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to create user", description: error.message });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "User updated successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to update user", description: error.message });
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setSelectedRole("");
    setSelectedActive(true);
    setIsCreateMode(false);
    setEditingUser(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateMode(true);
    setSelectedRole("REP");
    setSelectedActive(true);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setIsCreateMode(false);
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword(""); // Always blank for security
    setSelectedRole(user.role);
    setSelectedActive(user.active);
    setIsDialogOpen(true);
  };

  const handleSaveOrCreate = () => {
    if (isCreateMode) {
      // Validation for create
      if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
        toast({ variant: "destructive", title: "Missing fields", description: "Name, email, and password are required" });
        return;
      }
      createUserMutation.mutate({
        name: formName,
        email: formEmail,
        password: formPassword,
        role: selectedRole,
        active: selectedActive,
      });
    } else {
      // Update existing user
      if (!editingUser) return;
      
      const updateData: any = {};
      
      // Only include changed fields
      if (formName !== editingUser.name) updateData.name = formName;
      if (formEmail !== editingUser.email) updateData.email = formEmail;
      if (selectedRole !== editingUser.role) updateData.role = selectedRole;
      if (selectedActive !== editingUser.active) updateData.active = selectedActive;
      if (formPassword.trim()) updateData.password = formPassword; // Only update if provided
      
      if (Object.keys(updateData).length === 0) {
        toast({ title: "No changes to save" });
        return;
      }
      
      updateUserMutation.mutate({
        id: editingUser.id,
        data: updateData,
      });
    }
  };

  const [deleteError, setDeleteError] = useState<{
    error: string;
    message: string;
    references?: { leads?: number; deals?: number; callbacks?: number; activities?: number; tasks?: number; workflows?: number };
  } | null>(null);

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/users/${id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw { status: response.status, ...data };
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowDeleteConfirm(false);
      setDeleteText("");
      setDeleteError(null);
      setEditingUser(null);
      setIsDialogOpen(false);
      toast({ title: "User deleted successfully" });
    },
    onError: (error: any) => {
      if (error.status === 409 && error.error === "USER_HAS_REFERENCES") {
        // Show references and offer deactivate option
        setDeleteError({
          error: error.error,
          message: error.message,
          references: error.references
        });
      } else if (error.status === 409) {
        // Other 409 errors (self-delete, last admin)
        toast({ variant: "destructive", title: "Cannot delete user", description: error.message });
        setShowDeleteConfirm(false);
        setDeleteText("");
      } else {
        toast({ variant: "destructive", title: "Failed to delete user", description: error.message || "An error occurred" });
      }
    },
  });


  const handleConfirmDelete = () => {
    if (!editingUser || deleteText.trim() !== "Delete") return;
    setDeleteError(null); // Reset error state
    deleteUserMutation.mutate(editingUser.id);
  };

  const handleDeactivateUser = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      id: editingUser.id,
      data: { active: false },
    });
    setShowDeleteConfirm(false);
    setDeleteText("");
    setDeleteError(null);
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts and roles</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-create-user">
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">All Users</CardTitle>
              <CardDescription>Search, create, and manage users</CardDescription>
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-users"
            />
          </div>
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
                  {filteredUsers.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "No users found matching your search" : "No users found"}
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredUsers.map((user) => (
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
                        <Dialog open={isDialogOpen && !isCreateMode && editingUser?.id === user.id} onOpenChange={(open) => {
                          if (!open) {
                            setEditingUser(null);
                            setIsDialogOpen(false);
                            setShowDeleteConfirm(false);
                            setDeleteText("");
                            resetForm();
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
                              <DialogTitle>
                                {showDeleteConfirm ? `Delete User: ${user.name}` : `Edit User: ${user.name}`}
                              </DialogTitle>
                            </DialogHeader>
                            {!showDeleteConfirm ? (
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="name">Name</Label>
                                  <Input
                                    id="name"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Full name"
                                    data-testid="input-name"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="email">Email</Label>
                                  <Input
                                    id="email"
                                    type="email"
                                    value={formEmail}
                                    onChange={(e) => setFormEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    data-testid="input-email"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="password">
                                    {isCreateMode ? "Password" : "New Password (leave blank to keep current)"}
                                  </Label>
                                  <Input
                                    id="password"
                                    type="password"
                                    value={formPassword}
                                    onChange={(e) => setFormPassword(e.target.value)}
                                    placeholder={isCreateMode ? "Enter password" : "Leave blank to keep current"}
                                    data-testid="input-password"
                                  />
                                </div>
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
                                    onClick={handleSaveOrCreate}
                                    disabled={updateUserMutation.isPending || createUserMutation.isPending}
                                    className="w-full"
                                    data-testid="button-save-user"
                                  >
                                    {(updateUserMutation.isPending || createUserMutation.isPending) 
                                      ? "Saving..." 
                                      : isCreateMode 
                                        ? "Create User" 
                                        : "Save Changes"}
                                  </Button>
                                  {!isCreateMode && (
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      onClick={() => setShowDeleteConfirm(true)}
                                      disabled={updateUserMutation.isPending}
                                      data-testid="button-delete-user"
                                    >
                                      Delete User
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4 py-4">
                                {deleteError && deleteError.error === "USER_HAS_REFERENCES" ? (
                                  <>
                                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                                      <h4 className="font-semibold text-yellow-900 mb-2">Cannot Delete User</h4>
                                      <p className="text-sm text-yellow-800 mb-3">{deleteError.message}</p>
                                      {deleteError.references && (
                                        <div className="text-sm space-y-1">
                                          <p className="font-medium text-yellow-900">Assigned records:</p>
                                          <ul className="list-disc list-inside text-yellow-800 space-y-0.5">
                                            {deleteError.references.leads ? <li>Leads: {deleteError.references.leads}</li> : null}
                                            {deleteError.references.deals ? <li>Deals: {deleteError.references.deals}</li> : null}
                                            {deleteError.references.callbacks ? <li>Callbacks: {deleteError.references.callbacks}</li> : null}
                                            {deleteError.references.activities ? <li>Activities: {deleteError.references.activities}</li> : null}
                                            {deleteError.references.tasks ? <li>Tasks: {deleteError.references.tasks}</li> : null}
                                            {deleteError.references.workflows ? <li>Workflows: {deleteError.references.workflows}</li> : null}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex gap-3 justify-end">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          setShowDeleteConfirm(false);
                                          setDeleteText("");
                                          setDeleteError(null);
                                        }}
                                        data-testid="button-cancel-delete"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="default"
                                        onClick={handleDeactivateUser}
                                        disabled={updateUserMutation.isPending}
                                        data-testid="button-deactivate-user"
                                      >
                                        {updateUserMutation.isPending ? (
                                          <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Deactivating...
                                          </>
                                        ) : (
                                          "Deactivate User Instead"
                                        )}
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-sm text-muted-foreground">
                                      <p className="font-medium text-foreground mb-2">⚠️ This action cannot be undone.</p>
                                      <p>This will permanently delete the user account. Type "Delete" to confirm.</p>
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
                                          setDeleteError(null);
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
                                  </>
                                )}
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

      {/* Create User Dialog */}
      <Dialog open={isDialogOpen && isCreateMode} onOpenChange={(open) => {
        if (!open) {
          setIsDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Full name"
                data-testid="input-create-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="user@example.com"
                data-testid="input-create-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Enter password"
                data-testid="input-create-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="create-role" data-testid="select-create-role">
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
              <Label htmlFor="create-active">Active Status</Label>
              <Switch
                id="create-active"
                checked={selectedActive}
                onCheckedChange={setSelectedActive}
                data-testid="switch-create-active"
              />
            </div>
            <Button
              onClick={handleSaveOrCreate}
              disabled={createUserMutation.isPending}
              className="w-full"
              data-testid="button-create-user-submit"
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
