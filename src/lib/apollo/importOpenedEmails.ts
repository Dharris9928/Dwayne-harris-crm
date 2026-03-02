import { supabase } from '@/integrations/supabase/client';

export interface OpenedEmailRow {
  email: string;
  subject?: string;
  openedAt: string;
  apolloId?: string;
  openCount?: number;
  sentAt?: string;
  clicked?: boolean;
  replied?: boolean;
  firstName?: string;
  lastName?: string;
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
    contact_first_name?: string | null;
    contact_last_name?: string | null;
  };
  matchType: 'apollo_id' | 'email_subject' | 'email_name' | 'email_only' | 'email_name_disambiguate';
  matchReason: string;
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
  email: ['to email', 'email', 'contact email', 'contact_email', 'email address', 'recipient email', 'to'],
  subject: ['subject', 'email subject', 'subject line', 'email_subject'],
  openedAt: ['opened at', 'opened_at', 'first opened at', 'first_opened_at', 'open date', 'opened date'],
  openCount: ['open count', 'open_count', 'total opens', 'opens', 'times opened'],
  apolloId: ['message id', 'message_id', 'email id', 'email_id', 'activity id', 'activity_id', 'id'],
  sentAt: ['sent at (pst)', 'sent at (utc)', 'sent at (est)', 'sent at', 'sent_at', 'sent date', 'date sent'],
  opened: ['open', 'opened', 'is opened', 'was opened', 'is open'],
  clicked: ['click', 'clicked', 'is clicked', 'was clicked', 'link clicked'],
  replied: ['replied', 'reply', 'is replied', 'was replied', 'has replied'],
  sent: ['sent'],
  firstName: ['first name', 'first_name', 'contact first name', 'contact_first_name', 'firstname'],
  lastName: ['last name', 'last_name', 'contact last name', 'contact_last_name', 'lastname'],
};

function isBooleanLike(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  const v = value.toLowerCase().trim();
  return v === 'true' || v === 'false' || v === 'yes' || v === 'no' || v === '1' || v === '0';
}

function parseBoolean(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase().trim();
  return v === 'true' || v === 'yes' || v === '1';
}

function firstTimestampCandidate(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (!value) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (isBooleanLike(trimmed)) continue;
    return trimmed;
  }
  return null;
}

/**
 * Normalize a name for comparison
 */
function normalizeName(name: string | null | undefined): string {
  return (name || '').trim().toLowerCase();
}

/**
 * Check if CSV row name matches a DB contact's name
 */
function namesMatch(
  csvFirstName: string | undefined,
  csvLastName: string | undefined,
  dbFirstName: string | null | undefined,
  dbLastName: string | null | undefined
): boolean {
  const csvFirst = normalizeName(csvFirstName);
  const csvLast = normalizeName(csvLastName);
  const dbFirst = normalizeName(dbFirstName);
  const dbLast = normalizeName(dbLastName);

  // Need at least one name to compare
  if (!csvFirst && !csvLast) return false;

  // If both names provided, both must match
  if (csvFirst && csvLast) {
    return csvFirst === dbFirst && csvLast === dbLast;
  }

  // If only first name, match on first
  if (csvFirst) return csvFirst === dbFirst;

  // If only last name, match on last
  return csvLast === dbLast;
}

/**
 * Format a name string for display in match reasons
 */
