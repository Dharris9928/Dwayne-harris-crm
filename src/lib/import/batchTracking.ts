import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a unique batch ID for an import session
 */
export function generateBatchId(): string {
  return crypto.randomUUID();
}

/**
 * Create an import log entry at the start of an import
 */
export async function createImportLog(params: {
  batchId: string;
  fileName: string;
  tableName: string;
  affectedTables: string[];
  fileFormat?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const { error } = await supabase
    .from('import_export_logs')
    .insert({
      batch_id: params.batchId,
      file_name: params.fileName,
      table_name: params.tableName,
      affected_tables: params.affectedTables,
      file_format: params.fileFormat || 'CSV',
      activity_type: 'IMPORT',
      user_id: user.id,
      record_count: 0,
      successful_count: 0,
      failed_count: 0,
      duplicate_count: 0,
      rollback_available: true,
    });

  if (error) {
    console.error('Failed to create import log:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update an import log entry with final statistics
 */
export async function updateImportLog(params: {
  batchId: string;
  recordCount: number;
  successfulCount: number;
  failedCount: number;
  duplicateCount: number;
  errorDetails?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('import_export_logs')
    .update({
      record_count: params.recordCount,
      successful_count: params.successfulCount,
      failed_count: params.failedCount,
      duplicate_count: params.duplicateCount,
      error_details: params.errorDetails,
    })
    .eq('batch_id', params.batchId);

  if (error) {
    console.error('Failed to update import log:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Mark an import log as not rollback-able (e.g., after manual edits)
 */
export async function disableRollback(batchId: string): Promise<void> {
  await supabase
    .from('import_export_logs')
    .update({ rollback_available: false })
    .eq('batch_id', batchId);
}
