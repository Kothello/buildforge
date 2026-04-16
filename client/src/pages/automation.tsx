import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Zap, Webhook, Plus } from "lucide-react";

export default function Automation() {
  const webhookEvents = [
    { name: "New Lead", active: true, count: 142 },
    { name: "Stage Changed", active: true, count: 89 },
    { name: "Deal Won", active: true, count: 23 },
    { name: "Payment Received", active: false, count: 0 },
    { name: "Contract Signed", active: true, count: 18 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automation</h1>
          <p className="text-muted-foreground mt-1">
            Connect BuildForge to Zapier and automate your entire workflow
          </p>
        </div>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/20">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Zapier Integration</CardTitle>
                <CardDescription>
                  Every action in BuildForge triggers a webhook you can connect to 5,000+ apps
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-background/50 border border-border">
                <p className="text-2xl font-bold text-primary">142</p>
                <p className="text-sm text-muted-foreground">Webhooks Fired Today</p>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border border-border">
                <p className="text-2xl font-bold text-emerald-400">5</p>
                <p className="text-sm text-muted-foreground">Active Integrations</p>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border border-border">
                <p className="text-2xl font-bold text-amber-400">99.9%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Webhook Events</CardTitle>
            <CardDescription>
              Configure which events trigger webhooks to your automation platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {webhookEvents.map((event) => (
              <div
                key={event.name}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover-elevate"
              >
                <div className="flex items-center gap-4">
                  <Webhook className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{event.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.count} events fired this month
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={event.active ? "default" : "secondary"}>
                    {event.active ? "Active" : "Inactive"}
                  </Badge>
                  <Switch checked={event.active} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Webhook Endpoint</CardTitle>
            <CardDescription>
              Connect a new Zapier webhook or custom endpoint
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                data-testid="input-webhook-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-type">Event Type</Label>
              <Input
                id="event-type"
                placeholder="new_lead, stage_change, deal_won..."
                data-testid="input-event-type"
              />
            </div>
            <Button className="w-full gap-2" data-testid="button-add-webhook">
              <Plus className="h-4 w-4" />
              Add Webhook
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
