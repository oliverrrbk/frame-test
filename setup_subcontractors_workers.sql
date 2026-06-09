-- Add workers JSONB array to subcontractors
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS workers JSONB DEFAULT '[]'::jsonb;
