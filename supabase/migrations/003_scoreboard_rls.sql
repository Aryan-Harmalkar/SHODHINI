-- 003_scoreboard_rls.sql: Allow reading citizen profiles and complaints for community leaderboard

-- 1. Allow reading citizen profiles so community champions can be displayed on the scoreboard
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow reading profiles for leaderboard" ON public.profiles;

CREATE POLICY "Allow reading profiles for leaderboard"
  ON public.profiles FOR SELECT
  USING (true);

-- 2. Allow reading complaints so ward cleanliness statistics and resolved task counts can be viewed
DROP POLICY IF EXISTS "Citizens can read only their own complaints" ON public.complaints;
DROP POLICY IF EXISTS "Workers can read complaints in their area" ON public.complaints;
DROP POLICY IF EXISTS "Allow reading complaints for leaderboard" ON public.complaints;

CREATE POLICY "Allow reading complaints for leaderboard"
  ON public.complaints FOR SELECT
  USING (true);
