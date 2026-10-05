-- 010_gc_assignment_queue.sql
-- Add fields for GC round-robin assignment and SLA tracking

ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS gc_queue JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_warning_issued BOOLEAN DEFAULT false;
