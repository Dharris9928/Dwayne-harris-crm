import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  user: any;
  supabase: SupabaseClient;
}

/**
 * Verifies the user's JWT token and returns the authenticated user
 */
export async function verifyUser(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  return { user, supabase };
}

/**
 * Checks if a user has a specific role
 */
export async function checkUserRole(
  supabase: SupabaseClient,
  userId: string,
  role: 'admin' | 'sales_manager' | 'sales_rep' | 'read_only'
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', role)
    .single();

  return !error && !!data;
}

/**
 * Verifies that the user has admin privileges
 * Throws an error if the user is not an admin
 */
export async function requireAdmin(req: Request): Promise<AuthResult> {
  const { user, supabase } = await verifyUser(req);
  
  const isAdmin = await checkUserRole(supabase, user.id, 'admin');
  
  if (!isAdmin) {
    throw new Error('Forbidden - Admin access required');
  }

  return { user, supabase };
}

/**
 * Verifies that the user has elevated access (admin or sales_manager)
 * Throws an error if the user doesn't have elevated access
 */
export async function requireElevatedAccess(req: Request): Promise<AuthResult> {
  const { user, supabase } = await verifyUser(req);
  
  const isAdmin = await checkUserRole(supabase, user.id, 'admin');
  const isSalesManager = await checkUserRole(supabase, user.id, 'sales_manager');
  
  if (!isAdmin && !isSalesManager) {
    throw new Error('Forbidden - Elevated access required');
  }

  return { user, supabase };
}
