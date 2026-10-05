-- 007_ward1_ghateshwar_nagar.sql
-- Update Ward 1 to Ghateshwar Nagar for live testing and hackathon demo

UPDATE public.areas 
SET name = 'Assagao - Ward 1 (Ghateshwar Nagar)'
WHERE id = 1;

-- Also update existing profiles if they had old Ward 1 string
UPDATE public.profiles
SET area = 'Assagao - Ward 1 (Ghateshwar Nagar)'
WHERE area_id = 1 OR area LIKE '%Ward 1%';
