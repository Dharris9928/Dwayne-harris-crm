-- Create table to track AI import sessions for auditing and improvement
CREATE TABLE IF NOT EXISTS import_ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INT NOT NULL,
  raw_headers JSONB NOT NULL,
  ai_mappings JSONB NOT NULL,
  confidence_scores JSONB NOT NULL,
  rows_parsed INT NOT NULL,
  rows_accepted INT DEFAULT 0,
  rows_rejected INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'imported', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE import_ai_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own import sessions"
  ON import_ai_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own sessions
CREATE POLICY "Users can create import sessions"
  ON import_ai_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own import sessions"
  ON import_ai_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can see all sessions
CREATE POLICY "Admins can view all import sessions"
  ON import_ai_sessions FOR SELECT
  USING (has_elevated_access(auth.uid()));

-- Create index for performance
CREATE INDEX idx_import_ai_sessions_user_id ON import_ai_sessions(user_id);
CREATE INDEX idx_import_ai_sessions_created_at ON import_ai_sessions(created_at DESC);
