import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Users, Clock, TrendingUp } from 'lucide-react';

export function PresentationAnalytics() {
  const [stats, setStats] = useState({
    totalViews: 0,
    uniqueViewers: 0,
    avgDuration: 0,
    topPresentation: '',
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Total views
      const { count: totalViews } = await supabase
        .from('presentation_access_logs')
        .select('*', { count: 'exact', head: true });

      // Unique IPs
      const { data: uniqueData } = await supabase
        .from('presentation_access_logs')
        .select('ip_address');
      
      const uniqueViewers = new Set(uniqueData?.map(d => d.ip_address)).size;

      // Average duration
      const { data: durationData } = await supabase
        .from('presentation_access_logs')
        .select('duration_seconds')
        .not('duration_seconds', 'is', null);
      
      const avgDuration = durationData && durationData.length > 0
        ? Math.round(
            durationData.reduce((sum, d) => sum + (d.duration_seconds || 0), 0) / durationData.length
          )
        : 0;

      // Most viewed presentation
      const { data: viewCounts } = await supabase
        .from('presentation_access_logs')
        .select('presentation_id, presentations(title)')
        .limit(100);

      const countMap = new Map<string, number>();
      viewCounts?.forEach(v => {
        const id = v.presentation_id;
        countMap.set(id, (countMap.get(id) || 0) + 1);
      });

      const topId = [...countMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const topTitle = viewCounts?.find(v => v.presentation_id === topId)?.presentations?.title || 'N/A';

      setStats({
        totalViews: totalViews || 0,
        uniqueViewers,
        avgDuration,
        topPresentation: topTitle,
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium font-google">Total Views</CardTitle>
          <BarChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-google">{stats.totalViews}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium font-google">Unique Viewers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-google">{stats.uniqueViewers}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium font-google">Avg Duration</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-google">{stats.avgDuration}s</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium font-google">Top Presentation</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm font-medium font-google truncate">{stats.topPresentation}</div>
        </CardContent>
      </Card>
    </div>
  );
}