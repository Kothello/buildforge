import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, DollarSign } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="h-full overflow-auto p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$127,500</div>
            <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Active Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-1">3 hot opportunities</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Pricing Config
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$5,000</div>
            <p className="text-xs text-muted-foreground mt-1">Base price per unit</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="default" 
            className="w-full justify-start" 
            data-testid="button-manage-pricing"
            onClick={() => setLocation('/admin/pricing')}
          >
            Manage Pricing Configuration
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            data-testid="button-manage-users"
            onClick={() => setLocation('/admin/users')}
          >
            Manage User Roles
          </Button>
          <Button variant="outline" className="w-full justify-start" data-testid="button-view-projects">
            View All Projects
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
