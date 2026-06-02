import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, TrendingUp, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface LeadAnalysis {
  companyId: string;
  priorityScore: number;
  keyReasons: string[];
  recommendedAction: string;
  concerns?: string[];
  conversionProbability: 'High' | 'Medium' | 'Low';
}

export function AILeadPrioritization() {
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [analyses, setAnalyses] = useState<LeadAnalysis[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: topCompanies, isLoading } = useQuery({
    queryKey: ['top-companies-for-ai'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name, industry_type, segment, priority_tier, lead_score')
        .in('priority_tier', ['P1', 'P2'])
        .order('lead_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    }
  });

  const runAnalysis = async () => {
    if (!topCompanies || topCompanies.length === 0) return;

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-prioritize-leads', {
        body: { companyIds: topCompanies.map(c => c.id) }
      });

      if (error) throw error;

      setAnalyses(data.analyses);
      toast({
        title: 'Analysis Complete',
        description: `AI analyzed ${data.analyses.length} companies`,
      });
    } catch (error: any) {
      console.error('AI analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Failed to analyze leads',
        variant: 'destructive'
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleExpanded = (companyId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  const getCompanyName = (companyId: string) => {
    return topCompanies?.find(c => c.id === companyId)?.company_name || 'Unknown';
  };

  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-500/10 border-green-500/20';
    if (score >= 60) return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
    return 'text-orange-600 bg-orange-500/10 border-orange-500/20';
  };

  const getConversionColor = (prob: string) => {
    if (prob === 'High') return 'bg-green-500/10 text-green-700 border-green-500/20';
    if (prob === 'Medium') return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Lead Prioritization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Lead Prioritization
        </CardTitle>
        <CardDescription>
          AI-powered analysis of your top leads with actionable recommendations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {analyses.length === 0 ? (
          <div className="text-center py-6">
            <Button
              onClick={runAnalysis}
              disabled={analyzing || !topCompanies || topCompanies.length === 0}
              size="lg"
            >
              <Brain className={`h-4 w-4 mr-2 ${analyzing ? 'animate-pulse' : ''}`} />
              {analyzing ? 'Analyzing...' : 'Analyze Top Leads'}
            </Button>
            {topCompanies && topCompanies.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Ready to analyze {topCompanies.length} companies
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {analyses
              .sort((a, b) => b.priorityScore - a.priorityScore)
              .map((analysis) => (
                <Collapsible
                  key={analysis.companyId}
                  open={expandedIds.has(analysis.companyId)}
                  onOpenChange={() => toggleExpanded(analysis.companyId)}
                >
                  <div className="border border-border rounded-lg overflow-hidden">
                    <CollapsibleTrigger className="w-full p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium">{getCompanyName(analysis.companyId)}</p>
                            <Badge variant="outline" className={getPriorityColor(analysis.priorityScore)}>
                              Score: {analysis.priorityScore}/100
                            </Badge>
                            <Badge variant="outline" className={getConversionColor(analysis.conversionProbability)}>
                              {analysis.conversionProbability} Conversion
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {analysis.recommendedAction}
                          </p>
                        </div>
                        {expandedIds.has(analysis.companyId) ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground ml-2" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground ml-2" />
                        )}
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="p-4 pt-0 space-y-4 border-t">
                        {/* Key Reasons */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <p className="text-sm font-medium">Key Strengths</p>
                          </div>
                          <ul className="space-y-1 ml-6">
                            {analysis.keyReasons.map((reason, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground">• {reason}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Concerns */}
                        {analysis.concerns && analysis.concerns.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <p className="text-sm font-medium">Potential Concerns</p>
                            </div>
                            <ul className="space-y-1 ml-6">
                              {analysis.concerns.map((concern, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground">• {concern}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommended Action */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium">Recommended Next Action</p>
                          </div>
                          <p className="text-sm text-muted-foreground ml-6">{analysis.recommendedAction}</p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}

            <Button
              variant="outline"
              onClick={runAnalysis}
              disabled={analyzing}
              className="w-full"
            >
              {analyzing ? 'Re-analyzing...' : 'Re-analyze Leads'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}