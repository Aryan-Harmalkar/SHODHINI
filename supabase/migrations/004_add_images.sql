-- 004_add_images.sql
-- Add base64 image and verification columns to complaints table

ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS citizen_image_base64 TEXT,
ADD COLUMN IF NOT EXISTS collector_image_base64 TEXT,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS collector_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS collector_longitude DOUBLE PRECISION;
