import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { PIPELINE_STAGES, getStageLabel, getStageHexColor, getStageFunnelWidth } from "@shared/pipelineStages";
import { authedFetch } from "@/lib/authedFetch";
import { motion } from "framer-motion";
import { Loader2, LayoutGrid, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { routes } from "@/lib/routes";

interface PipelineStats {
  [stageId: string]: number;
}

export default function PipelineFunnelPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "ADMIN";
  const scope = isManagerOrAdmin ? "global" : "my";

  const { data: stats, isLoading } = useQuery<PipelineStats>({
    queryKey: ['/api/pipeline/stats', scope, user?.id],
    queryFn: async () => {
      const response = await authedFetch(`/api/pipeline/stats?scope=${scope}`);
      if (!response.ok) throw new Error('Failed to fetch pipeline stats');
      return response.json();
    }
  });

  const handleStageClick = (stageId: string) => {
    // Use centralized routes helper for role-aware navigation
    navigate(routes.leadsForRole(user?.role, { stage: stageId }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold">
              {isManagerOrAdmin ? "Sales Pipeline Funnel" : "My Sales Pipeline Funnel"}
            </h1>
            <div className="flex gap-1 border rounded-lg p-1">
              <Link href="/pipeline">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                >
                  <LayoutGrid className="h-3 w-3" />
                  Kanban
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 text-xs"
              >
                <TrendingDown className="h-3 w-3" />
                Funnel
              </Button>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground">
          Visual representation of leads through the steel building manufacturing process
        </p>
      </div>

      {/* Funnel Visualization */}
      <div className="flex flex-col items-center gap-3 mb-12">
        {PIPELINE_STAGES.map((stage, index) => {
          const count = stats?.[stage.id] ?? 0;
          const widthPercent = (stage.funnelWidth / 1200) * 100;
          
          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              style={{ width: `${widthPercent}%`, maxWidth: `${stage.funnelWidth}px` }}
              data-testid={`funnel-stage-${stage.id}`}
            >
              <div
                className="block rounded-b-3xl p-6 text-white text-center hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer"
                style={{ backgroundColor: stage.hexColor }}
                title={stage.description}
                onClick={() => handleStageClick(stage.id)}
              >
                <div className="text-3xl font-bold mb-2" data-testid={`funnel-count-${stage.id}`}>{count}</div>
                <div className="text-sm font-medium">{stage.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="bg-card rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-2">Total Active Leads</h3>
          <p className="text-4xl font-bold text-primary">
            {stats ? Object.values(stats).reduce((a, b) => a + b, 0) : 0}
          </p>
        </div>
        
        <div className="bg-card rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-2">In Manufacturing</h3>
          <p className="text-4xl font-bold text-yellow-600">
            {stats 
              ? (stats['red_iron_fabrication'] || 0) + 
                (stats['cold_form_fabrication'] || 0) + 
                (stats['carport_fabrication'] || 0)
              : 0}
          </p>
        </div>
        
        <div className="bg-card rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-2">Delivered</h3>
          <p className="text-4xl font-bold text-green-600">
            {stats 
              ? (stats['delivered_red_iron'] || 0) + 
                (stats['delivered_c_channel'] || 0) + 
                (stats['delivered_carport'] || 0)
              : 0}
          </p>
        </div>
      </div>

      {/* Link to Traditional Pipeline */}
      <div className="mt-12 text-center">
        <Link href="/pipeline">
          <a className="text-primary hover:underline">
            Switch to Kanban Board View →
          </a>
        </Link>
      </div>
    </div>
  );
}
