-- 009_geo_fields.sql
-- Add detailed geolocation tracking fields for complaints

ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS geo_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS geo_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS geo_accuracy_m DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS geo_captured_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS geo_source TEXT;
