-- 003_ai_vision_complaints.sql: AI Vision Analysis & Live Photo Geotag support

-- 1. Add AI vision metadata columns to public.complaints if not already present
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS ai_classification TEXT,
  ADD COLUMN IF NOT EXISTS ai_analysis JSONB,
  ADD COLUMN IF NOT EXISTS requires_admin_verification BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_verified BOOLEAN DEFAULT NULL;

-- 2. Update status check to support admin verification stage in future
-- Note: 'Submitted' continues to represent active complaints dispatched to collectors.
-- 'Pending Admin' can be used for complaints requiring admin cross-verification.
ALTER TABLE public.complaints
  DROP CONSTRAINT IF EXISTS complaints_status_check;

ALTER TABLE public.complaints
  ADD CONSTRAINT complaints_status_check
  CHECK (status IN ('Submitted', 'Pending Admin', 'Assigned', 'In Progress', 'Completed'));

-- 3. Comments for documentation
COMMENT ON COLUMN public.complaints.image_url IS 'Live camera photo URL or Base64 data';
COMMENT ON COLUMN public.complaints.ai_confidence IS 'AI Waste Detection certainty percentage (0-100)';
COMMENT ON COLUMN public.complaints.requires_admin_verification IS 'True when AI confidence is under 20%';
