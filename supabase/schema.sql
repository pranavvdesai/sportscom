-- Sportscom shared evaluations — project xxbsoswimmruihdxurya

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  interviewer_name text not null,
  panel text not null check (panel in ('1', '2', 'free')),
  candidate_id integer not null,
  candidate_name text not null,
  decision text null check (decision is null or decision in ('in', 'maybe', 'out')),
  remarks text not null default '',
  characteristics text not null default '',
  created_at timestamptz not null default now()
);

alter table public.evaluations enable row level security;

drop policy if exists "Allow read evaluations" on public.evaluations;
drop policy if exists "Allow insert evaluations" on public.evaluations;

create policy "Allow read evaluations"
  on public.evaluations for select
  using (true);

create policy "Allow insert evaluations"
  on public.evaluations for insert
  with check (true);

create index if not exists evaluations_candidate_id_idx on public.evaluations (candidate_id);
create index if not exists evaluations_created_at_idx on public.evaluations (created_at desc);
