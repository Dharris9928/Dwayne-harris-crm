import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { format } from 'date-fns';

interface FieldAccessLog {
  id: string;
  user_id: string;
  table_name: string;
  field_name: string;
  record_id: string;
  access_granted: boolean;
  accessed_at: string;
  user_first_name?: string;
  user_last_name?: string;
}

export function FieldAccessAuditLog() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['field-access-logs'],
    queryFn: async () => {
      const { data: accessLogs, error } = await supabase
        .from('field_access_log')
        .select('*')
        .order('accessed_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Fetch user profiles separately
      const userIds = [...new Set(accessLogs.map(log => log.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      // Merge logs with profile data
      const logsWithProfiles = accessLogs.map(log => {
        const profile = profiles?.find(p => p.id === log.user_id);
        return {
          ...log,
          user_first_name: profile?.first_name,
          user_last_name: profile?.last_name
        };
      });

      return logsWithProfiles as FieldAccessLog[];
    },
  });

  if (isLoading) {
    return <div>Loading audit logs...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Field Access Audit Log
        </CardTitle>
        <CardDescription>
          Monitor field-level access attempts across the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Record ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {log.user_first_name && log.user_last_name
                        ? `${log.user_first_name} ${log.user_last_name}`
                        : 'Unknown User'}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      ID: {log.user_id.substring(0, 8)}...
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{log.table_name}</TableCell>
                <TableCell>{log.field_name}</TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {log.record_id.substring(0, 8)}...
                </TableCell>
                <TableCell>
                  {log.access_granted ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      <Eye className="h-3 w-3 mr-1" />
                      Granted
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Denied
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(log.accessed_at), 'MMM d, yyyy h:mm a')}
                </TableCell>
              </TableRow>
            ))}
            {!logs?.length && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No field access logs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
