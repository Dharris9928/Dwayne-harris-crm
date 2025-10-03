import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, RefreshCw, Calendar, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface EnrichmentError {
  id: string;
  company_id: string;
  provider: string;
  enrichment_type: string;
  status: string;
  error_message: string;
  created_at: string;
  company_name?: string;
}

export function EnrichmentErrorLog() {
  const [errors, setErrors] = useState<EnrichmentError[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Check if user has admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (roleData) {
        setIsAdmin(true);
        loadErrors();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const loadErrors = async () => {
    try {
      setLoading(true);
      
      // Get errors from enrichment_logs with company names
      const { data, error } = await supabase
        .from('enrichment_logs')
        .select(`
          id,
          company_id,
          provider,
          enrichment_type,
          status,
          error_message,
          created_at,
          companies!inner(company_name)
        `)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedErrors = data?.map(log => ({
        ...log,
        company_name: (log.companies as any)?.company_name
      })) || [];

      setErrors(formattedErrors);
    } catch (error) {
      console.error('Error loading enrichment errors:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return null; // Don't show anything to non-admins
  }

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'lovable_ai':
        return 'bg-blue-500';
      case 'claude':
        return 'bg-purple-500';
      case 'deepseek':
        return 'bg-cyan-500';
      case 'perplexity':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'lovable_ai':
        return 'Gemini';
      case 'claude':
        return 'Claude';
      case 'deepseek':
        return 'Deepseek';
      case 'perplexity':
        return 'Perplexity';
      default:
        return provider;
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>AI Enrichment Errors</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadErrors}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          Recent AI enrichment failures - Admin only
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading errors...
          </div>
        ) : errors.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground">No enrichment errors found</p>
            <p className="text-sm text-muted-foreground mt-1">
              All enrichment operations completed successfully
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {errors.map((error) => (
                <div
                  key={error.id}
                  className="border border-border rounded-lg p-4 space-y-3 hover:border-destructive/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">
                        {error.company_name || 'Unknown Company'}
                      </span>
                    </div>
                    <Badge className={getProviderBadgeColor(error.provider)}>
                      {getProviderName(error.provider)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(error.created_at), 'MMM dd, yyyy HH:mm:ss')}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {error.enrichment_type}
                      </Badge>
                      <Badge variant="destructive" className="text-xs">
                        Failed
                      </Badge>
                    </div>
                  </div>

                  {error.error_message && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                      <p className="text-sm text-destructive font-mono break-words">
                        {error.error_message}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground font-mono truncate">
                    Company ID: {error.company_id}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {errors.length > 0 && (
          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
            <p>Showing {errors.length} most recent errors (last 50)</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
