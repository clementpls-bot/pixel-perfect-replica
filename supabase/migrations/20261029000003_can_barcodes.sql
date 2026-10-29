-- Additional barcodes for existing cans. The primary barcode remains in public.cans.barcode.
create table if not exists public.can_barcodes (
  id uuid primary key default gen_random_uuid(),
  can_id uuid not null references public.cans(id) on delete cascade,
  barcode text not null unique check (barcode ~ '^\d{8,14}$'),
  submitted_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists can_barcodes_can_id_status_idx
  on public.can_barcodes (can_id, status);

alter table public.can_barcodes enable row level security;

drop policy if exists "Anyone can read can barcode entries" on public.can_barcodes;
create policy "Anyone can read can barcode entries"
  on public.can_barcodes for select to anon, authenticated
  using (status in ('pending', 'approved'));

drop policy if exists "Authenticated users can propose can barcodes" on public.can_barcodes;
create policy "Authenticated users can propose can barcodes"
  on public.can_barcodes for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and status = 'pending'
    and barcode ~ '^\d{8,14}$'
  );

drop policy if exists "Admins can moderate can barcodes" on public.can_barcodes;
create policy "Admins can moderate can barcodes"
  on public.can_barcodes for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Enable realtime updates when the Supabase project has the standard publication.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'can_barcodes'
     ) then
    alter publication supabase_realtime add table public.can_barcodes;
  end if;
end
$$;
