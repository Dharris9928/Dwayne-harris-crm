import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { enrichmentLogId } = await req.json();

    if (!enrichmentLogId) {
      return new Response(
        JSON.stringify({ error: 'enrichmentLogId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the enrichment log
    const { data: log, error: logError } = await supabase
      .from('enrichment_logs')
      .select('*')
      .eq('id', enrichmentLogId)
      .single();

    if (logError || !log) {
      return new Response(
        JSON.stringify({ error: 'Enrichment log not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check company access
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', log.company_id)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: 'Company not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Force-applying enrichment from log ${enrichmentLogId} to company ${log.company_id}`);

    // Extract the fields and values from the log
    const fieldsEnriched = log.fields_enriched || {};
    
    // If fields_enriched is an array (old format), we can't force-apply
    if (Array.isArray(fieldsEnriched)) {
      return new Response(
        JSON.stringify({ error: 'This enrichment log does not contain field values. Please run a new enrichment.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize and prepare updates
    const sanitize = (obj: Record<string, any>) => {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === undefined || v === null) continue;
        if (typeof v === 'string') {
          out[k] = v.trim();
        } else {
          out[k] = v;
        }
      }
      return out;
    };

    let updates = sanitize(fieldsEnriched);

    if (Object.keys(updates).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid fields to apply' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Attempting to force-apply ${Object.keys(updates).length} fields:`, Object.keys(updates));

    // Attempt update with graceful degradation for constraint failures
    const tryUpdate = async () => {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', log.company_id)
        .select('*')
        .single();
      return { data, error };
    };

    let { data: updatedCompany, error: updateError } = await tryUpdate();
    let failedFields: string[] = [];

    // Handle constraint failures by removing problematic fields and retrying
    if (updateError) {
      console.error('Initial update failed:', updateError);
      const msg = (updateError as any).message || '';
      
      // Handle specific constraint failures
      if (msg.includes('companies_social_media_presence_check') && 'social_media_presence' in updates) {
        console.log('Removing social_media_presence due to constraint violation');
        failedFields.push('social_media_presence');
        delete updates.social_media_presence;
        const retry = await tryUpdate();
        updatedCompany = retry.data;
        updateError = retry.error as any;
      }
      
      if (updateError && msg.includes('companies_technology_adoption_level_check') && 'technology_adoption_level' in updates) {
        console.log('Removing technology_adoption_level due to constraint violation');
        failedFields.push('technology_adoption_level');
        delete updates.technology_adoption_level;
        const retry = await tryUpdate();
        updatedCompany = retry.data;
        updateError = retry.error as any;
      }
    }

    if (updateError) {
      console.error('Force-apply update failed:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to apply enrichment', 
          details: (updateError as any).message || 'Unknown error',
          failedFields
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appliedFields = Object.keys(updates).filter(f => !failedFields.includes(f));
    console.log(`Successfully applied ${appliedFields.length} fields:`, appliedFields);

    // Log the manual re-application
    await supabase.from('enrichment_logs').insert({
      company_id: log.company_id,
      provider: log.provider + '_manual',
      enrichment_type: 'manual_reapply',
      status: 'success',
      confidence_score: log.confidence_score,
      fields_enriched: updates,
      created_by: user.id
    });

    return new Response(
      JSON.stringify({
        success: true,
        appliedFields,
        failedFields,
        message: `Successfully applied ${appliedFields.length} field(s)${failedFields.length > 0 ? `, ${failedFields.length} field(s) skipped due to constraints` : ''}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Force-apply enrichment error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
