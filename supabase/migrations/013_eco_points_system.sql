-- 013_eco_points_system.sql
-- Function to award or deduct eco points securely across roles (SECURITY DEFINER bypasses RLS)

CREATE OR REPLACE FUNCTION public.award_eco_points(target_citizen_id UUID, points_to_add INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_total INT;
BEGIN
  UPDATE public.profiles
  SET eco_points = GREATEST(0, COALESCE(eco_points, 0) + points_to_add)
  WHERE id = target_citizen_id
  RETURNING eco_points INTO new_total;
  
  RETURN COALESCE(new_total, 0);
END;
$$;

-- Allow authenticated users to execute award_eco_points RPC
GRANT EXECUTE ON FUNCTION public.award_eco_points(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_eco_points(UUID, INT) TO anon;

-- Also add permissive policy so workers and backend can update citizen eco_points on complaint completion
DROP POLICY IF EXISTS "Workers can update citizen eco points" ON public.profiles;
CREATE POLICY "Workers can update citizen eco points"
  ON public.profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);
