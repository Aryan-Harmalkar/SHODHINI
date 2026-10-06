-- 012_update_shreyash_name.sql

-- Update the display name of Shreyash Naik to Shreyash Khanam
UPDATE public.profiles
SET name = 'Shreyash Khanam'
WHERE name ILIKE '%shreyash naik%';
