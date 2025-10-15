import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Mail, User, Key, MailCheck, MailOpen } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface PendingUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string;
  created_at: string;
  approval_status: string;
  temp_password?: string | null;
  invitation_email_sent_at?: string | null;
  invitation_email_delivered_at?: string | null;
  invitation_email_opened_at?: string | null;
  invitation_email_status?: string | null;
}

export function UserApprovalPanel() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      
      // Use admin function to get all profiles, then filter for pending
      const { data: profiles, error: profilesError } = await supabase.rpc('admin_get_all_profiles');

      if (profilesError) {
        if (profilesError.message?.includes('Admin access required')) {
          toast({
            title: 'Access Denied',
            description: 'Admin access required to view pending users',
            variant: 'destructive'
          });
          return;
        }
        throw profilesError;
      }

      // Filter for pending users only
      const pendingProfiles = (profiles || []).filter(p => p.approval_status === 'pending');

      if (pendingProfiles && pendingProfiles.length > 0) {
        const usersWithEmails = pendingProfiles.map(profile => {
          const profileData = profile as any; // Type assertion for new fields
          return {
            id: profileData.id,
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            created_at: profileData.created_at,
            approval_status: profileData.approval_status,
            email: profileData.email || 'No email',
            temp_password: profileData.temp_password || null,
            invitation_email_sent_at: profileData.invitation_email_sent_at || null,
            invitation_email_delivered_at: profileData.invitation_email_delivered_at || null,
            invitation_email_opened_at: profileData.invitation_email_opened_at || null,
            invitation_email_status: profileData.invitation_email_status || null
          };
        });

        setPendingUsers(usersWithEmails);
      } else {
        setPendingUsers([]);
      }
    } catch (error) {
      console.error('Error fetching pending users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();

    // Subscribe to profile changes
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchPendingUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApproval = async (userId: string, approve: boolean) => {
    setProcessingId(userId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          approval_status: approve ? 'approved' : 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', userId);

      if (error) throw error;

      // Send notification email
      try {
        await supabase.functions.invoke('send-approval-status-notification', {
          body: {
            userId,
            status: approve ? 'approved' : 'rejected'
          }
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
        // Don't fail the approval if notification fails
      }

      toast({
        title: approve ? 'User Approved' : 'User Rejected',
        description: `User has been ${approve ? 'approved' : 'rejected'} successfully`,
      });

      fetchPendingUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending User Approvals</CardTitle>
          <CardDescription>Loading pending user requests...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending User Approvals
          {pendingUsers.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {pendingUsers.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Review and approve new user registration requests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingUsers.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              No pending user approvals at this time
            </AlertDescription>
          </Alert>
        ) : (
          pendingUsers.map((user) => (
            <Card key={user.id} className="border">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {user.first_name && user.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : 'No name provided'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Requested: {new Date(user.created_at).toLocaleDateString()}
                    </div>
                    
                    {user.temp_password && (
                      <>
                        <Separator className="my-2" />
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Temp Password:</span>
                            <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                              {user.temp_password}
                            </code>
                          </div>
                          
                          <div className="text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              <span>
                                Sent: {user.invitation_email_sent_at 
                                  ? new Date(user.invitation_email_sent_at).toLocaleString()
                                  : 'Not sent'}
                              </span>
                            </div>
                            {user.invitation_email_delivered_at && (
                              <div className="flex items-center gap-2 text-green-600">
                                <MailCheck className="h-3 w-3" />
                                <span>
                                  Delivered: {new Date(user.invitation_email_delivered_at).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {user.invitation_email_opened_at && (
                              <div className="flex items-center gap-2 text-blue-600">
                                <MailOpen className="h-3 w-3" />
                                <span>
                                  Opened: {new Date(user.invitation_email_opened_at).toLocaleString()}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                user.invitation_email_status === 'opened' ? 'default' :
                                user.invitation_email_status === 'delivered' ? 'secondary' :
                                user.invitation_email_status === 'sent' ? 'outline' :
                                'destructive'
                              } className="text-xs">
                                {user.invitation_email_status || 'pending'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApproval(user.id, true)}
                      disabled={processingId === user.id}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleApproval(user.id, false)}
                      disabled={processingId === user.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}