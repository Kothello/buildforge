import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Mail, Phone, Building, Trash2, Pencil } from "lucide-react";
import type { Contact, CrmDeal } from "@shared/schema";

export default function CrmContactsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", company: "" });

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts", searchQuery],
    queryFn: async () => {
      const url = searchQuery ? `/api/contacts?search=${encodeURIComponent(searchQuery)}` : "/api/contacts";
      const res = await fetch(url);
      return res.json();
    },
  });

  const { data: deals = [] } = useQuery<CrmDeal[]>({
    queryKey: ["/api/crm/deals"],
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/contacts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setIsCreateDialogOpen(false);
      setFormData({ name: "", email: "", phone: "", company: "" });
      toast({ title: "Contact created successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to create contact", description: error.message });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contact> }) => {
      const response = await apiRequest("PATCH", `/api/contacts/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setEditingContact(null);
      setFormData({ name: "", email: "", phone: "", company: "" });
      toast({ title: "Contact updated successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to update contact", description: error.message });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Contact deleted" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to delete contact", description: error.message });
    },
  });

  const handleSubmit = () => {
    if (editingContact) {
      updateContactMutation.mutate({ id: editingContact.id, data: formData });
    } else {
      createContactMutation.mutate(formData);
    }
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email || "",
      phone: contact.phone || "",
      company: contact.company || "",
    });
  };

  const getContactDeals = (contactId: string) => {
    return deals.filter(d => d.contactId === contactId);
  };

  const formatCurrency = (amount: string | null | undefined) => {
    const num = parseFloat(amount || "0");
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">Manage your customer contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
              data-testid="input-search-contacts"
            />
          </div>
          <Dialog open={isCreateDialogOpen || !!editingContact} onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setEditingContact(null);
              setFormData({ name: "", email: "", phone: "", company: "" });
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-contact">
                <Plus className="h-4 w-4 mr-2" />
                New Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingContact ? "Edit Contact" : "Create New Contact"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contact name"
                    data-testid="input-contact-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    data-testid="input-contact-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    data-testid="input-contact-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Company name"
                    data-testid="input-contact-company"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!formData.name || createContactMutation.isPending || updateContactMutation.isPending}
                  data-testid="button-submit-contact"
                >
                  {createContactMutation.isPending || updateContactMutation.isPending
                    ? "Saving..."
                    : editingContact
                    ? "Update Contact"
                    : "Create Contact"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Deals</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => {
              const contactDeals = getContactDeals(contact.id);
              const totalValue = contactDeals.reduce((sum, d) => sum + parseFloat(d.amount || "0"), 0);
              
              return (
                <TableRow key={contact.id} data-testid={`contact-row-${contact.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {contact.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.company && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Building className="h-3 w-3" />
                        {contact.company}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{contactDeals.length}</TableCell>
                  <TableCell>{formatCurrency(totalValue.toString())}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(contact)}
                        data-testid={`button-edit-contact-${contact.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteContactMutation.mutate(contact.id)}
                        data-testid={`button-delete-contact-${contact.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {contacts.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {searchQuery ? "No contacts found matching your search." : "No contacts yet. Create your first contact to get started."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
