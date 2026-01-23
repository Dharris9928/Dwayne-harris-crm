import { supabase } from '@/integrations/supabase/client';

export interface OpenedEmailRow {
  email: string;
  subject?: string;
  openedAt: string;
  apolloId?: string;
  openCount?: number;
  sentAt?: string;
}

export interface MatchedRecord {
  csvRow: OpenedEmailRow;
  dbRecord: {
    id: string;
    apollo_activity_id: string | null;
    subject: string | null;
    apollo_contact_email: string | null;
    sent_at: string | null;
    company_id: string | null;
    contact_id: string | null;
  };
  matchType: 'apollo_id' | 'email_subject' | 'email_only';
  confidence: number;
}

export interface MatchResult {
  matched: MatchedRecord[];
  unmatched: OpenedEmailRow[];
  totalCsvRows: number;
}

export interface UpdateResult {
  updated: number;
  errors: string[];
}

// Common Apollo CSV column name variations
export const APOLLO_COLUMN_MAPPINGS = {
  email: ['email', 'contact email', 'contact_email', 'email address', 'recipient email', 'to'],
  subject: ['subject', 'email subject', 'subject line', 'email_subject'],
  openedAt: ['opened at', 'opened_at', 'first opened at', 'first_opened_at', 'open date', 'opened date'],
  openCount: ['open count', 'open_count', 'total opens', 'opens', 'times opened'],
  apolloId: ['message id', 'message_id', 'email id', 'email_id', 'activity id', 'activity_id', 'id'],
  sentAt: ['sent at', 'sent_at', 'sent date', 'date sent', 'sent'],
  opened: ['opened', 'is opened', 'was opened', 'open status'],
};

/**
 * Auto-detect column mappings from CSV headers
 */
export function autoDetectColumns(headers: string[]): Record<string, string | null> {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  const result: Record<string, string | null> = {
    email: null,
    subject: null,
    openedAt: null,
    openCount: null,
    apolloId: null,
    sentAt: null,
  };

  for (const [field, variations] of Object.entries(APOLLO_COLUMN_MAPPINGS)) {
    if (field === 'opened') continue; // Skip the boolean field
    for (const variation of variations) {
      const index = lowerHeaders.indexOf(variation);
      if (index !== -1) {
        result[field] = headers[index]; // Use original case
        break;
      }
    }
  }

  return result;
}

/**
 * Parse CSV rows into OpenedEmailRow objects
 */
export function parseOpenedEmails(
  rows: Record<string, string>[],
  columnMapping: Record<string, string | null>
): OpenedEmailRow[] {
  const results: OpenedEmailRow[] = [];

  for (const row of rows) {
    const email = columnMapping.email ? row[columnMapping.email]?.trim() : null;
    if (!email) continue;

    // Check if this row represents an opened email
    // Look for an "opened" column or an "opened at" timestamp
    const openedAtValue = columnMapping.openedAt ? row[columnMapping.openedAt]?.trim() : null;
    
    // Skip if no opened timestamp (means email wasn't opened)
    if (!openedAtValue) continue;

    results.push({
      email,
      subject: columnMapping.subject ? row[columnMapping.subject]?.trim() : undefined,
      openedAt: openedAtValue,
      apolloId: columnMapping.apolloId ? row[columnMapping.apolloId]?.trim() : undefined,
      openCount: columnMapping.openCount ? parseInt(row[columnMapping.openCount], 10) || 1 : 1,
      sentAt: columnMapping.sentAt ? row[columnMapping.sentAt]?.trim() : undefined,
    });
  }

  return results;
}

/**
 * Match CSV rows against apollo_email_activities in the database
 */
