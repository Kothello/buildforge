import { useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Phone, Coffee, LogOut, Loader2, Clock } from "lucide-react";

interface BreakStatus {
  onBreak: boolean;
  breakType: string | null;
  breakStartedAt: string | null;
}

const BREAK_TYPES = [
  { value: 'break', label: 'Break (15min)', duration: 15 },
  { value: 'lunch', label: 'Lunch (30min)', duration: 30 },
  { value: 'bathroom', label: 'Bathroom (5min)', duration: 5 },
  { value: 'training', label: 'Training', duration: null },
] as const;

export function AgentControlPanel() {
  const [, navigate] = useLocation();
  const [breakType, setBreakType] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: breakStatus } = useQuery<BreakStatus>({
    queryKey: ['/api/agent/break-status'],
    queryFn: async () => {
      const response = await authedFetch('/api/agent/break-status');
      if (!response.ok) throw new Error('Failed to fetch break status');
      return response.json();
    },
    refetchInterval: 5000, // Check status every 5 seconds
  });

  const startCallingMutation = useMutation({
    mutationFn: async () => {
      const response = await authedFetch('/api/agent/start-calling', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to start calling session');
      return response.json();
    },
    onSuccess: () => {
      navigate('/dialer');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start calling session",
        variant: "destructive",
      });
    }
  });

  const startBreakMutation = useMutation({
    mutationFn: async (type: string) => {
      const response = await authedFetch('/api/agent/break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breakType: type }),
      });
      if (!response.ok) throw new Error('Failed to start break');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent/break-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/sales-reps'] });
      toast({
        title: "Break Started",
        description: data.message || "You're now on break",
      });
      setBreakType('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start break",
        variant: "destructive",
      });
    }
  });

  const endBreakMutation = useMutation({
    mutationFn: async () => {
      const response = await authedFetch('/api/agent/break/end', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to end break');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent/break-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/sales-reps'] });
      toast({
        title: "Break Ended",
        description: "You're back to active status",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to end break",
        variant: "destructive",
      });
    }
  });

  const handleLogout = () => {
    navigate('/logout');
  };

  const getBreakTimeRemaining = () => {
    if (!breakStatus?.onBreak || !breakStatus.breakStartedAt) return null;
    
    const breakConfig = BREAK_TYPES.find(b => b.value === breakStatus.breakType);
    if (!breakConfig?.duration) return null;

    const startTime = new Date(breakStatus.breakStartedAt).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - startTime) / 1000 / 60); // minutes
    const remaining = breakConfig.duration - elapsed;

    return remaining > 0 ? remaining : 0;
  };

  const timeRemaining = getBreakTimeRemaining();

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Agent Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        {breakStatus?.onBreak ? (
          <div className="space-y-4">
            <div className="p-4 bg-orange-100 border border-orange-300 rounded-lg text-center">
              <Coffee className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <p className="font-semibold text-orange-900">
                On {breakStatus.breakType}
              </p>
              {timeRemaining !== null && (
                <p className="text-sm text-orange-700 mt-1 flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4" />
                  {timeRemaining} minutes remaining
                </p>
              )}
            </div>
            
            <Button
              onClick={() => endBreakMutation.mutate()}
              disabled={endBreakMutation.isPending}
              className="w-full"
              variant="default"
            >
              {endBreakMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              End Break
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Start Calling Button */}
            <Button
              onClick={() => startCallingMutation.mutate()}
              disabled={startCallingMutation.isPending}
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {startCallingMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Phone className="w-5 h-5 mr-2" />
              )}
              Start Calling
            </Button>

            {/* Break Controls */}
            <div className="flex gap-2">
              <Select value={breakType} onValueChange={setBreakType}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select break type..." />
                </SelectTrigger>
                <SelectContent>
                  {BREAK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                onClick={() => breakType && startBreakMutation.mutate(breakType)}
                disabled={!breakType || startBreakMutation.isPending}
                variant="outline"
                className="bg-yellow-50 hover:bg-yellow-100 border-yellow-300"
              >
                {startBreakMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Coffee className="w-4 h-4 mr-2" />
                )}
                Start Break
              </Button>
            </div>

            {/* Logout Button */}
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
