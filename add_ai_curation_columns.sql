-- SQL Migration: Add AI Curation Columns to Leads Table
-- This script adds the columns necessary for the AI Feedback & Training tab to operate directly with dedicated columns in Supabase.

-- 1. Status Column: 'pending' (afventer), 'qualified' (gylden/godkendt), 'rejected' (afvist/støj)
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS ai_curation_status TEXT DEFAULT 'pending';

-- 2. Rating Column: 1-5 integer value
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS ai_curation_rating SMALLINT DEFAULT NULL;

-- 3. Notes Column: Admin notes/internal explanations
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS ai_curation_notes TEXT DEFAULT NULL;

-- 4. Overrides Column: Corrections to hours and pricing
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS ai_curation_overrides JSONB DEFAULT '{}'::jsonb;

-- Create an index to optimize few-shot queries which lookup by category, status, and rating
CREATE INDEX IF NOT EXISTS idx_leads_ai_curation 
ON leads (project_category, ai_curation_status, ai_curation_rating)
WHERE ai_curation_status = 'qualified' AND ai_curation_rating = 5;
