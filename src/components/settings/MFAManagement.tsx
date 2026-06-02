import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { useMFAStatus } from '@/hooks/useMFAStatus';
import { MFAEnrollmentDialog } from './MFAEnrollmentDialog';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function MFAManagement() {
  const { mfaStatus, isMFAEnabled, isLoading, updateMFAStatus } = useMFAStatus();
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const handleDisableMFA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }

    try {
      setIsDisabling(true);
      
      // List and unenroll all factors
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp) {
        for (const factor of factors.totp) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      // Update status in database
      updateMFAStatus(false);

      toast.success('MFA disabled successfully');
    } catch (error: any) {
      toast.error('Failed to disable MFA', {
        description: error.message,
      });
    } finally {
      setIsDisabling(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const isGracePeriodActive = mfaStatus?.grace_period_expires_at && 
    new Date(mfaStatus.grace_period_expires_at) > new Date();
  const gracePeriodDaysLeft = isGracePeriodActive
    ? Math.ceil((new Date(mfaStatus.grace_period_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Two-Factor Authentication</CardTitle>
            </div>
            {isMFAEnabled ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">Disabled</Badge>
            )}
          </div>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isMFAEnabled && isGracePeriodActive && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                MFA is required for your role. You have {gracePeriodDaysLeft} day{gracePeriodDaysLeft !== 1 ? 's' : ''} remaining to set it up.
                After {format(new Date(mfaStatus.grace_period_expires_at), 'PPP')}, you won't be able to log in without MFA.
              </AlertDescription>
            </Alert>
          )}

          {isMFAEnabled ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-sm text-muted-foreground">
                    Enabled on {mfaStatus?.enrolled_at ? format(new Date(mfaStatus.enrolled_at), 'PPP') : 'Unknown'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDisableMFA}
                  disabled={isDisabling}
                >
                  {isDisabling ? 'Disabling...' : 'Disable MFA'}
                </Button>
              </div>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your account is protected with two-factor authentication. You'll need your authenticator app to log in.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Two-factor authentication adds an extra layer of security to your account by requiring a code from your authenticator app in addition to your password.
              </p>
              <Button onClick={() => setShowEnrollDialog(true)}>
                Enable Two-Factor Authentication
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <MFAEnrollmentDialog
        open={showEnrollDialog}
        onOpenChange={setShowEnrollDialog}
        onSuccess={() => {
          // Refresh status
          window.location.reload();
        }}
      />
    </>
  );
}
