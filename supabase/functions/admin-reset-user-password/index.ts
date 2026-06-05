import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdmin } from "../_shared/authorization.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access and get authenticated user
    const { supabase } = await requireAdmin(req);

    // Get the user ID from the request
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating temporary password for user:', userId);

    // Generate a random temporary password (12 characters with uppercase, lowercase, numbers, and special chars)
    const generateTempPassword = () => {
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const numbers = '0123456789';
      const special = '!@#$%^&*';
      const allChars = uppercase + lowercase + numbers + special;
      
      let tempPassword = '';
      // Ensure at least one of each required character type
      tempPassword += uppercase[Math.floor(Math.random() * uppercase.length)];
      tempPassword += lowercase[Math.floor(Math.random() * lowercase.length)];
      tempPassword += numbers[Math.floor(Math.random() * numbers.length)];
      tempPassword += special[Math.floor(Math.random() * special.length)];
      
      // Fill the rest randomly
      for (let i = 4; i < 12; i++) {
        tempPassword += allChars[Math.floor(Math.random() * allChars.length)];
      }
      
      // Shuffle the password
      return tempPassword.split('').sort(() => Math.random() - 0.5).join('');
    };

    const tempPassword = generateTempPassword();

    // Reset the user's password to the temporary password using admin API
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: tempPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Temporary password set for user:', userId);

    // Send password reset notification with temporary password
    try {
      await supabase.functions.invoke('send-password-reset-notification', {
        body: {
          userId,
          resetByAdmin: true,
          tempPassword
        }
      });
    } catch (notifError) {
      console.error('Error sending password reset notification:', notifError);
      // Don't fail the reset if notification fails
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Temporary password generated and sent to user',
        user: updateData.user
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});