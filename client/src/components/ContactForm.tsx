import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function ContactForm() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    projectType: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Quote request submitted:", formData);
    
    toast({
      title: "Quote Request Submitted!",
      description: "We'll contact you within 24 hours to discuss your steel building project.",
    });

    setFormData({
      name: "",
      email: "",
      phone: "",
      projectType: "",
      message: "",
    });
  };

  return (
    <section className="py-16 sm:py-24" id="contact">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4" data-testid="text-contact-title">
            Request a Quote
          </h2>
          <p className="text-xl text-muted-foreground">
            Ready to build with steel? Get a free quote for your project today.
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                  data-testid="input-name"
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  required
                  data-testid="input-phone"
                />
              </div>

              <div>
                <Label htmlFor="projectType">Project Type *</Label>
                <Select
                  value={formData.projectType}
                  onValueChange={(value) => setFormData({ ...formData, projectType: value })}
                  required
                >
                  <SelectTrigger id="projectType" data-testid="select-project-type">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="agricultural">Agricultural</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="equestrian">Equestrian</SelectItem>
                    <SelectItem value="shop-garage">Shop/Garage</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="message">Project Details *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Tell us about your steel building project..."
                rows={5}
                required
                data-testid="input-message"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" data-testid="button-submit-quote">
              Request a Quote
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}
