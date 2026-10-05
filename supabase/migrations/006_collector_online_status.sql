-- 006_collector_online_status.sql
-- Add online duty status to profiles for collectors/workers

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true;

-- Update RLS if needed to allow updating own is_online status
CREATE POLICY "Users can update their own online duty status"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
