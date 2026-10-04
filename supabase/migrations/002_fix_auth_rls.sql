-- 002_fix_auth_rls.sql: Auto-confirm users & Auto-create profiles

-- 1. Confirm any existing registered users immediately
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 2. Automatically confirm all future signups (bypasses email rate limit & confirmation requirement)
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.email_confirmed_at := NOW();
  NEW.confirmed_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_user ON auth.users;
CREATE TRIGGER trg_auto_confirm_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user();

-- 3. Automatically create/sync profile on signup with SECURITY DEFINER (immune to RLS timing)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name, phone, area_id, eco_points)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'citizen'),
    COALESCE(NEW.raw_user_meta_data->>'name', 'Citizen'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'area_id', '')::INT,
    0
  )
  ON CONFLICT (id) DO UPDATE
  SET
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    area_id = EXCLUDED.area_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill any existing users into profiles
INSERT INTO public.profiles (id, role, name, phone, area_id, eco_points)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'role', 'citizen'),
  COALESCE(raw_user_meta_data->>'name', 'Citizen'),
  COALESCE(raw_user_meta_data->>'phone', ''),
  NULLIF(raw_user_meta_data->>'area_id', '')::INT,
  0
FROM auth.users
ON CONFLICT (id) DO NOTHING;
