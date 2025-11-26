import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, Mail, MessageSquare, FileText, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  type: string;
  content: string;
  createdAt: Date;
  userId: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

const activityIcons: Record<string, any> = {
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  note: FileText,
  meeting: Calendar,
};

const activityColors: Record<string, string> = {
  call: "text-blue-400 bg-blue-500/10",
  email: "text-purple-400 bg-purple-500/10",
  sms: "text-green-400 bg-green-500/10",
  note: "text-amber-400 bg-amber-500/10",
  meeting: "text-pink-400 bg-pink-500/10",
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <Card className="border-card-border bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activities yet
              </div>
            ) : (
              activities.map((activity, index) => {
                const Icon = activityIcons[activity.type] || FileText;
                const colorClass = activityColors[activity.type] || "text-gray-400 bg-gray-500/10";
                
                return (
                  <div key={activity.id} className="flex gap-3" data-testid={`activity-${activity.id}`}>
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        {activity.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {index < activities.length - 1 && (
                      <div className="absolute left-[1.25rem] top-12 h-full w-px bg-border -z-10" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
