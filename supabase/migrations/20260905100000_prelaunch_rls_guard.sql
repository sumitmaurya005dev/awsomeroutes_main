-- The publishable Supabase key is intentionally browser-visible. RLS is its
-- mandatory database boundary, so fail closed for every current public table.
do $$
declare
  table_row record;
begin
  for table_row in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'alter table %I.%I enable row level security',
      table_row.schemaname,
      table_row.tablename
    );
  end loop;

  if exists (
    select 1
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
      and not relation.relrowsecurity
  ) then
    raise exception 'Every public table must have row level security enabled.';
  end if;
end;
$$;
