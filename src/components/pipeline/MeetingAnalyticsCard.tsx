import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Calendar, CalendarPlus, CalendarCheck } from "lucide-react";

interface MeetingAnalyticsCardProps {
  metrics: {
    responsesReceived: number;
    meetingsScheduled: number;
    meetingsCompleted: number;
    scheduleRate: number;
    completionRate: number;
  } | undefined;
  isLoading: boolean;
}

export function MeetingAnalyticsCard({ metrics, isLoading }: MeetingAnalyticsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-yellow-500" />
          Meeting Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Schedule Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <CalendarPlus className="h-4 w-4 text-yellow-500" />
              <span>Schedule Rate</span>
            </div>
            <span className="text-lg font-bold">{metrics.scheduleRate.toFixed(1)}%</span>
          </div>
          <Progress value={metrics.scheduleRate} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {metrics.meetingsScheduled} scheduled from {metrics.responsesReceived} responses
          </p>
        </div>

        {/* Completion Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <CalendarCheck className="h-4 w-4 text-orange-500" />
              <span>Completion Rate</span>
            </div>
            <span className="text-lg font-bold">{metrics.completionRate.toFixed(1)}%</span>
          </div>
          <Progress value={metrics.completionRate} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {metrics.meetingsCompleted} completed of {metrics.meetingsScheduled} scheduled
          </p>
        </div>

        {/* Summary Stats */}
        <div className="pt-2 border-t grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-500">{metrics.meetingsScheduled}</p>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">{metrics.meetingsCompleted}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
