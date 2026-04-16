import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { PIPELINE_STAGES, type StageId } from "@shared/pipelineStages";

interface LeadsToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  stageFilter: string;
  onStageChange: (stage: string) => void;
  className?: string;
}

export function LeadsToolbar({
  searchValue,
  onSearchChange,
  stageFilter,
  onStageChange,
  className,
}: LeadsToolbarProps) {
  const hasFilters = searchValue || (stageFilter && stageFilter !== "ALL");

  const handleClearFilters = () => {
    onSearchChange("");
    onStageChange("ALL");
  };

  return (
    <div 
      className={cn("flex flex-col sm:flex-row gap-3 items-start sm:items-center", className)}
      data-testid="leads-toolbar"
    >
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search leads..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
          data-testid="leads-search"
        />
      </div>

      {/* Stage Filter */}
      <Select value={stageFilter} onValueChange={onStageChange}>
        <SelectTrigger className="w-[180px]" data-testid="leads-filter-stage">
          <SelectValue placeholder="All Stages" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Stages</SelectItem>
          {PIPELINE_STAGES.map((stage) => (
            <SelectItem key={stage.id} value={stage.id}>
              {stage.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClearFilters}
          data-testid="leads-clear-filters"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
