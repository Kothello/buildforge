import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  description?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ 
  title, 
  description, 
  headerAction, 
  footer, 
  children, 
  className 
}: SectionCardProps) {
  return (
    <div className={cn("rounded-2xl border bg-card shadow-sm", className)}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            {title && <h3 className="font-semibold">{title}</h3>}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && (
        <div className="border-t px-6 py-4">{footer}</div>
      )}
    </div>
  );
}
