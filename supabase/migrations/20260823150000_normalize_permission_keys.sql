begin;

-- Preserve every role that received the historical misspelled permission by
-- assigning the canonical countries.delete permission before removing it.
insert into public.role_permissions (role_id, permission_id)
select typo_mapping.role_id, canonical.id
from public.role_permissions as typo_mapping
join public.permissions as typo
  on typo.id = typo_mapping.permission_id
cross join public.permissions as canonical
where typo.permission_key = 'contries.delete'
  and canonical.permission_key = 'countries.delete'
on conflict (role_id, permission_id) do nothing;

delete from public.role_permissions
where permission_id in (
  select id from public.permissions where permission_key = 'contries.delete'
);

delete from public.permissions
where permission_key = 'contries.delete';

update public.permissions
set module = lower(trim(module)),
    action = lower(trim(action)),
    permission_key = lower(trim(permission_key));

alter table public.permissions
drop constraint if exists permissions_canonical_format_check;

alter table public.permissions
add constraint permissions_canonical_format_check
check (
  module = lower(trim(module))
  and action = lower(trim(action))
  and permission_key = lower(trim(permission_key))
  and permission_key = module || '.' || action
);

commit;
