import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActionButtonsProps {
  phone?: string;
  email?: string;
  onCall?: () => void;
  onText?: () => void;
  onEmail?: () => void;
}

export function ActionButtons({ phone, email, onCall, onText, onEmail }: ActionButtonsProps) {
  const { toast } = useToast();

  const handleCall = () => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
    onCall?.();
    toast({
      title: "Initiating Call",
      description: `Calling ${phone}...`,
    });
  };

  const handleText = () => {
    if (phone) {
      window.location.href = `sms:${phone}`;
    }
    onText?.();
    toast({
      title: "Opening Messages",
      description: `Texting ${phone}...`,
    });
  };

  const handleEmail = () => {
    if (email) {
      window.location.href = `mailto:${email}`;
    }
    onEmail?.();
    toast({
      title: "Opening Email",
      description: `Emailing ${email}...`,
    });
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <Button
        size="lg"
        variant="default"
        className="w-full h-14 text-base gap-3 bg-primary hover-elevate active-elevate-2"
        onClick={handleCall}
        data-testid="button-call"
      >
        <Phone className="h-5 w-5" />
        Call Now
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="w-full h-14 text-base gap-3 hover-elevate active-elevate-2"
        onClick={handleText}
        data-testid="button-text"
      >
        <MessageSquare className="h-5 w-5" />
        Text Now
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="w-full h-14 text-base gap-3 hover-elevate active-elevate-2"
        onClick={handleEmail}
        data-testid="button-email"
      >
        <Mail className="h-5 w-5" />
        Email Now
      </Button>
    </div>
  );
}
