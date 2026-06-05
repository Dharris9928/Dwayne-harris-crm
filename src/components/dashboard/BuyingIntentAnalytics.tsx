import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { usePerspective } from '@/hooks/usePerspective';

interface TopicData {
  topic: string;
  count: number;
  avgScore: number;
}

export function BuyingIntentAnalytics() {
  const { perspective } = usePerspective('my_records', 'companies');
  const [topicData, setTopicData] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopicAnalytics();
  }, [perspective]);

  async function fetchTopicAnalytics() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('companies')
        .select('buying_intent_topics, lead_score, created_by, assigned_to_sales_rep_id')
        .not('buying_intent_topics', 'is', null);

      // Apply perspective filter
      if (perspective === 'my_records') {
        query = query.eq('created_by', user.id);
      } else if (perspective === 'assigned_to_me') {
        query = query.eq('assigned_to_sales_rep_id', user.id);
      }

      const { data, error } = await query;
      
      if (!error && data) {
        // Aggregate topics
        const topicMap = new Map<string, { count: number; totalScore: number }>();
        
        data.forEach((company) => {
          company.buying_intent_topics?.forEach((topic: string) => {
            const existing = topicMap.get(topic) || { count: 0, totalScore: 0 };
            topicMap.set(topic, {
              count: existing.count + 1,
              totalScore: existing.totalScore + (company.lead_score || 0)
            });
          });
        });

        const sorted = Array.from(topicMap.entries())
          .map(([topic, stats]) => ({
            topic,
            count: stats.count,
            avgScore: Math.round(stats.totalScore / stats.count)
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setTopicData(sorted);
      }
    } catch (error) {
      console.error('Error fetching topic analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Top Buying Intent Topics
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (topicData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Top Buying Intent Topics
          </CardTitle>
          <CardDescription>
            No buying intent data available yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Import companies from Apollo with buying intent signals to see what your prospects are researching
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange-500" />
          Top Buying Intent Topics
        </CardTitle>
        <CardDescription>
          What your prospects are actively researching
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topicData.map((item, index) => (
            <div key={item.topic} className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Badge variant="outline" className="text-xs w-6 h-6 flex items-center justify-center">
                  {index + 1}
                </Badge>
                <span className="text-sm font-medium">{item.topic}</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-xs">
                  {item.count} {item.count === 1 ? 'company' : 'companies'}
                </Badge>
                <Badge variant="default" className="text-xs">
                  Avg Score: {item.avgScore}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
