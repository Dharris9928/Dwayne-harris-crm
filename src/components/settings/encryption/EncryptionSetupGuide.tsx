import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Key, AlertTriangle, Info } from "lucide-react";

export function EncryptionSetupGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Encryption Setup Guide
        </CardTitle>
        <CardDescription>
          How to configure encryption keys for maximum security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            The encryption system is currently using a fallback key generation method. 
            For production use, configure a dedicated encryption key in your Supabase settings.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Current Status</h3>
            <Badge variant="secondary">Fallback Mode Active</Badge>
            <p className="text-sm text-muted-foreground mt-2">
              System is using session-based key generation. Data is encrypted, but keys rotate per session.
            </p>
          </div>

          <div className="p-4 border rounded-lg space-y-3">
            <h3 className="font-semibold">Production Setup (Recommended)</h3>
            <ol className="text-sm space-y-2 list-decimal list-inside">
              <li>
                <strong>Generate a secure encryption key:</strong>
                <code className="block mt-1 p-2 bg-muted rounded text-xs font-mono">
                  openssl rand -hex 32
                </code>
              </li>
              <li>
                <strong>Store as Supabase secret:</strong>
                <p className="text-muted-foreground mt-1">
                  Contact your administrator to add <code>ENCRYPTION_KEY</code> as a Supabase secret
                </p>
              </li>
              <li>
                <strong>Configure database:</strong>
                <p className="text-muted-foreground mt-1">
                  Update PostgreSQL configuration to reference the secret in <code>app.encryption_key</code> setting
                </p>
              </li>
              <li>
                <strong>Verify setup:</strong>
                <p className="text-muted-foreground mt-1">
                  Run encryption migration to ensure keys are working correctly
                </p>
              </li>
            </ol>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Once data is encrypted with a production key, keep that key secure and backed up. 
              Losing the encryption key means permanent data loss.
            </AlertDescription>
          </Alert>

          <div className="p-4 border rounded-lg space-y-2">
            <h3 className="font-semibold text-sm">Security Best Practices</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Never commit encryption keys to version control</li>
              <li>Rotate encryption keys annually or after security incidents</li>
              <li>Maintain offline backups of encryption keys</li>
              <li>Use hardware security modules (HSM) for enterprise deployments</li>
              <li>Monitor encryption audit logs regularly</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
