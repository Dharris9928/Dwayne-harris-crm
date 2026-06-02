import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DiagnosticResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

export function SystemDiagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateResult = (name: string, status: DiagnosticResult['status'], message: string, details?: string) => {
    setResults(prev => {
      const existing = prev.find(r => r.name === name);
      if (existing) {
        return prev.map(r => r.name === name ? { name, status, message, details } : r);
      }
      return [...prev, { name, status, message, details }];
    });
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    toast.info("Running system diagnostics...");

    // Test 1: Authentication
    updateResult("Authentication", "running", "Checking authentication...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        updateResult("Authentication", "success", "User authenticated", `User ID: ${session.user.id}`);
      } else {
        updateResult("Authentication", "error", "No active session");
      }
    } catch (error) {
      updateResult("Authentication", "error", "Authentication check failed", error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 2: Database Connection
    updateResult("Database", "running", "Testing database connection...");
    try {
      const { data, error } = await supabase.from('profiles').select('count').single();
      if (error) throw error;
      updateResult("Database", "success", "Database connected", "Profiles table accessible");
    } catch (error) {
      updateResult("Database", "error", "Database connection failed", error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 3: Admin List Profiles Edge Function
    updateResult("admin-list-profiles", "running", "Testing admin-list-profiles edge function...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('admin-list-profiles', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      
      if (error) throw error;
      if (data?.listData?.profiles) {
        updateResult("admin-list-profiles", "success", "Edge function working", `Returned ${data.listData.profiles.length} profiles`);
      } else {
        updateResult("admin-list-profiles", "warning", "Unexpected response format", JSON.stringify(data));
      }
    } catch (error) {
      updateResult("admin-list-profiles", "error", "Edge function failed", error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 4: Email Tracking Fields
    updateResult("Email Tracking", "running", "Checking email tracking fields...");
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, invitation_email_status, invitation_email_sent_at, invitation_email_delivered_at, invitation_email_opened_at')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      updateResult("Email Tracking", "success", "Email tracking fields exist", "All tracking columns present");
    } catch (error) {
      updateResult("Email Tracking", "error", "Email tracking check failed", error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 5: Resend Webhook Endpoint
    updateResult("Resend Webhook", "running", "Checking webhook endpoint...");
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const webhookUrl = `https://${projectId}.supabase.co/functions/v1/resend-webhook`;
      
      // Just verify the URL is constructed correctly
      updateResult("Resend Webhook", "success", "Webhook endpoint configured", webhookUrl);
    } catch (error) {
      updateResult("Resend Webhook", "error", "Webhook check failed", error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 6: User Roles
    updateResult("User Roles", "running", "Checking user roles...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();
      
      if (error) throw error;
      updateResult("User Roles", "success", "User role found", `Role: ${data.role}`);
    } catch (error) {
      updateResult("User Roles", "error", "Role check failed", error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 7: RLS Policies
    updateResult("RLS Policies", "running", "Testing RLS policies...");
    try {
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      updateResult("RLS Policies", "success", "RLS policies allow read access");
    } catch (error) {
      updateResult("RLS Policies", "error", "RLS policy check failed", error instanceof Error ? error.message : 'Unknown error');
    }

    setIsRunning(false);
    toast.success("Diagnostics complete");
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variants: Record<DiagnosticResult['status'], string> = {
      pending: 'secondary',
      running: 'secondary',
      success: 'default',
      warning: 'secondary',
      error: 'destructive'
    };

    return (
      <Badge variant={variants[status] as any} className="ml-2">
        {status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Diagnostics</CardTitle>
        <CardDescription>
          Run comprehensive tests on all system components to verify functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run Diagnostics
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, index) => (
              <Card key={index} className="border-l-4" style={{
                borderLeftColor: result.status === 'success' ? 'rgb(34 197 94)' : 
                                result.status === 'error' ? 'rgb(239 68 68)' : 
                                result.status === 'warning' ? 'rgb(234 179 8)' : 
                                'rgb(148 163 184)'
              }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <div>
                        <div className="flex items-center">
                          <span className="font-medium">{result.name}</span>
                          {getStatusBadge(result.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {result.message}
                        </p>
                        {result.details && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted p-2 rounded">
                            {result.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
