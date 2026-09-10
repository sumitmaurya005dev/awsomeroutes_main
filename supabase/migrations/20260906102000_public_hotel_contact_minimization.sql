-- The public website can render a hotel's name, content, address and map, but
-- customers do not need supplier-direct phone numbers or email addresses.
-- Keep these fields available to RBAC-protected portal users only.
revoke select (phone, email) on public.hotels from anon;
