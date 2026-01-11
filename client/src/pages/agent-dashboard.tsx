import { Link } from "wouter";
import { authedFetch } from "@/lib/authedFetch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AgentControlPanel } from "@/components/AgentControlPanel";
import { LeadDistribution } from "@/components/LeadDistribution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  TrendingUp, 
  Users, 
  Phone, 
  BarChart3,
  Building2,
  Package,
  Loader2,
  Plus
} from "lucide-react";

interface AgentDashboardSummary {
  totalLeads: number;
  callbacksScheduled: number;
  inManufacturing: number;
  deliveredThisMonth: number;
  pipelineStages: {
    workingLeads: number;
    callbacks: number;
    soldBuildings: number;
    fabrication: number;
  };
}

interface PipelineStats {
  [stageId: string]: number;
}

export default function AgentDashboardPage() {
  const { toast } = useToast();
  
  const { data: stats, isLoading } = useQuery<AgentDashboardSummary>({
    queryKey: ['/api/agent-dashboard/summary'],
    queryFn: async () => {
      const response = await authedFetch('/api/agent-dashboard/summary', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      console.log('[agent-dashboard] Received stats:', data);
      console.log('[agent-dashboard] pipelineStages:', data.pipelineStages);
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const claimLeadMutation = useMutation({
    mutationFn: async () => {
      const response = await authedFetch('/api/agent/claim-next-lead', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to claim lead');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      // Invalidate pipeline stats (funnel) - use predicate to catch all scope variants
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/pipeline/stats",
      });
      toast({
        title: "Lead Claimed!",
        description: `You've claimed a new lead: ${data.lead?.companyName || 'New lead'}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const totalLeads = stats?.totalLeads || 0;
  const callbackCount = stats?.callbacksScheduled || 0;
  const inManufacturing = stats?.inManufacturing || 0;
  const delivered = stats?.deliveredThisMonth || 0;

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">Sales Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your pipeline and track team performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => claimLeadMutation.mutate()}
            disabled={claimLeadMutation.isPending}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            {claimLeadMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Claim Next Lead
          </Button>
          <Link href="/pipeline-funnel">
            <Button variant="outline" size="lg">
              <TrendingUp className="w-4 h-4 mr-2" />
              View Funnel
            </Button>
          </Link>
          <Link href="/pipeline">
            <Button variant="outline" size="lg">
              <BarChart3 className="w-4 h-4 mr-2" />
              Kanban Board
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Link href="/pipeline">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Leads
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold hover:underline">{totalLeads}</div>
                  <p className="text-xs text-muted-foreground">
                    Across all stages
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/pipeline?stage=callbacks">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Callbacks
              </CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold hover:underline">{callbackCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Callbacks scheduled
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/pipeline-funnel">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                In Manufacturing
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold hover:underline">{inManufacturing}</div>
                  <p className="text-xs text-muted-foreground">
                    Buildings being fabricated
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/pipeline-funnel">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Delivered
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold hover:underline">{delivered}</div>
                  <p className="text-xs text-muted-foreground">
                    This month
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Agent Controls - Left Column */}
        <div className="lg:col-span-1">
          <AgentControlPanel />
        </div>

        {/* Lead Distribution - Right Column */}
        <div className="lg:col-span-2">
          <LeadDistribution />
        </div>
      </div>

      {/* Pipeline Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/pipeline?stage=working_lead">
                <a className="p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats?.pipelineStages?.workingLeads || 0}</div>
                  <div className="text-sm text-blue-800">Working Leads</div>
                </a>
              </Link>
              
              <Link href="/pipeline?stage=callbacks">
                <a className="p-4 rounded-lg bg-cyan-50 hover:bg-cyan-100 transition-colors text-center">
                  <div className="text-2xl font-bold text-cyan-600">{stats?.pipelineStages?.callbacks || 0}</div>
                  <div className="text-sm text-cyan-800">Callbacks</div>
                </a>
              </Link>
              
              <Link href="/pipeline?stage=sold_building">
                <a className="p-4 rounded-lg bg-teal-50 hover:bg-teal-100 transition-colors text-center">
                  <div className="text-2xl font-bold text-teal-600">{stats?.pipelineStages?.soldBuildings || 0}</div>
                  <div className="text-sm text-teal-800">Sold Buildings</div>
                </a>
              </Link>
              
              <Link href="/pipeline?stage=red_iron_fabrication">
                <a className="p-4 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats?.pipelineStages?.fabrication || 0}</div>
                  <div className="text-sm text-yellow-800">Fabrication</div>
                </a>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <div className="flex-1">
                <p className="font-medium">New lead assigned</p>
                <p className="text-sm text-muted-foreground">ABC Steel Co - Just now</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <div className="flex-1">
                <p className="font-medium">Building delivered</p>
                <p className="text-sm text-muted-foreground">Job #12345 - 5 minutes ago</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <div className="flex-1">
                <p className="font-medium">Callback scheduled</p>
                <p className="text-sm text-muted-foreground">XYZ Industries - 15 minutes ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
