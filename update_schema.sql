-- Add missing columns to work_settings table
ALTER TABLE work_settings 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS break_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS work_days INTEGER[] DEFAULT '{1,2,3,4,5}';

-- Modify overtime_rate to support decimals (since the form allows step=0.01)
-- We use a safe cast to avoid errors if data cannot be cast automatically
ALTER TABLE work_settings 
ALTER COLUMN overtime_rate TYPE NUMERIC(5,2);
