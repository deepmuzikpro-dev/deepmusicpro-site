-- Public like counts (derived from the existing favorites table) + comments
-- on tracks. Run after 0006.

alter table tracks add column if not exists like_count integer not null default 0;

-- Keep tracks.like_count in sync with favorites automatically, so the
-- client can read a public count without exposing who favorited what
-- (favorites itself stays private/per-user via its existing RLS policies).
create or replace function sync_track_like_count()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update tracks set like_count = like_count + 1 where id = new.track_id;
  elsif (tg_op = 'DELETE') then
    update tracks set like_count = greatest(like_count - 1, 0) where id = old.track_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists favorites_sync_like_count on favorites;
create trigger favorites_sync_like_count
  after insert or delete on favorites
  for each row execute procedure sync_track_like_count();

-- Backfill existing favorites into the counter.
update tracks t
set like_count = coalesce((select count(*) from favorites f where f.track_id = t.id), 0);

-- Comments
create table if not exists track_comments (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references tracks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_track_comments_track on track_comments(track_id, created_at);

alter table track_comments enable row level security;

create policy "comments_public_read" on track_comments for select using (true);
create policy "comments_insert_own" on track_comments for insert with check (auth.uid() = user_id);
create policy "comments_delete_own_or_admin" on track_comments for delete using (
  auth.uid() = user_id
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
