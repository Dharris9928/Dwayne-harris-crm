import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useUserRole() {
  return useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { role: null, hasElevatedAccess: false };

      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return { role: null, hasElevatedAccess: false };
      }

      const hasElevatedAccess = roleData?.role === 'admin' || roleData?.role === 'sales_manager';
      
      return {
        role: roleData?.role || null,
        hasElevatedAccess
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
