-- Add Scheduled and Cancelled to the activity_outcome enum if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Scheduled' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_outcome')) THEN
    ALTER TYPE activity_outcome ADD VALUE 'Scheduled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Cancelled' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_outcome')) THEN
    ALTER TYPE activity_outcome ADD VALUE 'Cancelled';
  END IF;
END $$;

-- Create a function to check for past-due meetings and create notifications
CREATE OR REPLACE FUNCTION public.check_past_due_meetings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity_record RECORD;
  company_name TEXT;
BEGIN
  -- Find meetings/demos that are past their scheduled date and still have "Scheduled" outcome
  FOR activity_record IN
    SELECT oa.id, oa.company_id, oa.created_by, oa.subject_line, oa.scheduled_date, oa.activity_type
    FROM outreach_activities oa
    WHERE oa.activity_type IN ('Meeting', 'Demo')
      AND oa.scheduled_date IS NOT NULL
      AND oa.scheduled_date < CURRENT_DATE
      AND oa.outcome = 'Scheduled'
      -- Don't send duplicate notifications (check if notification already exists)
      AND NOT EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.user_id = oa.created_by 
          AND n.related_entity_type = 'activity'
          AND n.related_entity_id = oa.id
          AND n.notification_type = 'meeting_followup'
      )
  LOOP
    -- Get company name
    SELECT c.company_name INTO company_name
    FROM companies c
    WHERE c.id = activity_record.company_id;
    
    -- Create notification for the user who created the activity
    INSERT INTO notifications (
      user_id,
      title,
      message,
      notification_type,
      related_entity_type,
      related_entity_id,
      priority
    ) VALUES (
      activity_record.created_by,
      'Meeting Follow-up Required',
      'Your ' || activity_record.activity_type || ' with ' || COALESCE(company_name, 'Unknown Company') || 
        COALESCE(' (' || activity_record.subject_line || ')', '') || 
        ' was scheduled for ' || TO_CHAR(activity_record.scheduled_date, 'Mon DD, YYYY') || 
        '. Please update the activity status.',
      'meeting_followup',
      'activity',
      activity_record.id,
      'high'
    );
  END LOOP;
END;
$$;

-- Create a trigger function that fires when an activity is inserted with a scheduled date
CREATE OR REPLACE FUNCTION public.schedule_meeting_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process meetings/demos with scheduled dates
  IF NEW.activity_type IN ('Meeting', 'Demo') AND NEW.scheduled_date IS NOT NULL THEN
    -- Schedule check will be done by the check_past_due_meetings function
    -- which should be called periodically (e.g., via cron or edge function)
    NULL; -- Placeholder - the actual notification will be created by check_past_due_meetings
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on outreach_activities
DROP TRIGGER IF EXISTS trigger_schedule_meeting_reminder ON outreach_activities;
CREATE TRIGGER trigger_schedule_meeting_reminder
AFTER INSERT OR UPDATE ON outreach_activities
FOR EACH ROW
EXECUTE FUNCTION schedule_meeting_reminder();