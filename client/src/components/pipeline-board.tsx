import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@shared/schema";
import { LeadCard } from "./lead-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PipelineBoardProps {
  leads: Lead[];
  onStageChange: (leadId: string, newStage: string) => void;
  onLeadClick: (lead: Lead) => void;
}

const stages = [
  { id: "new", label: "New", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { id: "contacted", label: "Contacted", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { id: "quote_sent", label: "Quote Sent", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { id: "negotiating", label: "Negotiating", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { id: "won", label: "Won", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { id: "lost", label: "Lost", color: "bg-red-500/10 text-red-400 border-red-500/20" },
];

function SortableLeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadCard lead={lead} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}

export function PipelineBoard({ leads, onStageChange, onLeadClick }: PipelineBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const leadId = active.id as string;
    const activeLead = leads.find(l => l.id === leadId);
    
    if (!activeLead) {
      setActiveId(null);
      return;
    }

    const overLead = leads.find(l => l.id === over.id);
    const newStage = overLead ? overLead.stage : (over.id as string);
    
    const validStage = stages.find(s => s.id === newStage);
    if (validStage && newStage !== activeLead.stage) {
      onStageChange(leadId, newStage);
    }

    setActiveId(null);
  };

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageLeads = leads.filter((lead) => lead.stage === stage.id);
          const allIds = [...stageLeads.map((l) => l.id), stage.id];

          return (
            <Card
              key={stage.id}
              className="flex-shrink-0 w-80 bg-card/50 backdrop-blur-sm"
              data-testid={`column-${stage.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{stage.label}</CardTitle>
                  <Badge variant="outline" className={stage.color}>
                    {stageLeads.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <SortableContext
                  items={allIds}
                  strategy={verticalListSortingStrategy}
                  id={stage.id}
                >
                  <div className="space-y-3 min-h-[200px]" data-stage-id={stage.id}>
                    {stageLeads.map((lead) => (
                      <SortableLeadCard
                        key={lead.id}
                        lead={lead}
                        onClick={() => onLeadClick(lead)}
                      />
                    ))}
                    <div id={stage.id} className="h-0 w-0" />
                  </div>
                </SortableContext>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DragOverlay>
        {activeLead && <LeadCard lead={activeLead} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
