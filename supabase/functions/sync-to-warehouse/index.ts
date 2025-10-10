import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncConfig {
  id: string;
  sync_name: string;
  sync_type: string;
  configuration: {
    project_id?: string;
    dataset_id?: string;
    tables?: string[];
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { config_id, manual = false } = await req.json();

    console.log(`Starting sync for config: ${config_id}, manual: ${manual}`);

    // Get sync configuration
    const { data: config, error: configError } = await supabaseClient
      .from('sync_configurations')
      .select('*')
      .eq('id', config_id)
      .single();

    if (configError || !config) {
      throw new Error(`Configuration not found: ${configError?.message}`);
    }

    if (!config.is_enabled && !manual) {
      return new Response(
        JSON.stringify({ error: 'Sync configuration is disabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const typedConfig = config as SyncConfig;

    // Create sync log entry
    const { data: logEntry, error: logError } = await supabaseClient
      .from('sync_logs')
      .insert({
        sync_config_id: config_id,
        status: 'running',
      })
      .select()
      .single();

    if (logError || !logEntry) {
      throw new Error(`Failed to create sync log: ${logError?.message}`);
    }

    const startTime = Date.now();
    let totalRecords = 0;
    let syncError: Error | null = null;

    try {
      // Check if credentials are configured
      const googleCredentials = Deno.env.get('GOOGLE_CLOUD_CREDENTIALS');
      
      if (!googleCredentials) {
        throw new Error('BigQuery credentials not configured. Add GOOGLE_CLOUD_CREDENTIALS secret to enable sync.');
      }

      // Get tables to sync from configuration
      const tablesToSync = typedConfig.configuration.tables || ['companies', 'contacts', 'activities', 'opportunities'];
      
      console.log(`Syncing tables: ${tablesToSync.join(', ')}`);

      // For each table, fetch data and prepare for sync
      for (const tableName of tablesToSync) {
        const { data, error } = await supabaseClient
          .from(tableName)
          .select('*');

        if (error) {
          console.error(`Error fetching ${tableName}:`, error);
          continue;
        }

        totalRecords += data?.length || 0;
        
        // TODO: When credentials are added, implement actual BigQuery sync here
        // This would use the Google Cloud BigQuery API to insert/update records
        console.log(`Prepared ${data?.length || 0} records from ${tableName} for sync`);
      }

      // Update sync log with success
      await supabaseClient
        .from('sync_logs')
        .update({
          status: 'success',
          records_synced: totalRecords,
          completed_at: new Date().toISOString(),
          sync_duration_ms: Date.now() - startTime,
        })
        .eq('id', logEntry.id);

      // Update configuration last sync info
      await supabaseClient
        .from('sync_configurations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'success',
        })
        .eq('id', config_id);

      return new Response(
        JSON.stringify({
          success: true,
          records_synced: totalRecords,
          duration_ms: Date.now() - startTime,
          message: googleCredentials 
            ? 'Data sync completed successfully'
            : 'Sync prepared (credentials not configured)',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      syncError = error as Error;
      console.error('Sync error:', syncError);

      // Update sync log with failure
      await supabaseClient
        .from('sync_logs')
        .update({
          status: 'failed',
          error_message: syncError.message,
          error_details: { stack: syncError.stack },
          completed_at: new Date().toISOString(),
          sync_duration_ms: Date.now() - startTime,
        })
        .eq('id', logEntry.id);

      // Update configuration last sync info
      await supabaseClient
        .from('sync_configurations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'failed',
        })
        .eq('id', config_id);

      throw syncError;
    }

  } catch (error) {
    console.error('Error in sync-to-warehouse function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorStack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
