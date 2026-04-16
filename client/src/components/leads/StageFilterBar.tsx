import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PIPELINE_STAGES, StageId } from "@shared/pipelineStages";

type StageFilter = "ALL" | StageId;

interface StageFilterBarProps {
  stageFilter: StageFilter;
  stageBuckets: Record<StageId, number>;
  totalCount: number;
  onStageChange: (stage: StageFilter) => void;
}

// Define primary stages (most commonly used) 
const PRIMARY_STAGE_IDS: StageId[] = [
  "welcome_stage",
  "sold_building", 
  "working_lead",
  "callbacks",
  "storage",
  "canceled"
];

export function StageFilterBar({ stageFilter, stageBuckets, totalCount, onStageChange }: StageFilterBarProps) {
  const [showMore, setShowMore] = useState(false);

  // Compute primary and secondary stages from shared configuration
  const primarySet = new Set(PRIMARY_STAGE_IDS);
  const primaryStages = PIPELINE_STAGES.filter(s => primarySet.has(s.id as StageId));
  const secondaryStages = PIPELINE_STAGES.filter(s => !primarySet.has(s.id as StageId));

  // Chip component
  function StageChip({
    active,
    label,
    count,
    onClick,
  }: {
    active: boolean;
    label: string;
    count: number;
    onClick: () => void;
  }) {
    return (
      <button
        onClick={onClick}
        className={[
          "rounded-full px-3 py-1 text-sm border transition",
          active
            ? "bg-blue-500 text-white border-blue-500"
            : "bg-transparent text-slate-200 border-slate-700 hover:bg-slate-800",
        ].join(" ")}
      >
        {label} · {count}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* All chip */}
      <StageChip
        active={stageFilter === "ALL"}
        label="All"
        count={totalCount}
        onClick={() => onStageChange("ALL")}
      />

      {/* Primary stages */}
      {primaryStages.map(stage => (
        <StageChip
          key={stage.id}
          active={stageFilter === stage.id}
          label={stage.label}
          count={stageBuckets[stage.id as StageId] ?? 0}
          onClick={() => onStageChange(stage.id as StageFilter)}
        />
      ))}

      {/* More stages toggle */}
      {secondaryStages.length > 0 && (
        <button
          type="button"
          className="rounded-full px-3 py-1 text-xs border border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => setShowMore(prev => !prev)}
        >
          {showMore ? "Hide stages" : "More stages"}
        </button>
      )}

      {/* Secondary stages (collapsible) */}
      {showMore && secondaryStages.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 w-full">
          {secondaryStages.map(stage => (
            <StageChip
              key={stage.id}
              active={stageFilter === stage.id}
              label={stage.label}
              count={stageBuckets[stage.id as StageId] ?? 0}
              onClick={() => onStageChange(stage.id as StageFilter)}
            />
          ))}
        </div>
      )}
    </div>
  );
}