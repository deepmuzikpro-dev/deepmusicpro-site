-- Adds what the admin Users page needs: an email column on profiles (so the
-- client can list/search users without touching auth.users directly, which
-- RLS never exposes to the anon key) and a ban flag admins can toggle.
-- Run after 0001 and 0002.

alter table profiles add column if not exists email text;
alter table profiles add column if not exists is_banned boolean not null default false;

-- Backfill email for any accounts created before this column existed.
update profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- Keep email in sync going forward via the existing signup trigger.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- profiles_admin_all (from 0001) already lets admins select/update/delete
-- any profile, so role changes and bans need no new policy. Users still
-- can't grant themselves admin or unban themselves — profiles_update_own
-- (from 0001) only lets a user update their OWN row, and nothing stops a
-- non-admin editing their own role/is_banned client-side unless we lock it
-- down, so replace that policy with one that protects those two columns.
drop policy if exists "profiles_update_own" on profiles;

create policy "profiles_update_own" on profiles for update using (
  auth.uid() = id
) with check (
  auth.uid() = id
  and role = (select role from profiles where id = auth.uid())
  and is_banned = (select is_banned from profiles where id = auth.uid())
);
