-- Makes track genres admin-editable instead of a fixed list.
-- Run this after 0001_schema.sql.

create table if not exists genres (
  id uuid primary key default gen_random_uuid(),
  name text not null,                -- display name, e.g. "Type Beats"
  slug text not null unique,         -- url/db-safe key, e.g. "type_beat"
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into genres (name, slug, sort_order) values
  ('Drill', 'drill', 1),
  ('Type Beats', 'type_beat', 2),
  ('Lo-Fi', 'lofi', 3),
  ('Other', 'other', 4)
on conflict (slug) do nothing;

-- Drop the old fixed check constraint and point tracks.genre at the new table.
alter table tracks drop constraint if exists tracks_genre_check;

alter table tracks
  add constraint tracks_genre_fkey
  foreign key (genre) references genres(slug)
  on update cascade
  on delete restrict;

alter table genres enable row level security;

create policy "genres_public_read" on genres for select using (is_active = true);
create policy "genres_admin_write" on genres for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
