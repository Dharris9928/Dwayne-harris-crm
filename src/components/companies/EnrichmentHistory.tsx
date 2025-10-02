import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

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

  useEffect(() => {
    loadHistory();
  }, [companyId]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('enrichment_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
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
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
            <div className="mt-0.5">{getStatusIcon(log.status)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={log.enrichment_type === 'deep' ? 'default' : 'secondary'}>
                  {log.enrichment_type}
                </Badge>
                <Badge variant="outline">
                  {log.provider === 'lovable_ai' ? 'Gemini' : 'Claude'}
                </Badge>
                {log.confidence_score && (
                  <span className="text-xs text-muted-foreground">
                    {log.confidence_score}% confidence
                  </span>
                )}
              </div>
              {log.fields_enriched && Array.isArray(log.fields_enriched) && (
                <p className="text-xs text-muted-foreground mb-1">
                  Updated {log.fields_enriched.length} fields
                </p>
              )}
              {log.error_message && (
                <p className="text-xs text-red-500">{log.error_message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
