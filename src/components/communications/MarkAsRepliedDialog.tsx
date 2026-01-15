import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Calendar, Plus, Handshake } from "lucide-react";
import { UnifiedAssignmentSelect } from "@/components/companies/UnifiedAssignmentSelect";

interface MarkAsRepliedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communication: {
    id: string;
    company_id: string;
    contact_id?: string;
    subject?: string;
    companies?: { company_name: string };
    contacts?: { first_name: string; last_name: string };
  };
  onSuccess: () => void;
}

export function MarkAsRepliedDialog({
  open,
  onOpenChange,
  communication,
  onSuccess,
}: MarkAsRepliedDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyNotes, setReplyNotes] = useState("");
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [createHandoff, setCreateHandoff] = useState(false);
  const [handoffAssignee, setHandoffAssignee] = useState("");
  const [handoffNotes, setHandoffNotes] = useState("");
  const [followUpData, setFollowUpData] = useState({
    activity_type: "Meeting",
    subject_line: "",
    scheduled_date: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Parse handoff assignee ID
      let actualAssigneeId = handoffAssignee;
      if (handoffAssignee.startsWith('user:')) {
        actualAssigneeId = handoffAssignee.replace('user:', '');
      } else if (handoffAssignee.startsWith('salesrep:')) {
        actualAssigneeId = handoffAssignee.replace('salesrep:', '');
      }

      // Update communication as replied (and optionally assign handoff)
      const updateData: any = {
        email_responded_at: new Date().toISOString(),
        email_opened_at: new Date().toISOString(),
        notes: replyNotes 
          ? `${communication.subject ? 'Reply received: ' : ''}${replyContent}\n\nNotes: ${replyNotes}`
          : `Reply received: ${replyContent}`,
      };

      // Add handoff assignment if requested
      if (createHandoff && actualAssigneeId && actualAssigneeId !== 'unassigned') {
        updateData.assigned_to = actualAssigneeId;
        if (handoffNotes) {
          updateData.notes = `${updateData.notes}\n\nHandoff Notes: ${handoffNotes}`;
        }
      }

      const { error: commError } = await supabase
        .from("company_communications")
        .update(updateData)
        .eq("id", communication.id);

      if (commError) throw commError;

      // Handle handoff: update/create opportunity and send notification
      if (createHandoff && actualAssigneeId && actualAssigneeId !== 'unassigned') {
        // Check for existing opportunity
        const { data: existingOpportunity } = await supabase
          .from('opportunities')
          .select('id')
          .eq('company_id', communication.company_id)
          .single();

        if (existingOpportunity) {
          await supabase
            .from('opportunities')
            .update({ assigned_to: actualAssigneeId })
            .eq('id', existingOpportunity.id);
        }

        // Send notification to assignee
        await supabase
          .from('notifications')
          .insert({
            user_id: actualAssigneeId,
            title: 'New Communication Handoff',
            message: `You've been assigned a communication for ${communication.companies?.company_name || 'a company'}${communication.subject ? `: ${communication.subject}` : ''}`,
            type: 'handoff',
            link: '/communications',
            read: false,
          });
      }

      // Create follow-up activity if requested
      if (createFollowUp && followUpData.scheduled_date) {
        const { error: activityError } = await supabase
          .from("outreach_activities")
          .insert({
            company_id: communication.company_id,
            activity_type: followUpData.activity_type as any,
            subject_line: followUpData.subject_line || `Follow-up: ${communication.subject || 'Email reply'}`,
            message_content: `Follow-up from email reply:\n${replyContent}`,
            outcome: "Scheduled",
            scheduled_date: followUpData.scheduled_date,
            notes: followUpData.notes,
            created_by: userData.user.id,
          });

        if (activityError) throw activityError;
      }

      // Build success message
      const actions = [];
      if (createFollowUp) actions.push("follow-up scheduled");
      if (createHandoff) actions.push("handed off");
      
      toast({
        title: "Success",
        description: actions.length > 0 
          ? `Email marked as replied, ${actions.join(" and ")}`
          : "Email marked as replied",
      });

      // Reset form
      setReplyContent("");
      setReplyNotes("");
      setCreateFollowUp(false);
      setCreateHandoff(false);
      setHandoffAssignee("");
      setHandoffNotes("");
      setFollowUpData({
        activity_type: "Meeting",
        subject_line: "",
        scheduled_date: "",
        notes: "",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Log Email Reply
          </DialogTitle>
          <DialogDescription>
            Record the recipient's response and optionally schedule a follow-up activity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Communication context */}
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p><strong>Company:</strong> {communication.companies?.company_name || "Unknown"}</p>
            {communication.contacts && (
              <p><strong>Contact:</strong> {communication.contacts.first_name} {communication.contacts.last_name}</p>
            )}
            {communication.subject && (
              <p><strong>Subject:</strong> {communication.subject}</p>
            )}
          </div>

          {/* Recipient's Reply */}
          <div>
            <Label htmlFor="replyContent" className="text-base font-medium">
              Recipient's Reply *
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Summarize or paste the content of their response
            </p>
            <Textarea
              id="replyContent"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Enter what the recipient replied..."
              rows={4}
              required
            />
          </div>

          {/* Additional Notes */}
          <div>
            <Label htmlFor="replyNotes">Your Notes (Optional)</Label>
            <Textarea
              id="replyNotes"
              value={replyNotes}
              onChange={(e) => setReplyNotes(e.target.value)}
              placeholder="Any internal notes about this reply..."
              rows={2}
            />
          </div>

          {/* Handoff Toggle */}
          <div className="flex items-center space-x-2 p-3 border rounded-lg bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
            <Checkbox
              id="createHandoff"
              checked={createHandoff}
              onCheckedChange={(checked) => setCreateHandoff(checked === true)}
            />
            <div className="flex-1">
              <Label htmlFor="createHandoff" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Handshake className="h-4 w-4" />
                Hand Off to Team Member
              </Label>
              <p className="text-xs text-muted-foreground">
                Assign this lead to someone for follow-up
              </p>
            </div>
          </div>

          {/* Handoff Form */}
          {createHandoff && (
            <div className="space-y-3 p-4 border rounded-lg bg-purple-50/50 dark:bg-purple-950/10">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                <Handshake className="h-4 w-4" />
                Handoff Details
              </div>

              <div>
                <Label>Assign To *</Label>
                <UnifiedAssignmentSelect
                  value={handoffAssignee}
                  onValueChange={setHandoffAssignee}
                  placeholder="Select team member..."
                />
              </div>

              <div>
                <Label htmlFor="handoffNotes">Handoff Notes (Optional)</Label>
                <Textarea
                  id="handoffNotes"
                  value={handoffNotes}
                  onChange={(e) => setHandoffNotes(e.target.value)}
                  placeholder="Add any context for the assignee..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Follow-up Activity Toggle */}
          <div className="flex items-center space-x-2 p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <Checkbox
              id="createFollowUp"
              checked={createFollowUp}
              onCheckedChange={(checked) => setCreateFollowUp(checked === true)}
            />
            <div className="flex-1">
              <Label htmlFor="createFollowUp" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Schedule a Follow-up Activity
              </Label>
              <p className="text-xs text-muted-foreground">
                Create a new activity based on this reply
              </p>
            </div>
          </div>

          {/* Follow-up Activity Form */}
          {createFollowUp && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                <Calendar className="h-4 w-4" />
                Follow-up Activity Details
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="followUpType">Activity Type</Label>
                  <Select
                    value={followUpData.activity_type}
                    onValueChange={(value) =>
                      setFollowUpData((prev) => ({ ...prev, activity_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Meeting">Meeting</SelectItem>
                      <SelectItem value="Demo">Demo</SelectItem>
                      <SelectItem value="Phone">Phone Call</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="scheduledDate">Scheduled Date *</Label>
                  <Input
                    id="scheduledDate"
                    type="datetime-local"
                    value={followUpData.scheduled_date}
                    onChange={(e) =>
                      setFollowUpData((prev) => ({ ...prev, scheduled_date: e.target.value }))
                    }
                    required={createFollowUp}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="followUpSubject">Subject/Title</Label>
                <Input
                  id="followUpSubject"
                  value={followUpData.subject_line}
                  onChange={(e) =>
                    setFollowUpData((prev) => ({ ...prev, subject_line: e.target.value }))
                  }
                  placeholder={`Follow-up: ${communication.subject || 'Email reply'}`}
                />
              </div>

              <div>
                <Label htmlFor="followUpNotes">Activity Notes</Label>
                <Textarea
                  id="followUpNotes"
                  value={followUpData.notes}
                  onChange={(e) =>
                    setFollowUpData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Notes for the follow-up activity..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !replyContent.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Saving..." : "Mark as Replied"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}