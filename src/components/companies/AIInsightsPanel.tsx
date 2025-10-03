import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, Target, Lightbulb } from 'lucide-react';

interface AIInsight {
  market_positioning: string | null;
  competitive_advantages: string[] | null;
  growth_indicators: string[] | null;
  smart_home_readiness_score: number | null;
  recommended_approach: string | null;
  confidence_level: string | null;
  last_enriched_at: string | null;
  segment_rationale: string | null;
}

interface AIInsightsPanelProps {
  companyId: string;
}

export function AIInsightsPanel({ companyId }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [companyId]);

  const loadInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('company_ai_insights')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setInsights(data);
    } catch (error) {
      console.error('Failed to load AI insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading insights...</div>;
  }

  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No AI insights yet. Use "Enrich Data" to generate insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4" />
          AI-Generated Insights
          {insights.confidence_level && (
            <Badge variant={
              insights.confidence_level === 'high' ? 'default' : 
              insights.confidence_level === 'medium' ? 'secondary' : 'outline'
            }>
              {insights.confidence_level} confidence
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.segment_rationale && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Segment Assignment</span>
            </div>
            <p className="text-sm text-muted-foreground">{insights.segment_rationale}</p>
          </div>
        )}

        {insights.smart_home_readiness_score !== null && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Smart Home Readiness</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${insights.smart_home_readiness_score}%` }}
                />
              </div>
              <span className="text-sm font-semibold">{insights.smart_home_readiness_score}%</span>
            </div>
          </div>
        )}

        {insights.market_positioning && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Market Positioning</span>
            </div>
            <p className="text-sm text-muted-foreground">{insights.market_positioning}</p>
          </div>
        )}

        {insights.competitive_advantages && insights.competitive_advantages.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="h-4 w-4" />
              <span className="text-sm font-medium">Competitive Advantages</span>
            </div>
            <ul className="space-y-1">
              {insights.competitive_advantages.map((advantage, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{advantage}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {insights.growth_indicators && insights.growth_indicators.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Growth Indicators</span>
            </div>
            <ul className="space-y-1">
              {insights.growth_indicators.map((indicator, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{indicator}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {insights.recommended_approach && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Recommended Approach</span>
            </div>
            <p className="text-sm text-muted-foreground">{insights.recommended_approach}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
