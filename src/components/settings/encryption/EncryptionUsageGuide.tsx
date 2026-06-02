import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Code, Info } from "lucide-react";

export function EncryptionUsageGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Using Encrypted Contact Data
        </CardTitle>
        <CardDescription>
          How to query encrypted contact information in your application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            The encryption system provides a transparent decryption view called <code>contacts_decrypted</code>. 
            Use this view instead of the <code>contacts</code> table for automatic decryption.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg space-y-2">
            <h3 className="font-semibold text-sm">Current Implementation</h3>
            <p className="text-sm text-muted-foreground">
              All existing contact queries currently use the <code>contacts</code> table directly. 
              Once encryption is enabled, the system will:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
              <li>Store encrypted data in <code>email_encrypted</code>, <code>phone_encrypted</code>, <code>mobile_encrypted</code></li>
              <li>Keep original columns for backward compatibility during migration</li>
              <li>Provide transparent decryption via the <code>contacts_decrypted</code> view</li>
            </ul>
          </div>

          <div className="p-4 border rounded-lg space-y-3">
            <h3 className="font-semibold text-sm">Migration Strategy</h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-1">Phase 1: Encryption (Current)</h4>
                <code className="block p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                  {`// Existing queries continue to work
const { data } = await supabase
  .from('contacts')
  .select('*');

// Returns: email, phone, mobile from original columns`}
                </code>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Phase 2: Switch to Decrypted View (Future)</h4>
                <code className="block p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                  {`// After migration, use contacts_decrypted view
const { data } = await supabase
  .from('contacts_decrypted')
  .select('*');

// Returns: Automatically decrypted email, phone, mobile`}
                </code>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Inserting New Contacts</h4>
                <code className="block p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                  {`// New contacts are automatically encrypted
const { data } = await supabase
  .from('contacts')
  .insert({
    email: 'user@example.com',
    phone: '+1234567890',
    // ... other fields
  });

// System automatically:
// 1. Encrypts email → email_encrypted
// 2. Encrypts phone → phone_encrypted
// 3. Sets encryption_version`}
                </code>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg space-y-2">
            <h3 className="font-semibold text-sm">Security Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Row-Level Security:</strong> Encryption view inherits RLS policies from contacts table</li>
              <li><strong>Transparent Decryption:</strong> No application code changes needed during transition</li>
              <li><strong>Backward Compatible:</strong> Original columns preserved during migration</li>
              <li><strong>Audit Trail:</strong> All encryption operations logged in encryption_audit_log</li>
            </ul>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Next Steps:</strong> After running the encryption migration, gradually update queries to use 
              <code className="mx-1">contacts_decrypted</code> view. The system will continue working with either approach.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}