function formatName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown';
}

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
    opened: null,
    clicked: null,
    replied: null,
    sent: null,
    firstName: null,
    lastName: null,
  };

  for (const [field, variations] of Object.entries(APOLLO_COLUMN_MAPPINGS)) {
    let bestIndex = -1;
    let bestScore = -1;

    for (const variation of variations) {
      const index = lowerHeaders.indexOf(variation);
      if (index === -1) continue;

      const score = variation.length;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    if (bestIndex !== -1) {
      result[field] = headers[bestIndex];
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

    const openedBooleanValue = columnMapping.opened ? row[columnMapping.opened]?.toLowerCase().trim() : null;
    const openedAtValue = columnMapping.openedAt ? row[columnMapping.openedAt]?.trim() : null;
    const sentAtValue = columnMapping.sentAt ? row[columnMapping.sentAt]?.trim() : null;

    let isOpened = false;
    let openedTimestamp: string | null = null;

    if (openedBooleanValue !== null) {
      isOpened = parseBoolean(openedBooleanValue);
      openedTimestamp = firstTimestampCandidate(sentAtValue, openedAtValue) ?? new Date().toISOString();
    } else if (openedAtValue) {
      if (isBooleanLike(openedAtValue)) {
        isOpened = parseBoolean(openedAtValue);
        openedTimestamp = firstTimestampCandidate(sentAtValue) ?? new Date().toISOString();
      } else {
        isOpened = true;
        openedTimestamp = openedAtValue;
      }
    } else {
      continue;
    }

    if (!isOpened) continue;

    const clickedValue = columnMapping.clicked ? row[columnMapping.clicked]?.toLowerCase().trim() : null;
    const repliedValue = columnMapping.replied ? row[columnMapping.replied]?.toLowerCase().trim() : null;

    const isClicked = clickedValue === 'true' || clickedValue === 'yes' || clickedValue === '1';
    const isReplied = repliedValue === 'true' || repliedValue === 'yes' || repliedValue === '1';

    results.push({
      email,
      subject: columnMapping.subject ? row[columnMapping.subject]?.trim() : undefined,
      openedAt: openedTimestamp || new Date().toISOString(),
      apolloId: columnMapping.apolloId ? row[columnMapping.apolloId]?.trim() : undefined,
      openCount: columnMapping.openCount ? parseInt(row[columnMapping.openCount], 10) || 1 : 1,
      sentAt: sentAtValue || undefined,
      clicked: isClicked || undefined,
      replied: isReplied || undefined,
      firstName: columnMapping.firstName ? row[columnMapping.firstName]?.trim() : undefined,
      lastName: columnMapping.lastName ? row[columnMapping.lastName]?.trim() : undefined,
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

  // Fetch all apollo_email_activities records with contact name data via join
  const { data: dbRecords, error } = await supabase
    .from('apollo_email_activities')
    .select(`
      id, apollo_activity_id, subject, apollo_contact_email, sent_at, company_id, contact_id,
      contacts:contact_id (first_name, last_name)
    `);

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

  // Flatten contact name into the record
  type DbRecord = {
    id: string;
    apollo_activity_id: string | null;
    subject: string | null;
    apollo_contact_email: string | null;
    sent_at: string | null;
    company_id: string | null;
    contact_id: string | null;
    contact_first_name: string | null;
    contact_last_name: string | null;
  };

  const flatRecords: DbRecord[] = dbRecords.map((r: any) => ({
    id: r.id,
    apollo_activity_id: r.apollo_activity_id,
    subject: r.subject,
    apollo_contact_email: r.apollo_contact_email,
    sent_at: r.sent_at,
    company_id: r.company_id,
    contact_id: r.contact_id,
    contact_first_name: r.contacts?.first_name ?? null,
    contact_last_name: r.contacts?.last_name ?? null,
  }));

  // Create lookup maps for efficient matching
  const byApolloId = new Map<string, DbRecord>();
  const byEmailSubject = new Map<string, DbRecord[]>();
  const byEmailOnly = new Map<string, DbRecord[]>();

  for (const record of flatRecords) {
    if (record.apollo_activity_id) {
      byApolloId.set(record.apollo_activity_id.toLowerCase(), record);
    }

    if (record.apollo_contact_email) {
      const emailKey = record.apollo_contact_email.toLowerCase();
      
      if (record.subject) {
        const key = `${emailKey}|${record.subject.toLowerCase()}`;
        if (!byEmailSubject.has(key)) {
          byEmailSubject.set(key, []);
        }
        byEmailSubject.get(key)!.push(record);
      }

      if (!byEmailOnly.has(emailKey)) {
        byEmailOnly.set(emailKey, []);
      }
      byEmailOnly.get(emailKey)!.push(record);
    }
  }

  // Match each CSV row
  for (const csvRow of parsedRows) {
    let matchedRecord: MatchedRecord | null = null;

    // Priority 1: Match by Apollo ID (100%)
    if (csvRow.apolloId) {
      const dbRecord = byApolloId.get(csvRow.apolloId.toLowerCase());
      if (dbRecord) {
        matchedRecord = {
          csvRow,
          dbRecord,
          matchType: 'apollo_id',
          matchReason: 'Exact Apollo ID match',
          confidence: 100,
        };
      }
    }

    // Priority 2: Match by Email + Subject (85%)
    if (!matchedRecord && csvRow.email && csvRow.subject) {
      const key = `${csvRow.email.toLowerCase()}|${csvRow.subject.toLowerCase()}`;
      const candidates = byEmailSubject.get(key);
      if (candidates && candidates.length > 0) {
        matchedRecord = {
          csvRow,
          dbRecord: candidates[0],
          matchType: 'email_subject',
          matchReason: 'Email and subject line match',
          confidence: 85,
        };
      }
    }

    // Priority 3: Match by Email + Subject fuzzy (75%)
    if (!matchedRecord && csvRow.email && csvRow.subject) {
      const candidates = byEmailOnly.get(csvRow.email.toLowerCase());
      if (candidates && candidates.length > 1) {
        const subjectLower = csvRow.subject.toLowerCase();
        const matchingCandidate = candidates.find(c => 
          c.subject?.toLowerCase() === subjectLower
        );
        if (matchingCandidate) {
          matchedRecord = {
            csvRow,
            dbRecord: matchingCandidate,
            matchType: 'email_subject',
            matchReason: 'Email and subject line match (multiple candidates)',
            confidence: 75,
          };
        }
      }
    }

    // Priority 4: Email + Name match (70%) - NEW
    if (!matchedRecord && csvRow.email && (csvRow.firstName || csvRow.lastName)) {
      const candidates = byEmailOnly.get(csvRow.email.toLowerCase());
      if (candidates && candidates.length >= 1) {
        const nameCandidate = candidates.find(c =>
          namesMatch(csvRow.firstName, csvRow.lastName, c.contact_first_name, c.contact_last_name)
        );
        if (nameCandidate) {
          const displayName = formatName(csvRow.firstName, csvRow.lastName);
          matchedRecord = {
            csvRow,
            dbRecord: nameCandidate,
            matchType: 'email_name',
            matchReason: `Email matches; contact name '${displayName}' confirms identity`,
            confidence: 70,
          };
        }
      }
    }

    // Priority 5: Match by Email only, single candidate (60%)
    if (!matchedRecord && csvRow.email) {
      const candidates = byEmailOnly.get(csvRow.email.toLowerCase());
      if (candidates && candidates.length === 1) {
        matchedRecord = {
          csvRow,
          dbRecord: candidates[0],
          matchType: 'email_only',
          matchReason: 'Email matches single database record',
          confidence: 60,
        };
      }
    }

    // Priority 6: Email + Name disambiguates multiple candidates (55%) - NEW
    if (!matchedRecord && csvRow.email && (csvRow.firstName || csvRow.lastName)) {
      const candidates = byEmailOnly.get(csvRow.email.toLowerCase());
      if (candidates && candidates.length > 1) {
        const nameCandidate = candidates.find(c =>
          namesMatch(csvRow.firstName, csvRow.lastName, c.contact_first_name, c.contact_last_name)
        );
        if (nameCandidate) {
          const displayName = formatName(csvRow.firstName, csvRow.lastName);
          matchedRecord = {
            csvRow,
            dbRecord: nameCandidate,
            matchType: 'email_name_disambiguate',
            matchReason: `Email matches multiple records; name '${displayName}' used to disambiguate`,
            confidence: 55,
          };
        }
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
 * Update matched records with opened/clicked/replied data
 */
export async function updateOpenedEmails(
  matchedRecords: MatchedRecord[]
): Promise<UpdateResult> {
  const errors: string[] = [];
  let updated = 0;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  for (const match of matchedRecords) {
    try {
      const openedAt = parseTimestamp(match.csvRow.openedAt);
      if (!openedAt) {
        errors.push(`Invalid timestamp for email to ${match.csvRow.email}: ${match.csvRow.openedAt}`);
        continue;
      }

      const updateData: Record<string, any> = {
        opened_at: openedAt.toISOString(),
        open_count: Math.max(match.csvRow.openCount || 1, 1),
        status: 'opened',
        updated_at: new Date().toISOString(),
      };

      if (match.csvRow.clicked) {
        updateData.clicked_at = openedAt.toISOString();
        updateData.click_count = 1;
      }

      if (match.csvRow.replied) {
        updateData.replied_at = openedAt.toISOString();
        updateData.reply_count = 1;
        updateData.status = 'replied';
      }

      const { error: updateError } = await supabase
        .from('apollo_email_activities')
        .update(updateData)
        .eq('id', match.dbRecord.id);

      if (updateError) {
        errors.push(`Failed to update activity ${match.dbRecord.id}: ${updateError.message}`);
        continue;
      }

      if (match.dbRecord.company_id && match.dbRecord.contact_id) {
        const commUpdateData: Record<string, any> = {
          email_opened_at: openedAt.toISOString(),
        };
        
        if (match.csvRow.replied) {
          commUpdateData.email_responded_at = openedAt.toISOString();
        }

        const { error: commError } = await supabase
          .from('company_communications')
          .update(commUpdateData)
          .eq('company_id', match.dbRecord.company_id)
          .eq('contact_id', match.dbRecord.contact_id)
          .ilike('subject', match.dbRecord.subject || '')
          .is('email_opened_at', null);
        
        if (commError) {
          console.warn(`Could not update company_communications: ${commError.message}`);
        }
      }

      updated++;
    } catch (err: any) {
      errors.push(`Error processing ${match.csvRow.email}: ${err.message}`);
    }
  }

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

  const cleaned = value
    .trim()
    .replace(/\s*\(([^)]+)\)\s*/g, ' ')
    .replace(/\b(PST|PDT|EST|EDT|UTC)\b/gi, '')
    .trim();

  let date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date;
  }

  const apolloFormatMatch = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (apolloFormatMatch) {
    const [, month, day, year, hour, minute, second] = apolloFormatMatch;
    const monthIndex = new Date(`${month} 1, 2000`).getMonth();
    if (!isNaN(monthIndex)) {
      date = new Date(
        parseInt(year),
        monthIndex,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        second ? parseInt(second) : 0
      );
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  const mmddMatch = cleaned.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?)?$/
  );
  if (mmddMatch) {
    const [, mm, dd, yyyy, hh = '0', min = '0', sec = '0', ampm] = mmddMatch;
    let hours = parseInt(hh, 10);
    const minutes = parseInt(min, 10);
    const seconds = parseInt(sec, 10);
    if (ampm) {
      const upper = ampm.toUpperCase();
      if (upper === 'PM' && hours < 12) hours += 12;
      if (upper === 'AM' && hours === 12) hours = 0;
    }
    date = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10), hours, minutes, seconds);
    if (!isNaN(date.getTime())) return date;
  }

  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/,
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):?(\d{2})?/,
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/,
  ];

  for (const format of formats) {
    const match = cleaned.match(format);
    if (match) {
      date = new Date(cleaned);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  const parsed = Date.parse(cleaned);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }

  return null;
}
