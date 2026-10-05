-- 005_assagao_wards.sql
-- Set Village Panchayat Assagao (7 Wards) in areas table

INSERT INTO public.areas (id, name) VALUES
  (1, 'Assagao - Ward 1 (Munang Waddo)'),
  (2, 'Assagao - Ward 2 (Bouta Waddo)'),
  (3, 'Assagao - Ward 3 (Socol Waddo)'),
  (4, 'Assagao - Ward 4 (Badem)'),
  (5, 'Assagao - Ward 5 (Monforte Vaddo)'),
  (6, 'Assagao - Ward 6 (Mazal Waddo)'),
  (7, 'Assagao - Ward 7 (Igrej Waddo)')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Delete any old dummy placeholder wards above 7 if not referenced
DELETE FROM public.areas WHERE id > 7;
