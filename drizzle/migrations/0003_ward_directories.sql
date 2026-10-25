CREATE TABLE public.ward_directories (
  code text PRIMARY KEY,
  name text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ward_directories TO authenticated;
GRANT ALL ON public.ward_directories TO service_role;
ALTER TABLE public.ward_directories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "directory member read" ON public.ward_directories FOR SELECT TO authenticated USING (public.can_access_ward(code));

INSERT INTO public.ward_directories (code)
SELECT DISTINCT upper(trim(code)) FROM public.wards WHERE length(trim(code)) >= 3
UNION SELECT DISTINCT ward_code FROM public.ward_members
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.ward_code_exists(_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.ward_directories WHERE code = upper(trim(_code)))
$$;
GRANT EXECUTE ON FUNCTION public.ward_code_exists(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.join_ward(_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Administrator accounts cannot open patient records'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ward_directories WHERE code = upper(trim(_code))) THEN
    RAISE EXCEPTION 'Ward code not found. Check the code with your team lead.';
  END IF;
  INSERT INTO public.ward_members (ward_code, user_id) VALUES (upper(trim(_code)), auth.uid())
    ON CONFLICT DO NOTHING;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.create_ward(_code text, _name text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text := upper(trim(_code));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Administrator accounts cannot open patient records'; END IF;
  IF c IS NULL OR c !~ '^[A-Z0-9-]{4,40}$' THEN RAISE EXCEPTION 'Ward code must be 4-40 letters, numbers or dashes'; END IF;
  IF EXISTS (SELECT 1 FROM public.ward_directories WHERE code = c) THEN RAISE EXCEPTION 'This ward code is already taken. Choose another.'; END IF;
  INSERT INTO public.ward_directories (code, name, created_by) VALUES (c, nullif(trim(_name),''), auth.uid());
  INSERT INTO public.ward_members (ward_code, user_id) VALUES (c, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_ward(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_ward(text, text) TO authenticated;