import { supabase } from "@/integrations/supabase/client";

export interface RollbackResult {
  success: boolean;
  deletedCounts: {
    companies: number;
    contacts: number;
    communications: number;
    apolloActivities: number;
  };
  restoredCount: number;
  error?: string;
}

/**
 * Rollback an import by deleting created records and restoring updated records
 */
export async function rollbackImport(batchId: string): Promise<RollbackResult> {
  const result: RollbackResult = {
    success: false,
    deletedCounts: {
      companies: 0,
      contacts: 0,
      communications: 0,
      apolloActivities: 0,
    },
    restoredCount: 0,
  };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { ...result, error: 'User not authenticated' };
    }

    // Verify the import log exists and is rollback-able
    const { data: importLog, error: logError } = await supabase
      .from('import_export_logs')
      .select('*')
      .eq('batch_id', batchId)
      .single();

    if (logError || !importLog) {
      return { ...result, error: 'Import log not found' };
    }

    if (!importLog.rollback_available) {
      return { ...result, error: 'Rollback is not available for this import' };
    }

    if (importLog.rolled_back_at) {
      return { ...result, error: 'This import has already been rolled back' };
    }

    // Check if import is within 30-day rollback window
    const importDate = new Date(importLog.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (importDate < thirtyDaysAgo) {
      return { ...result, error: 'Rollback is only available for imports within the last 30 days' };
    }

    // Step 1: Restore updated records (engagement data) from previous_engagement_values
    const { data: updatedActivities } = await supabase
      .from('apollo_email_activities')
      .select('id, previous_engagement_values')
      .eq('import_batch_id', batchId)
      .not('previous_engagement_values', 'is', null);

    if (updatedActivities && updatedActivities.length > 0) {
      for (const activity of updatedActivities) {
        if (activity.previous_engagement_values) {
          const prevValues = activity.previous_engagement_values as Record<string, string | number | null>;
          await supabase
            .from('apollo_email_activities')
            .update({
              opened_at: (prevValues.opened_at as string) || null,
              clicked_at: (prevValues.clicked_at as string) || null,
              replied_at: (prevValues.replied_at as string) || null,
              open_count: (prevValues.open_count as number) || null,
              click_count: (prevValues.click_count as number) || null,
              reply_count: (prevValues.reply_count as number) || null,
              status: (prevValues.status as string) || null,
              previous_engagement_values: null,
              import_batch_id: null,
            })
            .eq('id', activity.id);
          result.restoredCount++;
        }
      }
    }

    // Step 2: Delete created records in reverse dependency order
    // Delete apollo_email_activities first (no previous values = created records)
    const { data: deletedActivities } = await supabase
      .from('apollo_email_activities')
      .delete()
      .eq('import_batch_id', batchId)
      .is('previous_engagement_values', null)
      .select('id');
    
    result.deletedCounts.apolloActivities = deletedActivities?.length || 0;

    // Delete company_communications
    const { data: deletedComms } = await supabase
      .from('company_communications')
      .delete()
      .eq('import_batch_id', batchId)
      .select('id');
    
    result.deletedCounts.communications = deletedComms?.length || 0;

    // Delete contacts
    const { data: deletedContacts } = await supabase
      .from('contacts')
      .delete()
      .eq('import_batch_id', batchId)
      .select('id');
    
    result.deletedCounts.contacts = deletedContacts?.length || 0;

    // Delete companies (last, due to dependencies)
    const { data: deletedCompanies } = await supabase
      .from('companies')
      .delete()
      .eq('import_batch_id', batchId)
      .select('id');
    
    result.deletedCounts.companies = deletedCompanies?.length || 0;

    // Step 3: Mark the import log as rolled back
    await supabase
      .from('import_export_logs')
      .update({
        rolled_back_at: new Date().toISOString(),
        rolled_back_by: user.id,
        rollback_available: false,
      })
      .eq('batch_id', batchId);

    result.success = true;
    return result;

  } catch (error) {
    console.error('Rollback failed:', error);
    return { ...result, error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Get rollback statistics preview (without actually rolling back)
 */
export async function getRollbackPreview(batchId: string): Promise<{
  companiesCount: number;
  contactsCount: number;
  communicationsCount: number;
  activitiesCount: number;
  restorableCount: number;
}> {
  const [companies, contacts, communications, activities, restorable] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('import_batch_id', batchId),
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('import_batch_id', batchId),
    supabase.from('company_communications').select('id', { count: 'exact', head: true }).eq('import_batch_id', batchId),
    supabase.from('apollo_email_activities').select('id', { count: 'exact', head: true }).eq('import_batch_id', batchId).is('previous_engagement_values', null),
    supabase.from('apollo_email_activities').select('id', { count: 'exact', head: true }).eq('import_batch_id', batchId).not('previous_engagement_values', 'is', null),
  ]);

  return {
    companiesCount: companies.count || 0,
    contactsCount: contacts.count || 0,
    communicationsCount: communications.count || 0,
    activitiesCount: activities.count || 0,
    restorableCount: restorable.count || 0,
  };
}
