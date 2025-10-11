import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RateLimitRequest {
  email: string;
  ipAddress?: string;
}

interface RateLimitResponse {
  allowed: boolean;
  email_attempts: number;
  ip_attempts: number;
  max_email_attempts: number;
  max_ip_attempts: number;
  block_reason?: string;
  retry_after_seconds?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, ipAddress }: RateLimitRequest = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    console.log(`Checking rate limit for email: ${email}, IP: ${ipAddress || 'not provided'}`);

    // Call the database function to check rate limit
    const { data, error } = await supabase.rpc('check_signup_rate_limit', {
      _email: email.toLowerCase(),
      _ip_address: ipAddress || null
    });

    if (error) {
      console.error('Error checking rate limit:', error);
      throw error;
    }

    const result = data as RateLimitResponse;
    
    console.log(`Rate limit check result:`, {
      allowed: result.allowed,
      email_attempts: result.email_attempts,
      ip_attempts: result.ip_attempts
    });

    // If blocked, log it
    if (!result.allowed) {
      console.warn(`Rate limit exceeded for ${email} - ${result.block_reason}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.allowed ? 200 : 429,
    });
  } catch (error: any) {
    console.error('Error in check-signup-rate-limit function:', error);
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Unknown error',
        allowed: true // Fail open to avoid blocking legitimate users
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
