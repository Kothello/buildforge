import { useState, useCallback } from "react";
import { Upload, FileText, Mail, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface LeadDropZoneProps {
  onDrop: (file: File, content: string) => void;
}

export function LeadDropZone({ onDrop }: LeadDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const file = files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
          const content = event.target?.result as string;
          onDrop(file, content);
          toast({
            title: "Processing...",
            description: `Analyzing ${file.name} with AI...`,
          });
        };
        
        if (file.type.includes("text") || file.type.includes("csv")) {
          reader.readAsText(file);
        } else {
          reader.readAsDataURL(file);
        }
      }
    },
    [onDrop, toast]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <Card
      className={`
        relative border-2 border-dashed transition-all duration-200
        ${isDragging 
          ? "border-primary bg-primary/5 scale-105" 
          : "border-muted-foreground/25 hover:border-primary/50"
        }
      `}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      data-testid="dropzone-lead"
    >
      <div className="p-12 text-center">
        <div className="mb-6 flex justify-center gap-4">
          <div className={`p-3 rounded-lg ${isDragging ? "bg-primary/20" : "bg-muted"} transition-colors`}>
            <Upload className={`h-8 w-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className={`p-3 rounded-lg ${isDragging ? "bg-primary/20" : "bg-muted"} transition-colors`}>
            <Mail className={`h-8 w-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className={`p-3 rounded-lg ${isDragging ? "bg-primary/20" : "bg-muted"} transition-colors`}>
            <FileText className={`h-8 w-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className={`p-3 rounded-lg ${isDragging ? "bg-primary/20" : "bg-muted"} transition-colors`}>
            <ImageIcon className={`h-8 w-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
          </div>
        </div>
        
        <h3 className="text-xl font-semibold mb-2">
          {isDragging ? "Drop it here!" : "Universal Lead Ingestion"}
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Drop anything — emails, screenshots, CSV files, contact cards.
          <br />
          <span className="text-primary font-medium">AI will extract everything instantly.</span>
        </p>
      </div>
    </Card>
  );
}
