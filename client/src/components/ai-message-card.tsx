import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIMessageCardProps {
  message: string;
  title?: string;
}

export function AIMessageCard({ message, title = "AI-Generated Message" }: AIMessageCardProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    toast({
      title: "Copied!",
      description: "Message copied to clipboard",
    });
  };

  return (
    <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">{title}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            data-testid="button-copy-ai-message"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-ai-message">
          {message}
        </p>
      </CardContent>
    </Card>
  );
}
