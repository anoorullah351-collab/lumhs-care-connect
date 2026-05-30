-- Tighten RLS: drop open policies, restrict to authenticated users only
DROP POLICY IF EXISTS "wards open" ON public.wards;
DROP POLICY IF EXISTS "ward_activity open" ON public.ward_activity;
DROP POLICY IF EXISTS "ward_presence open" ON public.ward_presence;

-- Revoke anon access
REVOKE ALL ON public.wards FROM anon;
REVOKE ALL ON public.ward_activity FROM anon;
REVOKE ALL ON public.ward_presence FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_activity TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_presence TO authenticated;

-- wards: authenticated users only
CREATE POLICY "wards auth read" ON public.wards FOR SELECT TO authenticated USING (true);
CREATE POLICY "wards auth insert" ON public.wards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "wards auth update" ON public.wards FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "wards auth delete" ON public.wards FOR DELETE TO authenticated USING (true);

-- ward_activity: authenticated read, authenticated insert only (audit log: no update/delete)
CREATE POLICY "ward_activity auth read" ON public.ward_activity FOR SELECT TO authenticated USING (true);
CREATE POLICY "ward_activity auth insert" ON public.ward_activity FOR INSERT TO authenticated WITH CHECK (true);

-- ward_presence: doctors can only write rows tied to their own auth.uid()
CREATE POLICY "ward_presence auth read" ON public.ward_presence FOR SELECT TO authenticated USING (true);
CREATE POLICY "ward_presence auth insert" ON public.ward_presence FOR INSERT TO authenticated
  WITH CHECK (doctor_id = auth.uid()::text);
CREATE POLICY "ward_presence auth update" ON public.ward_presence FOR UPDATE TO authenticated
  USING (doctor_id = auth.uid()::text) WITH CHECK (doctor_id = auth.uid()::text);
CREATE POLICY "ward_presence auth delete" ON public.ward_presence FOR DELETE TO authenticated
  USING (doctor_id = auth.uid()::text);

-- Realtime authorization: only authenticated users may subscribe to channels
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "realtime authenticated subscribe"
  ON realtime.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "realtime authenticated send"
  ON realtime.messages FOR INSERT TO authenticated WITH CHECK (true);