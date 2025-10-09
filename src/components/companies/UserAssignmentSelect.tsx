import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface UserAssignmentSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function UserAssignmentSelect({ value, onValueChange, placeholder = "Select assignee..." }: UserAssignmentSelectProps) {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          approval_status,
          user_roles!inner(role)
        `)
        .eq('approval_status', 'approved')
        .in('user_roles.role', ['sales_rep', 'sales_manager', 'admin'])
        .order('first_name');

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-card z-[100]">
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {users?.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.first_name} {user.last_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
