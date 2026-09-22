-- Favorites/liked tracks + a play-count increment users are allowed to call.
-- Run after 0004.

create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  track_id uuid not null references tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, track_id)
);

alter table favorites enable row level security;

create policy "favorites_select_own" on favorites for select using (auth.uid() = user_id);
create policy "favorites_insert_own" on favorites for insert with check (auth.uid() = user_id);
create policy "favorites_delete_own" on favorites for delete using (auth.uid() = user_id);
create policy "favorites_admin_all" on favorites for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Lets any client (signed in or not) bump a track's play count without
-- granting general write access to the tracks table.
create or replace function increment_play_count(p_track_id uuid)
returns void as $$
begin
  update tracks set play_count = play_count + 1 where id = p_track_id;
end;
$$ language plpgsql security definer;

grant execute on function increment_play_count(uuid) to anon, authenticated;
