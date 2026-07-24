drop policy if exists "Allow delete evaluations" on public.evaluations;
create policy "Allow delete evaluations"
  on public.evaluations for delete
  using (true);
