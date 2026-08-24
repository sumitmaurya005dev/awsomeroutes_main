begin;

insert into public.permissions (module, action, permission_key, description)
values
  ('dashboard', 'view', 'dashboard.view', 'View the admin dashboard'),
  ('countries', 'view', 'countries.view', 'View countries'),
  ('countries', 'create', 'countries.create', 'Create countries'),
  ('countries', 'update', 'countries.update', 'Update countries'),
  ('countries', 'delete', 'countries.delete', 'Delete countries'),
  ('regions', 'view', 'regions.view', 'View regions'),
  ('regions', 'create', 'regions.create', 'Create regions'),
  ('regions', 'update', 'regions.update', 'Update regions'),
  ('regions', 'delete', 'regions.delete', 'Delete regions'),
  ('destinations', 'view', 'destinations.view', 'View destinations'),
  ('destinations', 'create', 'destinations.create', 'Create destinations'),
  ('destinations', 'update', 'destinations.update', 'Update destinations'),
  ('destinations', 'delete', 'destinations.delete', 'Delete destinations'),
  ('locations', 'view', 'locations.view', 'View locations'),
  ('locations', 'create', 'locations.create', 'Create locations'),
  ('locations', 'update', 'locations.update', 'Update locations'),
  ('locations', 'delete', 'locations.delete', 'Delete locations'),
  ('packages', 'view', 'packages.view', 'View packages'),
  ('packages', 'create', 'packages.create', 'Create packages'),
  ('packages', 'update', 'packages.update', 'Update packages'),
  ('packages', 'delete', 'packages.delete', 'Delete packages'),
  ('activities', 'view', 'activities.view', 'View activities'),
  ('activities', 'create', 'activities.create', 'Create activities'),
  ('activities', 'update', 'activities.update', 'Update activities'),
  ('activities', 'delete', 'activities.delete', 'Delete activities'),
  ('hotels', 'view', 'hotels.view', 'View hotels'),
  ('hotels', 'create', 'hotels.create', 'Create hotels'),
  ('hotels', 'update', 'hotels.update', 'Update hotels'),
  ('hotels', 'delete', 'hotels.delete', 'Delete hotels'),
  ('vehicles', 'view', 'vehicles.view', 'View vehicles'),
  ('vehicles', 'create', 'vehicles.create', 'Create vehicles'),
  ('vehicles', 'update', 'vehicles.update', 'Update vehicles'),
  ('vehicles', 'delete', 'vehicles.delete', 'Delete vehicles'),
  ('bookings', 'view', 'bookings.view', 'View bookings'),
  ('bookings', 'update', 'bookings.update', 'Update bookings'),
  ('media', 'view', 'media.view', 'View the media library'),
  ('media', 'create', 'media.create', 'Upload media assets'),
  ('media', 'update', 'media.update', 'Update media assets'),
  ('media', 'delete', 'media.delete', 'Delete media assets'),
  ('users', 'view', 'users.view', 'View portal users'),
  ('users', 'create', 'users.create', 'Create portal users'),
  ('users', 'update', 'users.update', 'Update portal users'),
  ('users', 'delete', 'users.delete', 'Delete portal users'),
  ('roles', 'view', 'roles.view', 'View roles'),
  ('roles', 'create', 'roles.create', 'Create roles'),
  ('roles', 'update', 'roles.update', 'Update roles and assignments'),
  ('roles', 'delete', 'roles.delete', 'Delete roles'),
  ('permissions', 'view', 'permissions.view', 'View permissions'),
  ('permissions', 'create', 'permissions.create', 'Create permissions'),
  ('permissions', 'update', 'permissions.update', 'Update permissions'),
  ('permissions', 'delete', 'permissions.delete', 'Delete permissions'),
  ('settings', 'manage', 'settings.manage', 'Manage portal settings')
on conflict (permission_key) do update
set module = excluded.module,
    action = excluded.action,
    description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.slug = 'super_admin'
on conflict (role_id, permission_id) do nothing;

create or replace function public.current_profile_role_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.role_id
  from public.profiles p
  where p.id = auth.uid()
    and p.status = 'active'
  limit 1
$$;

create or replace function public.has_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role_id = p.role_id
    join public.permissions permission on permission.id = rp.permission_id
    where p.id = auth.uid()
      and p.status = 'active'
      and permission.permission_key = required_permission
  )
$$;

revoke all on function public.current_profile_role_id() from public;
revoke all on function public.has_permission(text) from public;
grant execute on function public.current_profile_role_id() to authenticated;
grant execute on function public.has_permission(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.countries enable row level security;
alter table public.regions enable row level security;
alter table public.destinations enable row level security;
alter table public.locations enable row level security;
alter table public.media_assets enable row level security;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'profiles', 'roles', 'permissions', 'role_permissions',
        'countries', 'regions', 'destinations', 'locations', 'media_assets'
      ])
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  end loop;
end
$$;

drop policy if exists profiles_select_rbac on public.profiles;
create policy profiles_select_rbac on public.profiles for select to authenticated
using (id = auth.uid() or public.has_permission('users.view'));

