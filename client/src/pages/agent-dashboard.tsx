import { Link, useLocation } from "wouter";
import { authedFetch } from "@/lib/authedFetch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AgentControlPanel } from "@/components/AgentControlPanel";
import { LeadDistribution } from "@/components/LeadDistribution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton-block";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { PIPELINE_STAGES, type StageId } from "@shared/pipelineStages";
import { 
  TrendingUp, 
  Users, 
  Phone, 
  BarChart3,
  Building2,
  Package,
  Loader2,
  Plus,
  AlertTriangle,
  RefreshCw,
  Inbox
} from "lucide-react";

interface PipelineStats {
  [stageId: string]: number;
}

export default function AgentDashboardPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  // Determine scope based on role - REPs see their leads, ADMIN/MANAGER see global
  const isManagerOrAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";
  const statsScope = isManagerOrAdmin ? "global" : "my";
  
  // Use /api/pipeline/stats as single source of truth for counts
  const { data: pipelineStats, isLoading, isError, refetch } = useQuery<PipelineStats>({
    queryKey: ['/api/pipeline/stats', { scope: statsScope }],
    queryFn: async () => {
      const response = await authedFetch(`/api/pipeline/stats?scope=${statsScope}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch pipeline stats');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const claimLeadMutation = useMutation({
    mutationFn: async () => {
      const response = await authedFetch('/api/leads/claim-next', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        // Handle 409 specifically for "no leads available"
        if (response.status === 409) {
          throw new Error(error.message || 'No unassigned leads available');
        }
        throw new Error(error.message || 'Failed to claim lead');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all leads queries
      queryClient.invalidateQueries({ 
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/leads" 
      });
      // Invalidate pipeline stats (funnel)
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/pipeline/stats",
      });
      
      toast({
        title: "Lead Claimed!",
        description: `You've claimed: ${data.lead?.companyName || 'New lead'}`,
      });
      
      // Navigate to My Leads with the claimed lead highlighted
      const leadId = data.lead?.id;
      const targetUrl = leadId 
        ? `/my-leads?stage=working_lead&highlight=${leadId}`
        : `/my-leads?stage=working_lead`;
      navigate(targetUrl);
    },
    onError: (error: Error) => {
      toast({
        title: "No Leads Available",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Compute stats from pipeline data
  const totalLeads = pipelineStats 
    ? Object.values(pipelineStats).reduce((sum, count) => sum + count, 0)
    : 0;
  const callbackCount = pipelineStats?.callbacks || 0;
  // Manufacturing stages
  const inManufacturing = (pipelineStats?.red_iron_fabrication || 0) + 
    (pipelineStats?.cold_form_fabrication || 0) + 
    (pipelineStats?.carport_fabrication || 0);
  // Delivered stages
  const delivered = (pipelineStats?.delivered_red_iron || 0) + 
    (pipelineStats?.delivered_c_channel || 0) + 
    (pipelineStats?.delivered_carport || 0);
  
  // Helper to navigate to leads page with stage filter
  const navigateToStage = (stageId: StageId) => {
    const basePath = isManagerOrAdmin ? "/sales/all-leads" : "/my-leads";
    navigate(`${basePath}?stage=${stageId}`);
  };
  
  // Format numbers for readability
  const formatNumber = (n: number) => new Intl.NumberFormat().format(n);
  
  // Error state
  if (isError) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="border-destructive">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="text-lg font-semibold">Failed to load dashboard</h3>
                <p className="text-muted-foreground">Unable to fetch pipeline statistics</p>
              </div>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Empty state (no leads at all)
  const showEmptyState = !isLoading && totalLeads === 0;

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <PageHeader
        title="Sales Dashboard"
        subtitle={isManagerOrAdmin ? "Team pipeline overview" : "Manage your pipeline and track performance"}
        actions={
          <>
            <Button 
              onClick={() => claimLeadMutation.mutate()}
              disabled={claimLeadMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="dashboard-claim-next"
            >
              {claimLeadMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Claim Next Lead
            </Button>
            <Link href="/pipeline-funnel">
              <Button variant="outline" data-testid="dashboard-view-funnel">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Funnel
              </Button>
            </Link>
            <Link href="/pipeline">
              <Button variant="outline" data-testid="dashboard-view-kanban">
                <BarChart3 className="w-4 h-4 mr-2" />
                Kanban Board
              </Button>
            </Link>
          </>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
          onClick={() => navigate(isManagerOrAdmin ? "/sales/all-leads" : "/my-leads")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Leads
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold tabular-nums" data-testid="dashboard-count-total">{formatNumber(totalLeads)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isManagerOrAdmin ? "All team leads" : "Your assigned leads"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
          onClick={() => navigateToStage('callbacks')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Callbacks
            </CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold tabular-nums" data-testid="dashboard-count-callbacks-card">{formatNumber(callbackCount)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Scheduled this week
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
          onClick={() => navigateToStage('red_iron_fabrication')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Manufacturing
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold tabular-nums" data-testid="dashboard-count-manufacturing">{formatNumber(inManufacturing)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Being fabricated
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
          onClick={() => navigateToStage('delivered_red_iron')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivered
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold tabular-nums" data-testid="dashboard-count-delivered">{formatNumber(delivered)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed deliveries
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {showEmptyState && (
        <SectionCard>
          <EmptyState
            icon={Inbox}
            title="No leads yet"
            description="Start building your pipeline by creating leads or viewing the funnel"
            actions={
              <>
                <Link href="/sales/lead-builder">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Go to Lead Builder
                  </Button>
                </Link>
                <Link href="/pipeline-funnel">
                  <Button variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Funnel
                  </Button>
                </Link>
              </>
            }
          />
        </SectionCard>
      )}

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
      <SectionCard title="Pipeline Stages">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/50 border">
                <Skeleton className="h-10 w-14 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="group" aria-label="Pipeline stages">
            <button 
              onClick={() => navigateToStage('working_lead')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigateToStage('working_lead')}
              role="button"
              tabIndex={0}
              aria-label={`Working Leads: ${formatNumber(pipelineStats?.working_lead || 0)}`}
              className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/50 hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-center cursor-pointer"
            >
              <div 
                className="text-3xl font-bold text-blue-600 tabular-nums"
                data-testid="dashboard-count-working_lead"
              >
                {formatNumber(pipelineStats?.working_lead || 0)}
              </div>
              <div className="text-sm font-medium text-blue-700 mt-1">Working Leads</div>
            </button>
            
            <button 
              onClick={() => navigateToStage('callbacks')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigateToStage('callbacks')}
              role="button"
              tabIndex={0}
              aria-label={`Callbacks: ${formatNumber(pipelineStats?.callbacks || 0)}`}
              className="p-4 rounded-xl border-2 border-cyan-200 bg-cyan-50/50 hover:bg-cyan-100 hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-all text-center cursor-pointer"
            >
              <div 
                className="text-3xl font-bold text-cyan-600 tabular-nums"
                data-testid="dashboard-count-callbacks"
              >
                {formatNumber(pipelineStats?.callbacks || 0)}
              </div>
              <div className="text-sm font-medium text-cyan-700 mt-1">Callbacks</div>
            </button>
            
            <button 
              onClick={() => navigateToStage('sold_building')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigateToStage('sold_building')}
              role="button"
              tabIndex={0}
              aria-label={`Sold Buildings: ${formatNumber(pipelineStats?.sold_building || 0)}`}
              className="p-4 rounded-xl border-2 border-teal-200 bg-teal-50/50 hover:bg-teal-100 hover:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all text-center cursor-pointer"
            >
              <div 
                className="text-3xl font-bold text-teal-600 tabular-nums"
                data-testid="dashboard-count-sold_building"
              >
                {formatNumber(pipelineStats?.sold_building || 0)}
              </div>
              <div className="text-sm font-medium text-teal-700 mt-1">Sold Buildings</div>
            </button>
            
            <button 
              onClick={() => navigateToStage('red_iron_fabrication')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigateToStage('red_iron_fabrication')}
              role="button"
              tabIndex={0}
              aria-label={`Fabrication: ${formatNumber(pipelineStats?.red_iron_fabrication || 0)}`}
              className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all text-center cursor-pointer"
            >
              <div 
                className="text-3xl font-bold text-amber-600 tabular-nums"
                data-testid="dashboard-count-red_iron_fabrication"
              >
                {formatNumber(pipelineStats?.red_iron_fabrication || 0)}
              </div>
              <div className="text-sm font-medium text-amber-700 mt-1">Fabrication</div>
            </button>
          </div>
        )}
      </SectionCard>

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