export async function matchOpenedEmails(
  parsedRows: OpenedEmailRow[]
): Promise<MatchResult> {
  const matched: MatchedRecord[] = [];
  const unmatched: OpenedEmailRow[] = [];

  // Fetch all apollo_email_activities records
  const { data: dbRecords, error } = await supabase
    .from('apollo_email_activities')
    .select('id, apollo_activity_id, subject, apollo_contact_email, sent_at, company_id, contact_id');

  if (error) {
    console.error('Error fetching apollo_email_activities:', error);
    throw new Error('Failed to fetch email activities from database');
  }

  if (!dbRecords || dbRecords.length === 0) {
    return {
      matched: [],
      unmatched: parsedRows,
      totalCsvRows: parsedRows.length,
    };
  }

  // Create lookup maps for efficient matching
  const byApolloId = new Map<string, typeof dbRecords[0]>();
  const byEmailSubject = new Map<string, typeof dbRecords[0][]>();
  const byEmailOnly = new Map<string, typeof dbRecords[0][]>();

  for (const record of dbRecords) {
    if (record.apollo_activity_id) {
      byApolloId.set(record.apollo_activity_id.toLowerCase(), record);
    }

    if (record.apollo_contact_email) {
      const email = record.apollo_contact_email.toLowerCase();
      
      // Email + Subject map
      if (record.subject) {
        const key = `${email}|${record.subject.toLowerCase()}`;
        if (!byEmailSubject.has(key)) {
          byEmailSubject.set(key, []);
        }
        byEmailSubject.get(key)!.push(record);
      }

      // Email only map
      if (!byEmailOnly.has(email)) {
        byEmailOnly.set(email, []);
      }
      byEmailOnly.get(email)!.push(record);
    }
  }

  // Match each CSV row
  for (const csvRow of parsedRows) {
    let matchedRecord: MatchedRecord | null = null;

    // Priority 1: Match by Apollo ID
    if (csvRow.apolloId) {
      const dbRecord = byApolloId.get(csvRow.apolloId.toLowerCase());
      if (dbRecord) {
        matchedRecord = {
          csvRow,
          dbRecord,
          matchType: 'apollo_id',
          confidence: 100,
        };
      }
    }

    // Priority 2: Match by Email + Subject
    if (!matchedRecord && csvRow.email && csvRow.subject) {
      const key = `${csvRow.email.toLowerCase()}|${csvRow.subject.toLowerCase()}`;
      const candidates = byEmailSubject.get(key);
      if (candidates && candidates.length > 0) {
        // Take the first match (could add date matching for better precision)
        matchedRecord = {
          csvRow,
          dbRecord: candidates[0],
          matchType: 'email_subject',
          confidence: 85,
        };
      }
    }

    // Priority 3: Match by Email only (least precise)
    if (!matchedRecord && csvRow.email) {
      const candidates = byEmailOnly.get(csvRow.email.toLowerCase());
      if (candidates && candidates.length === 1) {
        // Only match if there's exactly one email to that contact
        matchedRecord = {
          csvRow,
          dbRecord: candidates[0],
          matchType: 'email_only',
          confidence: 60,
        };
      }
    }

    if (matchedRecord) {
      matched.push(matchedRecord);
    } else {
      unmatched.push(csvRow);
    }
  }

  return {
    matched,
    unmatched,
    totalCsvRows: parsedRows.length,
  };
}

/**
 * Update matched records with opened data
 */
export async function updateOpenedEmails(
  matchedRecords: MatchedRecord[]
): Promise<UpdateResult> {
  const errors: string[] = [];
  let updated = 0;

  // Get current user for logging
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  // Batch update apollo_email_activities
  for (const match of matchedRecords) {
    try {
      // Parse the opened timestamp
      const openedAt = parseTimestamp(match.csvRow.openedAt);
      if (!openedAt) {
        errors.push(`Invalid timestamp for email to ${match.csvRow.email}: ${match.csvRow.openedAt}`);
        continue;
      }

      // Update apollo_email_activities
      const { error: updateError } = await supabase
        .from('apollo_email_activities')
        .update({
          opened_at: openedAt.toISOString(),
          open_count: Math.max(match.csvRow.openCount || 1, 1),
          status: 'opened',
          updated_at: new Date().toISOString(),
        })
        .eq('id', match.dbRecord.id);

      if (updateError) {
        errors.push(`Failed to update activity ${match.dbRecord.id}: ${updateError.message}`);
        continue;
      }

      // Also update company_communications if linked
      if (match.dbRecord.company_id && match.dbRecord.contact_id) {
        const { error: commError } = await supabase
          .from('company_communications')
          .update({
            email_opened_at: openedAt.toISOString(),
          })
          .eq('company_id', match.dbRecord.company_id)
          .eq('contact_id', match.dbRecord.contact_id)
          .ilike('subject', match.dbRecord.subject || '')
          .is('email_opened_at', null); // Only update if not already set
        
        if (commError) {
          console.warn(`Could not update company_communications: ${commError.message}`);
          // Don't count as error since main update succeeded
        }
      }

      updated++;
    } catch (err: any) {
      errors.push(`Error processing ${match.csvRow.email}: ${err.message}`);
    }
  }

  // Log the import activity
  if (userId && updated > 0) {
    try {
      await supabase.from('import_export_logs').insert({
        user_id: userId,
        activity_type: 'import',
        table_name: 'apollo_email_activities',
        record_count: matchedRecords.length,
        successful_count: updated,
        failed_count: errors.length,
        file_format: 'csv',
        error_summary: errors.length > 0 ? `${errors.length} records failed` : null,
        detailed_errors: errors.length > 0 ? { errors: errors.slice(0, 10) } : null,
      });
    } catch (logError) {
      console.warn('Failed to log import activity:', logError);
    }
  }

  return {
    updated,
    errors,
  };
}

/**
 * Parse various timestamp formats that Apollo might export
 */
function parseTimestamp(value: string): Date | null {
  if (!value) return null;

  // Try parsing as ISO date
  let date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try common formats
  const formats = [
    // MM/DD/YYYY HH:MM:SS
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/,
    // YYYY-MM-DD HH:MM:SS
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):?(\d{2})?/,
    // DD/MM/YYYY HH:MM:SS
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/,
  ];

  for (const format of formats) {
    const match = value.match(format);
    if (match) {
      // Attempt to parse
      date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // Last resort: try Date.parse
  const parsed = Date.parse(value);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }

  return null;
}
