CREATE TABLE public.ward_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_code text NOT NULL,
  sender_id uuid NOT NULL DEFAULT auth.uid(),
  sender_name text,
  sender_role text,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ward_messages_ward_idx ON public.ward_messages(ward_code, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.ward_messages TO authenticated;
GRANT ALL ON public.ward_messages TO service_role;
ALTER TABLE public.ward_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg read" ON public.ward_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "msg insert own" ON public.ward_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "msg delete own" ON public.ward_messages FOR DELETE TO authenticated USING (sender_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.ward_messages;