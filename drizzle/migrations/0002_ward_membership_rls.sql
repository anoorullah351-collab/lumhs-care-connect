CREATE TYPE public.app_role AS ENUM ('admin','clinician');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.ward_members (
  ward_code text NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ward_code, user_id)
);
GRANT SELECT ON public.ward_members TO authenticated;
GRANT ALL ON public.ward_members TO service_role;
ALTER TABLE public.ward_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own memberships read" ON public.ward_members FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Clinical access: must be a member of the ward AND not an administrator account
CREATE OR REPLACE FUNCTION public.can_access_ward(_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
    AND NOT public.has_role(auth.uid(), 'admin')
    AND EXISTS (SELECT 1 FROM public.ward_members WHERE ward_code = _code AND user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.join_ward(_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Administrator accounts cannot open patient records'; END IF;
  IF _code IS NULL OR length(trim(_code)) < 3 THEN RAISE EXCEPTION 'Invalid ward code'; END IF;
  INSERT INTO public.ward_members (ward_code, user_id) VALUES (upper(trim(_code)), auth.uid())
    ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.join_ward(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.join_ward(text) TO authenticated;

-- Backfill existing users from presence/messages
INSERT INTO public.ward_members (ward_code, user_id)
SELECT DISTINCT ward_code, doctor_id::uuid FROM public.ward_presence
WHERE doctor_id ~* '^[0-9a-f-]{36}$' ON CONFLICT DO NOTHING;
INSERT INTO public.ward_members (ward_code, user_id)
SELECT DISTINCT ward_code, sender_id FROM public.ward_messages ON CONFLICT DO NOTHING;

-- wards
DROP POLICY IF EXISTS "wards auth read" ON public.wards;
DROP POLICY IF EXISTS "wards auth insert" ON public.wards;
DROP POLICY IF EXISTS "wards auth update" ON public.wards;
DROP POLICY IF EXISTS "wards auth delete" ON public.wards;
CREATE POLICY "wards member read" ON public.wards FOR SELECT TO authenticated USING (public.can_access_ward(code));
CREATE POLICY "wards member insert" ON public.wards FOR INSERT TO authenticated WITH CHECK (public.can_access_ward(code));
CREATE POLICY "wards member update" ON public.wards FOR UPDATE TO authenticated USING (public.can_access_ward(code)) WITH CHECK (public.can_access_ward(code));

-- activity
DROP POLICY IF EXISTS "ward_activity auth read" ON public.ward_activity;
DROP POLICY IF EXISTS "ward_activity auth insert" ON public.ward_activity;
CREATE POLICY "activity member read" ON public.ward_activity FOR SELECT TO authenticated USING (public.can_access_ward(ward_code));
CREATE POLICY "activity member insert" ON public.ward_activity FOR INSERT TO authenticated WITH CHECK (public.can_access_ward(ward_code));

-- messages
DROP POLICY IF EXISTS "msg read" ON public.ward_messages;
DROP POLICY IF EXISTS "msg insert own" ON public.ward_messages;
CREATE POLICY "msg member read" ON public.ward_messages FOR SELECT TO authenticated USING (public.can_access_ward(ward_code));
CREATE POLICY "msg member insert" ON public.ward_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.can_access_ward(ward_code));

-- presence
DROP POLICY IF EXISTS "ward_presence auth read" ON public.ward_presence;
DROP POLICY IF EXISTS "ward_presence auth insert" ON public.ward_presence;
CREATE POLICY "presence member read" ON public.ward_presence FOR SELECT TO authenticated USING (public.can_access_ward(ward_code));
CREATE POLICY "presence member insert" ON public.ward_presence FOR INSERT TO authenticated WITH CHECK (doctor_id = (auth.uid())::text AND public.can_access_ward(ward_code));