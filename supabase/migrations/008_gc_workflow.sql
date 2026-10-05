-- 008_gc_workflow.sql
-- Add rejection and timing columns for Garbage Collector workflow

-- Attempt to drop the default status check constraint if it exists
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.complaints DROP CONSTRAINT complaints_status_check;
  EXCEPTION
    WHEN undefined_object THEN
      -- Do nothing, constraint doesn't exist or has a different name
  END;
END $$;

ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
