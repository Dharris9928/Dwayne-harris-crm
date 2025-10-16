import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface NotificationPreferences {
  id: string;
  task_assignments: boolean;
  approval_requests: boolean;
  communication_view_requests: boolean;
  user_signup_requests: boolean;
  access_invitations: boolean;
  system_alerts: boolean;
  access_decisions: boolean;
  access_expiring_soon: boolean;
  delivery_method: string;
}

export function NotificationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notification preferences
  const { data: preferences, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase as any)
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If no preferences exist, create defaults
      if (!data) {
        const { data: newPrefs, error: insertError } = await (supabase as any)
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        return newPrefs as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
  });

  // Update preferences mutation
  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await (supabase as any)
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notification preferences.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (field: keyof NotificationPreferences, value: boolean) => {
    updatePreferences.mutate({ [field]: value });
  };

  const handleDeliveryMethodChange = (value: string) => {
    updatePreferences.mutate({ delivery_method: value });
  };

  if (isLoading || !preferences) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading preferences...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose which notifications you want to receive and how you want to receive them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Delivery Method */}
          <div className="space-y-2">
            <Label htmlFor="delivery-method">Delivery Method</Label>
            <Select
              value={preferences.delivery_method}
              onValueChange={handleDeliveryMethodChange}
            >
              <SelectTrigger id="delivery-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Email + In-App</SelectItem>
                <SelectItem value="email_only">Email Only</SelectItem>
                <SelectItem value="internal_only">In-App Only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose how you want to receive notifications
            </p>
          </div>

          <Separator />

          {/* Notification Types */}
          <div className="space-y-4">
            <h3 className="font-medium">Notification Types</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="task-assignments">Task Assignments</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when tasks are assigned to you
                </p>
              </div>
              <Switch
                id="task-assignments"
                checked={preferences.task_assignments}
                onCheckedChange={(value) => handleToggle('task_assignments', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="approval-requests">Approval Requests</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about pending approval requests (Admin/Manager only)
                </p>
              </div>
              <Switch
                id="approval-requests"
                checked={preferences.approval_requests}
                onCheckedChange={(value) => handleToggle('approval_requests', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="comm-view-requests">Communication View Requests</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about requests to view communications (Admin/Manager only)
                </p>
              </div>
              <Switch
                id="comm-view-requests"
                checked={preferences.communication_view_requests}
                onCheckedChange={(value) => handleToggle('communication_view_requests', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="user-signup">User Signup Requests</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about new user signups requiring approval (Admin only)
                </p>
              </div>
              <Switch
                id="user-signup"
                checked={preferences.user_signup_requests}
                onCheckedChange={(value) => handleToggle('user_signup_requests', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="access-invitations">Access Invitations</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when you're granted access to records
                </p>
              </div>
              <Switch
                id="access-invitations"
                checked={preferences.access_invitations}
                onCheckedChange={(value) => handleToggle('access_invitations', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="system-alerts">System Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about important system announcements
                </p>
              </div>
              <Switch
                id="system-alerts"
                checked={preferences.system_alerts}
                onCheckedChange={(value) => handleToggle('system_alerts', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="access-decisions">Access Decisions</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about decisions on your access requests
                </p>
              </div>
              <Switch
                id="access-decisions"
                checked={preferences.access_decisions}
                onCheckedChange={(value) => handleToggle('access_decisions', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="access-expiring">Access Expiring Soon</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when your access to records is about to expire (7 days before)
                </p>
              </div>
              <Switch
                id="access-expiring"
                checked={preferences.access_expiring_soon}
                onCheckedChange={(value) => handleToggle('access_expiring_soon', value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
