-- 001_init.sql: Initial Schema for SHODHINI Waste Management

-- 1. Areas Table
CREATE TABLE IF NOT EXISTS public.areas (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Seed 10 placeholder areas: Ward 1 to Ward 10
INSERT INTO public.areas (name) VALUES
  ('Ward 1'),
  ('Ward 2'),
  ('Ward 3'),
  ('Ward 4'),
  ('Ward 5'),
  ('Ward 6'),
  ('Ward 7'),
  ('Ward 8'),
  ('Ward 9'),
  ('Ward 10')
ON CONFLICT (name) DO NOTHING;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('citizen', 'worker')),
  name TEXT,
  phone TEXT,
  area_id INT REFERENCES public.areas(id),
  eco_points INT DEFAULT 0,
  expo_push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Complaints Table
CREATE TABLE IF NOT EXISTS public.complaints (
  id BIGSERIAL PRIMARY KEY,
  citizen_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  area_id INT NOT NULL REFERENCES public.areas(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Assigned', 'In Progress', 'Completed')),
  assigned_worker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  eco_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Areas: Everyone can read
CREATE POLICY "Allow public read access to areas"
  ON public.areas FOR SELECT
  USING (true);

-- Profiles: Users can read and update only their own profile
CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Complaints Policies:
-- Citizens can insert complaints only with their own citizen_id
CREATE POLICY "Citizens can insert complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (auth.uid() = citizen_id);

-- Citizens can read only their own complaints
CREATE POLICY "Citizens can read their own complaints"
  ON public.complaints FOR SELECT
  USING (auth.uid() = citizen_id);

-- Workers can read complaints where area_id matches their profile's area_id
CREATE POLICY "Workers can read complaints in their area"
  ON public.complaints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'worker'
        AND profiles.area_id = complaints.area_id
    )
  );

-- Workers can update status on complaints where area_id matches their profile's area_id
CREATE POLICY "Workers can update status on complaints in their area"
  ON public.complaints FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'worker'
        AND profiles.area_id = complaints.area_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'worker'
        AND profiles.area_id = complaints.area_id
    )
  );

-- 6. Eco Points Trigger on Completion
CREATE OR REPLACE FUNCTION public.handle_complaint_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When status changes to 'Completed' (guard against re-awarding if already completed or points already given)
  IF NEW.status = 'Completed' AND (OLD.status IS DISTINCT FROM 'Completed') AND COALESCE(OLD.eco_points, 0) = 0 THEN
    NEW.eco_points := 15;

    UPDATE public.profiles
    SET eco_points = COALESCE(eco_points, 0) + 15
    WHERE id = NEW.citizen_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaint_completed ON public.complaints;
CREATE TRIGGER trg_complaint_completed
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_complaint_completion();

-- 7. Enable Realtime Replication for complaints
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
