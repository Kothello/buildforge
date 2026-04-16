import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PIPELINE_STAGES, StageId } from "@shared/pipelineStages";
import { mapLeadToStageId } from "@/lib/leadStages";
import { normalizeArray } from "@/lib/normalize";

interface PipelineBoardProps {
  leads: Lead[];
  onStageChange: (leadId: string, newStage: string) => void;
  onLeadClick: (lead: Lead) => void;
}

// Compact Kanban card with key info only
interface KanbanCardProps {
  lead: Lead;
  onClick: () => void;
  isDragging?: boolean;
}

function KanbanCard({ lead, onClick, isDragging }: KanbanCardProps) {
  const stageId = mapLeadToStageId(lead);
  const stageLabel = PIPELINE_STAGES.find(s => s.id === stageId)?.label || lead.stage;
  const daysOnStage = (lead as any).daysOnStage ?? 0;
  const assigneeName = (lead as any).assignedToName || "Unassigned";
  
  // Format price if available
  const price = (lead as any).estimatedValue || (lead as any).totalPrice;
  const formattedPrice = price ? new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price) : null;

  return (
    <div
      className={`
        rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs flex flex-col gap-1
        cursor-pointer hover:bg-slate-900/90 hover:border-slate-600 transition-all
        ${isDragging ? "opacity-50 rotate-2 shadow-2xl" : ""}
      `}
      onClick={onClick}
      data-testid={`kanban-card-${lead.id}`}
    >
      <div className="font-medium text-slate-100 line-clamp-1">
        {lead.companyName || lead.contactName || "Unnamed Lead"}
      </div>
      <div className="flex justify-between text-slate-400">
        <span className="truncate">{stageLabel}</span>
        <span className="flex-shrink-0 ml-2">{daysOnStage}d</span>
      </div>
      <div className="flex justify-between text-slate-500">
        <span className="truncate">{assigneeName}</span>
        {formattedPrice && <span className="flex-shrink-0 ml-2">{formattedPrice}</span>}
      </div>
      <div className="flex justify-end mt-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-[10px] text-blue-400 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          View
        </Button>
      </div>
    </div>
  );
}

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
      <KanbanCard lead={lead} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}

interface StageColumnProps {
  stage: {
    id: StageId;
    label: string;
  };
  leads: Lead[];
  count: number;
  onLeadClick: (lead: Lead) => void;
}

function StageColumn({ stage, leads, count, onLeadClick }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const allIds = [...leads.map((l) => l.id), stage.id];

  return (
    <Card
      key={stage.id}
      className={`bg-card/50 backdrop-blur-sm transition-colors duration-200 ${
        isOver ? 'ring-2 ring-primary/50 bg-primary/5' : ''
      }`}
      data-testid={`column-${stage.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{stage.label}</CardTitle>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
            {count}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <SortableContext
          items={allIds}
          strategy={verticalListSortingStrategy}
          id={stage.id}
        >
          <div 
            ref={setNodeRef}
            className={`space-y-2 min-h-[200px] rounded-lg transition-all duration-200 p-2 ${
              leads.length === 0 
                ? 'border-2 border-dashed border-muted-foreground/20 bg-muted/10' 
                : ''
            } ${
              isOver
                ? 'border-primary/50 bg-primary/10'
                : ''
            }`}
            data-stage-id={stage.id}
          >
            {leads.length > 0 ? (
              leads.map((lead) => (
                <SortableLeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => onLeadClick(lead)}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-full min-h-[180px] text-center">
                <div className="text-xs text-muted-foreground/60">
                  <div className="mb-1">No deals in this stage yet</div>
                  <div className="text-[10px]">Drop leads here to move them</div>
                </div>
              </div>
            )}
            {/* Hidden droppable target for dnd-kit */}
            <div id={stage.id} className="h-0 w-0 opacity-0" />
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
}

export function PipelineBoard({ leads: rawLeads, onStageChange, onLeadClick }: PipelineBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Normalize leads to always be an array - prevents .filter/.map crashes
  const leads = normalizeArray<Lead>(rawLeads);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Build columns from PIPELINE_STAGES (single source of truth)
  const columns = useMemo(() => {
    return PIPELINE_STAGES.map(stage => ({
      id: stage.id as StageId,
      label: stage.label,
    }));
  }, []);

  // Group leads by stage using the mapping function (same as My Leads/Funnel)
  const leadsByStage = useMemo(() => {
    const grouped: Record<StageId, Lead[]> = {} as Record<StageId, Lead[]>;
    
    // Initialize all stages with empty arrays
    columns.forEach(col => {
      grouped[col.id] = [];
    });
    
    // Assign each lead to its mapped stage
    leads.forEach(lead => {
      const stageId = mapLeadToStageId(lead);
      if (stageId && grouped[stageId]) {
        grouped[stageId].push(lead);
      }
    });
    
    return grouped;
  }, [leads, columns]);

  // Column data with leads and counts
  const columnData = useMemo(() => {
    return columns.map(col => ({
      ...col,
      leads: leadsByStage[col.id] || [],
      count: (leadsByStage[col.id] || []).length,
    }));
  }, [columns, leadsByStage]);

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

    // Determine the target stage
    const overLead = leads.find(l => l.id === over.id);
    const targetStageId = overLead ? mapLeadToStageId(overLead) : (over.id as string);
    
    // Validate the target stage exists in our columns
    const validStage = columns.find(s => s.id === targetStageId);
    const currentStageId = mapLeadToStageId(activeLead);
    
    if (validStage && targetStageId !== currentStageId && targetStageId !== null) {
      // Call the stage change with the raw stage ID (backend expects this)
      onStageChange(leadId, targetStageId);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 pb-4">
        {columnData.map((col) => (
          <StageColumn
            key={col.id}
            stage={{ id: col.id, label: col.label }}
            leads={col.leads}
            count={col.count}
            onLeadClick={onLeadClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead && <KanbanCard lead={activeLead} isDragging onClick={() => {}} />}
      </DragOverlay>
    </DndContext>
  );
}
