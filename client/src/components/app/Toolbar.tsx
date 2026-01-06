import React from "react";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function Toolbar({ left, right, className }: ToolbarProps) {
  if (!left && !right) return null;
  
  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4",
      className
    )}>
      {left && (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {left}
        </div>
      )}
      
      {right && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {right}
        </div>
      )}
    </div>
  );
}
