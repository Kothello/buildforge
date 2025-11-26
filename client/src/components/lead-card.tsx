import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TemperatureBadge } from "./temperature-badge";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, User } from "lucide-react";
import { Lead } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  isDragging?: boolean;
}

export function LeadCard({ lead, onClick, isDragging }: LeadCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <Card
        className={`
          cursor-pointer hover-elevate active-elevate-2 transition-shadow
          ${isDragging ? "opacity-50 rotate-3 shadow-2xl shadow-primary/30" : ""}
        `}
        onClick={onClick}
        data-testid={`card-lead-${lead.id}`}
      >
        <CardHeader className="pb-3 space-y-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate" data-testid={`text-company-${lead.id}`}>
                {lead.companyName}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {lead.contactName}
              </p>
            </div>
            <TemperatureBadge temperature={lead.temperature as any} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              {lead.source}
            </Badge>
            {lead.phone && (
              <Badge variant="outline" className="text-xs">
                {lead.phone}
              </Badge>
            )}
          </div>
          
          {lead.buildingSpecs && (
            <div className="text-xs text-muted-foreground">
              {(lead.buildingSpecs as any).width}' × {(lead.buildingSpecs as any).length}'
            </div>
          )}
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
            </div>
            {lead.assignedTo && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Assigned
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
