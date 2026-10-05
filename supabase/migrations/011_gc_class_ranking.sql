-- 011_gc_class_ranking.sql
-- Add ranking class for Garbage Collectors

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gc_class TEXT DEFAULT 'Class B';