-- Profile role/status changes are intentionally server-only. The guarded server
-- actions use the service-role client, preventing direct API role escalation.

drop policy if exists roles_select_rbac on public.roles;
create policy roles_select_rbac on public.roles for select to authenticated
using (
  id = public.current_profile_role_id()
  or public.has_permission('roles.view')
  or public.has_permission('roles.create')
  or public.has_permission('roles.update')
  or public.has_permission('users.create')
  or public.has_permission('users.update')
);

-- Role mutations are server-only so permission-subset validation cannot be
-- bypassed through the public Supabase REST API.

drop policy if exists permissions_select_rbac on public.permissions;
create policy permissions_select_rbac on public.permissions for select to authenticated
using (
  public.has_permission('permissions.view')
  or public.has_permission('permissions.create')
  or public.has_permission('permissions.update')
  or public.has_permission('roles.view')
  or public.has_permission('roles.create')
  or public.has_permission('roles.update')
);

-- Permission mutations are server-only for the same reason.

drop policy if exists role_permissions_select_rbac on public.role_permissions;
create policy role_permissions_select_rbac on public.role_permissions for select to authenticated
using (public.has_permission('roles.view') or public.has_permission('roles.create') or public.has_permission('roles.update'));

-- Role-permission mappings are also server-only.

drop policy if exists countries_select_rbac on public.countries;
create policy countries_select_rbac on public.countries for select to authenticated using (
  public.has_permission('countries.view')
  or public.has_permission('regions.create')
  or public.has_permission('regions.update')
);
drop policy if exists countries_insert_rbac on public.countries;
create policy countries_insert_rbac on public.countries for insert to authenticated with check (public.has_permission('countries.create'));
drop policy if exists countries_update_rbac on public.countries;
create policy countries_update_rbac on public.countries for update to authenticated using (public.has_permission('countries.update')) with check (public.has_permission('countries.update'));
drop policy if exists countries_delete_rbac on public.countries;
create policy countries_delete_rbac on public.countries for delete to authenticated using (public.has_permission('countries.delete'));

drop policy if exists regions_select_rbac on public.regions;
create policy regions_select_rbac on public.regions for select to authenticated using (
  public.has_permission('regions.view')
  or public.has_permission('destinations.create')
  or public.has_permission('destinations.update')
);
drop policy if exists regions_insert_rbac on public.regions;
create policy regions_insert_rbac on public.regions for insert to authenticated with check (public.has_permission('regions.create'));
drop policy if exists regions_update_rbac on public.regions;
create policy regions_update_rbac on public.regions for update to authenticated using (public.has_permission('regions.update')) with check (public.has_permission('regions.update'));
drop policy if exists regions_delete_rbac on public.regions;
create policy regions_delete_rbac on public.regions for delete to authenticated using (public.has_permission('regions.delete'));

drop policy if exists destinations_select_rbac on public.destinations;
create policy destinations_select_rbac on public.destinations for select to authenticated using (
  public.has_permission('destinations.view')
  or public.has_permission('locations.create')
  or public.has_permission('locations.update')
);
drop policy if exists destinations_insert_rbac on public.destinations;
create policy destinations_insert_rbac on public.destinations for insert to authenticated with check (public.has_permission('destinations.create'));
drop policy if exists destinations_update_rbac on public.destinations;
create policy destinations_update_rbac on public.destinations for update to authenticated using (public.has_permission('destinations.update')) with check (public.has_permission('destinations.update'));
drop policy if exists destinations_delete_rbac on public.destinations;
create policy destinations_delete_rbac on public.destinations for delete to authenticated using (public.has_permission('destinations.delete'));

drop policy if exists locations_select_rbac on public.locations;
create policy locations_select_rbac on public.locations for select to authenticated using (public.has_permission('locations.view'));
drop policy if exists locations_insert_rbac on public.locations;
create policy locations_insert_rbac on public.locations for insert to authenticated with check (public.has_permission('locations.create'));
drop policy if exists locations_update_rbac on public.locations;
create policy locations_update_rbac on public.locations for update to authenticated using (public.has_permission('locations.update')) with check (public.has_permission('locations.update'));
drop policy if exists locations_delete_rbac on public.locations;
create policy locations_delete_rbac on public.locations for delete to authenticated using (public.has_permission('locations.delete'));

drop policy if exists media_assets_select_rbac on public.media_assets;
create policy media_assets_select_rbac on public.media_assets for select to authenticated using (
  public.has_permission('media.view') or uploaded_by = auth.uid()
);
drop policy if exists media_assets_insert_rbac on public.media_assets;
create policy media_assets_insert_rbac on public.media_assets for insert to authenticated with check (public.has_permission('media.create') and uploaded_by = auth.uid());
drop policy if exists media_assets_update_rbac on public.media_assets;
create policy media_assets_update_rbac on public.media_assets for update to authenticated using (public.has_permission('media.update')) with check (public.has_permission('media.update'));
drop policy if exists media_assets_delete_rbac on public.media_assets;
create policy media_assets_delete_rbac on public.media_assets for delete to authenticated using (public.has_permission('media.delete'));

commit;
