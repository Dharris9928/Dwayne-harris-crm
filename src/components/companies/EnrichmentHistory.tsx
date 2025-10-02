import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EnrichmentLog {
  id: string;
  provider: string;
  enrichment_type: string;
  status: string;
  confidence_score: number | null;
  fields_enriched: any;
  error_message: string | null;
  created_at: string;
}

interface EnrichmentHistoryProps {
  companyId: string;
}

export function EnrichmentHistory({ companyId }: EnrichmentHistoryProps) {
  const [logs, setLogs] = useState<EnrichmentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyBefore, setCompanyBefore] = useState<Record<string, any>>({});
  const [applyingLog, setApplyingLog] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [companyId]);

  const loadHistory = async () => {
    try {
      // Get enrichment logs
      const { data, error } = await supabase
        .from('enrichment_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      // Get current company data to show changes
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      
      if (company) {
        setCompanyBefore(company);
      }
      
      setLogs(data || []);
    } catch (error) {
      console.error('Failed to load enrichment history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading history...</div>;
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Enrichment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No enrichment history yet</p>
        </CardContent>
      </Card>
    );
  }

  const handleForceApply = async (logId: string) => {
    setApplyingLog(logId);
    try {
      const { data, error } = await supabase.functions.invoke('force-apply-enrichment', {
        body: { enrichmentLogId: logId }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(data.message || 'Enrichment applied successfully');
        // Reload the history to show the new manual application log
        await loadHistory();
      }
    } catch (error) {
      console.error('Failed to force-apply enrichment:', error);
      toast.error('Failed to apply enrichment');
    } finally {
      setApplyingLog(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'rate_limited':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Recent Enrichments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.map((log) => {
          const isObject = log.fields_enriched && typeof log.fields_enriched === 'object' && !Array.isArray(log.fields_enriched);
          const fieldsArray = Array.isArray(log.fields_enriched) ? log.fields_enriched : [];
          const fieldKeys = isObject ? Object.keys(log.fields_enriched) : fieldsArray;
          const fieldCount = fieldKeys.length;
          const canForceApply = isObject && fieldCount > 0 && log.status === 'success' && log.enrichment_type !== 'manual_reapply';
          
          return (
            <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="mt-0.5">{getStatusIcon(log.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant={log.enrichment_type === 'deep' ? 'default' : log.enrichment_type === 'manual_reapply' ? 'outline' : 'secondary'}>
                    {log.enrichment_type === 'manual_reapply' ? 'manual' : log.enrichment_type}
                  </Badge>
                  <Badge variant="outline">
                    {log.provider === 'lovable_ai' ? 'Gemini' : log.provider === 'claude' ? 'Claude' : log.provider.replace('_manual', '')}
                  </Badge>
                  {log.confidence_score && (
                    <Badge variant="outline" className="text-xs">
                      {log.confidence_score}% confidence
                    </Badge>
                  )}
                </div>
                
                {log.status === 'success' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      ✓ Successfully enriched {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                    </p>
                    {fieldCount > 0 && (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer hover:text-foreground">
                          View updated fields {isObject && '& values'}
                        </summary>
                        <div className="mt-2 pl-4 space-y-1">
                          {fieldKeys.map((field: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span className="capitalize">
                                {field.replace(/_/g, ' ')}
                                {isObject && (
                                  <span className="text-foreground font-medium ml-2">
                                    = {JSON.stringify(log.fields_enriched[field])}
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                    {canForceApply && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleForceApply(log.id)}
                        disabled={applyingLog === log.id}
                        className="mt-2"
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${applyingLog === log.id ? 'animate-spin' : ''}`} />
                        Force Apply to Company
                      </Button>
                    )}
                  </div>
                )}
                
                {log.error_message && (
                  <p className="text-xs text-red-500 mt-1">{log.error_message}</p>
                )}
                
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
