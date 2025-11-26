import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function CallbackCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  
  const { data: callbacks = [], isLoading } = useQuery({
    queryKey: ["/api/callbacks"],
    queryFn: () => fetch("/api/callbacks").then(r => r.json()),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/callbacks/${id}`, { completed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/callbacks"] });
    },
  });

  const upcomingCallbacks = callbacks
    .filter((cb: any) => new Date(cb.scheduledAt) >= new Date())
    .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 10);

  return (
    <div className="h-full overflow-auto p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Callback Calendar</h1>
        </div>
        <Button size="sm" variant="default" data-testid="button-new-callback">
          <Plus className="w-4 h-4 mr-2" />
          Schedule
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : upcomingCallbacks.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No upcoming callbacks scheduled</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {upcomingCallbacks.map((callback: any) => (
            <Card key={callback.id} className="bg-card/50 backdrop-blur-sm hover-elevate transition-all">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm sm:text-base truncate">
                        {callback.lead?.companyName || "Lead"}
                      </h3>
                      <Badge variant={callback.completed ? "outline" : "default"} className="flex-shrink-0">
                        {callback.completed ? "Done" : "Scheduled"}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {new Date(callback.scheduledAt).toLocaleString()}
                    </p>
                    {callback.notes && (
                      <p className="text-xs sm:text-sm text-foreground mt-2 truncate">
                        {callback.notes}
                      </p>
                    )}
                  </div>
                  {!callback.completed && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => completeMutation.mutate(callback.id)}
                      disabled={completeMutation.isPending}
                      data-testid="button-complete-callback"
                      className="flex-shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
