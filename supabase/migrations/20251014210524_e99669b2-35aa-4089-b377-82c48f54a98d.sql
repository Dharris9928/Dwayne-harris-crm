-- Manually sync existing activities to communications
-- Insert communications for activities that don't have a sync yet
INSERT INTO public.company_communications (
  company_id,
  contact_id,
  user_id,
  communication_type,
  subject,
  content,
  notes,
  used,
  sent_at,
  attempted_at,
  generated_at
)
SELECT 
  a.company_id,
  a.contact_id,
  a.created_by,
  CASE
    WHEN a.activity_type = 'Email' THEN 'email'
    WHEN a.activity_type = 'Phone' THEN 'call_script'
    WHEN a.activity_type = 'LinkedIn Message' THEN 'linkedin_message'
    WHEN a.activity_type = 'Meeting' THEN 'call_script'
  END as communication_type,
  a.subject_line,
  COALESCE(a.message_content, 'Activity: ' || a.activity_type::text),
  'Synced from activity. Activity ID: ' || a.id::text || 
    CASE 
      WHEN a.notes IS NOT NULL THEN E'\n\nActivity Notes: ' || a.notes 
      ELSE '' 
    END,
  true,
  a.completed_date,
  COALESCE(a.completed_date, a.scheduled_date),
  COALESCE(a.completed_date, a.created_at, now())
FROM public.outreach_activities a
WHERE a.activity_type IN ('Email', 'Phone', 'LinkedIn Message', 'Meeting')
  AND NOT EXISTS (
    SELECT 1
    FROM public.company_communications c
    WHERE c.notes LIKE '%Activity ID: ' || a.id::text || '%'
  );