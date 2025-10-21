import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface EditCommunicationDialogProps {
  communication: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditCommunicationDialog({ 
  communication, 
  open, 
  onOpenChange,
  onSuccess 
}: EditCommunicationDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    notes: '',
  });

  useEffect(() => {
    if (communication && open) {
      setFormData({
        subject: communication.subject || '',
        content: communication.content || '',
        notes: communication.notes || '',
      });
    }
  }, [communication, open]);

  const handleSave = async () => {
    if (!communication?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_communications')
        .update({
          subject: formData.subject || null,
          content: formData.content,
          notes: formData.notes || null,
        })
        .eq('id', communication.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Communication updated successfully',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating communication:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update communication',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!communication) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Communication</DialogTitle>
          <DialogDescription>
            Update the details of this communication
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Subject Line */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Subject line"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Communication content"
              rows={10}
              className="resize-none font-mono text-sm"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes"
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.content.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
