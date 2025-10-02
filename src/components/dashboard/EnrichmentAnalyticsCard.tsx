import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, Target, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function EnrichmentAnalyticsCard() {
  const enrichmentStats = useQuery({
    queryKey: ['enrichment-analytics'],
    queryFn: async () => {
      // Get total enriched companies
      const { data: enrichedCompanies, error: enrichedError } = await supabase
        .from('enrichment_logs')
        .select('company_id', { count: 'exact' })
        .eq('status', 'success');

      if (enrichedError) throw enrichedError;

      // Get unique companies enriched
      const uniqueCompanies = new Set(enrichedCompanies?.map(e => e.company_id) || []);

      // Get average confidence score
      const { data: confidenceData, error: confidenceError } = await supabase
        .from('enrichment_logs')
        .select('confidence_score')
        .eq('status', 'success');

      if (confidenceError) throw confidenceError;

      const avgConfidence = confidenceData && confidenceData.length > 0
        ? Math.round(confidenceData.reduce((sum, log) => sum + (log.confidence_score || 0), 0) / confidenceData.length)
        : 0;

      // Get most enriched fields
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('enrichment_logs')
        .select('fields_enriched')
        .eq('status', 'success');

      if (fieldsError) throw fieldsError;

      const fieldCounts: Record<string, number> = {};
      fieldsData?.forEach(log => {
        const fields = log.fields_enriched as string[];
        fields?.forEach(field => {
          fieldCounts[field] = (fieldCounts[field] || 0) + 1;
        });
      });

      const topFields = Object.entries(fieldCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([field, count]) => ({ field, count }));

      // Get total companies
      const { count: totalCompanies, error: totalError } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      return {
        totalEnriched: uniqueCompanies.size,
        totalCompanies: totalCompanies || 0,
        avgConfidence,
        topFields,
        enrichmentRate: totalCompanies ? Math.round((uniqueCompanies.size / totalCompanies) * 100) : 0
      };
    }
  });

  if (enrichmentStats.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Enrichment Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const stats = enrichmentStats.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Enrichment Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Companies Enriched</p>
            <p className="text-2xl font-bold">{stats?.totalEnriched} / {stats?.totalCompanies}</p>
            <Progress value={stats?.enrichmentRate || 0} className="h-2" />
            <p className="text-xs text-muted-foreground">{stats?.enrichmentRate}% coverage</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Avg. Confidence</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{stats?.avgConfidence}%</p>
              <Badge 
                variant="outline" 
                className={
                  (stats?.avgConfidence || 0) >= 80 ? 'bg-green-500/10 text-green-700' :
                  (stats?.avgConfidence || 0) >= 60 ? 'bg-yellow-500/10 text-yellow-700' :
                  'bg-orange-500/10 text-orange-700'
                }
              >
                {(stats?.avgConfidence || 0) >= 80 ? 'High' : 
                 (stats?.avgConfidence || 0) >= 60 ? 'Medium' : 'Low'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-2">Most Enriched Fields</p>
          <div className="space-y-2">
            {stats?.topFields?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.field}</span>
                <Badge variant="secondary">{item.count}x</Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
