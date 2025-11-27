import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TemperatureBadge } from "./temperature-badge";
import { Button } from "@/components/ui/button";
import { Send, Eye } from "lucide-react";
import { Lead } from "@shared/schema";
import { motion } from "framer-motion";

interface MorningBriefCardProps {
  lead: Lead;
  priority: number;
  aiScript?: string;
  onSend?: () => void;
  onView?: () => void;
  onHover?: () => void;
}

export function MorningBriefCard({
  lead,
  priority,
  aiScript,
  onSend,
  onView,
  onHover,
}: MorningBriefCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: priority * 0.05 }}
      onMouseEnter={onHover}
    >
      <Card className="hover-elevate active-elevate-2 transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                  {priority}
                </div>
                <h3 className="font-semibold text-lg truncate">{lead.companyName}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{lead.contactName}</p>
            </div>
            <TemperatureBadge temperature={lead.temperature as any} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {lead.buildingSpecs && (
            <div className="text-sm text-muted-foreground">
              {(lead.buildingSpecs as any).width}' × {(lead.buildingSpecs as any).length}' building
              {(lead.buildingSpecs as any).roofStyle && ` • ${(lead.buildingSpecs as any).roofStyle} roof`}
            </div>
          )}

          {(aiScript || lead.aiFirstMessage) && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm leading-relaxed line-clamp-3">
                {aiScript || lead.aiFirstMessage}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1 gap-2"
              onClick={onSend}
              data-testid={`button-send-${lead.id}`}
            >
              <Send className="h-3 w-3" />
              Send Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={onView}
              data-testid={`button-view-${lead.id}`}
            >
              <Eye className="h-3 w-3" />
              View
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
