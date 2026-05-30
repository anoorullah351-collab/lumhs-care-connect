
create table public.wards (
  code text primary key,
  patients jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.ward_activity (
  id uuid primary key default gen_random_uuid(),
  ward_code text not null,
  doctor text,
  role text,
  action text,
  detail text,
  ts_local bigint not null default (extract(epoch from now())*1000)::bigint,
  created_at timestamptz not null default now()
);
create index ward_activity_ward_ts_idx on public.ward_activity(ward_code, ts_local desc);

create table public.ward_presence (
  ward_code text not null,
  doctor_id text not null,
  name text,
  role text,
  online boolean not null default true,
  last_seen timestamptz not null default now(),
  primary key (ward_code, doctor_id)
);

grant select, insert, update, delete on public.wards to anon, authenticated;
grant select, insert, update, delete on public.ward_activity to anon, authenticated;
grant select, insert, update, delete on public.ward_presence to anon, authenticated;
grant all on public.wards, public.ward_activity, public.ward_presence to service_role;

alter table public.wards enable row level security;
alter table public.ward_activity enable row level security;
alter table public.ward_presence enable row level security;

create policy "wards open" on public.wards for all to anon, authenticated using (true) with check (true);
create policy "ward_activity open" on public.ward_activity for all to anon, authenticated using (true) with check (true);
create policy "ward_presence open" on public.ward_presence for all to anon, authenticated using (true) with check (true);

alter publication supabase_realtime add table public.wards;
alter publication supabase_realtime add table public.ward_activity;
alter publication supabase_realtime add table public.ward_presence;

alter table public.wards replica identity full;
alter table public.ward_activity replica identity full;
alter table public.ward_presence replica identity full;
