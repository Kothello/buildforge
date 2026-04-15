import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

interface BuildingCategory {
  id: number;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  tag: "Residential" | "Agricultural" | "Commercial";
}

export default function Admin() {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  
  const [categories, setCategories] = useState<BuildingCategory[]>([
    {
      id: 1,
      title: "Residential Steel Buildings",
      category: "Barndominiums & Homes",
      description: "Modern steel-frame homes and barndominiums.",
      imageUrl: "/steel-residential.jpg",
      tag: "Residential",
    },
    {
      id: 2,
      title: "Agricultural Steel Buildings",
      category: "Farm & Ranch",
      description: "Farm buildings engineered for strength.",
      imageUrl: "/steel-agricultural.jpg",
      tag: "Agricultural",
    },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    imageUrl: "",
    tag: "Residential" as "Residential" | "Agricultural" | "Commercial",
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple password check - in production, use proper authentication
    if (password === "steel2024") {
      setIsAuthenticated(true);
      toast({
        title: "Access Granted",
        description: "Welcome to the admin panel.",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Incorrect password.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId !== null) {
      setCategories(categories.map(cat => 
        cat.id === editingId ? { ...formData, id: editingId } : cat
      ));
      toast({
        title: "Category Updated",
        description: "Building category has been updated successfully.",
      });
    } else {
      const newCategory = {
        ...formData,
        id: Date.now(),
      };
      setCategories([...categories, newCategory]);
      toast({
        title: "Category Added",
        description: "New building category has been added.",
      });
    }

    setFormData({ title: "", category: "", description: "", imageUrl: "", tag: "Residential" });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (category: BuildingCategory) => {
    setFormData({
      title: category.title,
      category: category.category,
      description: category.description,
      imageUrl: category.imageUrl,
      tag: category.tag,
    });
    setEditingId(category.id);
    setIsAdding(true);
  };

  const handleDelete = (id: number) => {
    setCategories(categories.filter(cat => cat.id !== id));
    toast({
      title: "Category Deleted",
      description: "Building category has been removed.",
    });
  };

  const handleCancel = () => {
    setFormData({ title: "", category: "", description: "", imageUrl: "", tag: "Residential" });
    setIsAdding(false);
    setEditingId(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-6">
            <Logo className="w-40 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Admin Access</h1>
            <p className="text-muted-foreground">Enter password to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                data-testid="input-admin-password"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">Demo password: steel2024</p>
            </div>
            <Button type="submit" className="w-full" data-testid="button-login">
              Login
            </Button>
            <Link href="/">
              <Button variant="ghost" className="w-full">
                Back to Site
              </Button>
            </Link>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" data-testid="link-back-home">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Site
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Admin Panel - BuildForge</h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsAuthenticated(false)} data-testid="button-logout">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold">Manage Building Categories</h2>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} data-testid="button-add-category">
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          )}
        </div>

        {isAdding && (
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">
              {editingId !== null ? "Edit Category" : "Add New Steel Building Category"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Residential Steel Buildings"
                  required
                  data-testid="input-title"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Barndominiums & Homes"
                  required
                  data-testid="input-category"
                />
              </div>

              <div>
                <Label htmlFor="tag">Tag</Label>
                <Select
                  value={formData.tag}
                  onValueChange={(value: "Residential" | "Agricultural" | "Commercial") => 
                    setFormData({ ...formData, tag: value })
                  }
                  required
                >
                  <SelectTrigger id="tag" data-testid="select-tag">
                    <SelectValue placeholder="Select a tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Agricultural">Agricultural</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description emphasizing steel construction benefits..."
                  required
                  data-testid="input-description"
                />
              </div>

              <div>
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/steel-building.jpg"
                  required
                  data-testid="input-image-url"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Note: Image must show steel construction (metal siding, metal roof, no wood)
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" data-testid="button-submit">
                  {editingId !== null ? "Update" : "Add"} Category
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} data-testid="button-cancel">
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="space-y-4">
          {categories.map((category) => (
            <Card key={category.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold" data-testid={`text-category-title-${category.id}`}>
                      {category.title}
                    </h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {category.tag}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2" data-testid={`text-category-type-${category.id}`}>
                    {category.category}
                  </p>
                  <p className="text-sm" data-testid={`text-category-description-${category.id}`}>
                    {category.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Image: {category.imageUrl}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(category)}
                    data-testid={`button-edit-${category.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(category.id)}
                    data-testid={`button-delete-${category.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
