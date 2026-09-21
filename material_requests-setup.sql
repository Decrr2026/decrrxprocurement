-- Run this once in your Supabase project's SQL Editor to enable the "Material Requests" feature
-- in DECRR Interio. It creates the material_requests table, turns on row-level security with the
-- same "any signed-in user can read/write" policy the rest of the app uses, and switches on
-- realtime so requests appear live for everyone without a refresh.

create table if not exists public.material_requests (
  id text primary key,
  material_id text references public.materials(id) on delete set null,
  material_name text not null default '',
  raw_input text not null default '',
  qty numeric not null default 0,
  uom text not null default '',
  site_id text not null default '',
  notes text not null default '',
  status text not null default 'Pending Approval',
  decision_note text not null default '',
  requested_by text not null default '',
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.material_requests enable row level security;

create policy "Authenticated users can read material requests"
  on public.material_requests for select
  to authenticated
  using (true);

create policy "Authenticated users can insert material requests"
  on public.material_requests for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update material requests"
  on public.material_requests for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete material requests"
  on public.material_requests for delete
  to authenticated
  using (true);

alter publication supabase_realtime add table public.material_requests;
