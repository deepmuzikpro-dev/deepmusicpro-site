-- Deepmusicpro schema: streaming catalog + digital-goods store + rewards program
-- Run in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES  (1:1 with auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'listener' check (role in ('listener', 'buyer', 'admin')),
  points_balance integer not null default 0,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- TRACKS  (streaming catalog — beats, type beats, lo-fi)
-- ============================================================
create table if not exists tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null default 'Deepmusicpro',
  genre text not null default 'drill' check (genre in ('drill', 'type_beat', 'lofi', 'other')),
  bpm integer,
  key text,
  cover_url text,
  preview_url text not null,       -- public streaming preview (audio-previews bucket)
  master_wav_path text,            -- private full WAV (audio-masters bucket, storage path)
  master_mp3_path text,            -- private full MP3 (audio-masters bucket, storage path)
  tags text[] default '{}',
  play_count integer not null default 0,
  is_published boolean not null default true,
  price_basic numeric(10,2) not null default 29.99,
  price_premium numeric(10,2) not null default 59.99,
  price_exclusive numeric(10,2) not null default 299.99,
  created_at timestamptz not null default now()
);

create index if not exists idx_tracks_genre on tracks(genre);
create index if not exists idx_tracks_published on tracks(is_published);

-- ============================================================
-- PRODUCTS  (ebooks, pdf guides, sample kits, drum kits)
-- ============================================================
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null check (category in ('ebook', 'pdf_guide', 'sample_kit', 'drum_kit')),
  cover_url text,
  price numeric(10,2) not null,
  file_path text not null,        -- private file in docs bucket (pdf/doc/zip)
  preview_audio_url text,         -- optional demo audio for kits (audio-previews bucket)
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_category on products(category);

-- ============================================================
-- ORDERS / ORDER ITEMS
-- ============================================================
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  email text not null,
  stripe_session_id text unique,
  stripe_payment_intent text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  subtotal numeric(10,2) not null default 0,
  points_earned integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  item_type text not null check (item_type in ('track_license', 'product')),
  track_id uuid references tracks(id),
  product_id uuid references products(id),
  license text check (license in ('basic', 'premium', 'exclusive')),
  title text not null,
  unit_price numeric(10,2) not null,
  download_path text            -- resolved storage path granted after payment
);

create index if not exists idx_order_items_order on order_items(order_id);

-- ============================================================
-- REWARDS PROGRAM (for buyers AND listeners)
-- ============================================================
create table if not exists rewards_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  points integer not null,               -- positive = earned, negative = redeemed
  reason text not null,                  -- e.g. 'purchase', 'daily_listen', 'redeem:free_download'
  order_id uuid references orders(id),
  created_at timestamptz not null default now()
);

create table if not exists rewards_catalog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cost_points integer not null,
  reward_type text not null check (reward_type in ('free_track_license', 'free_product', 'discount_code')),
  linked_track_id uuid references tracks(id),
  linked_product_id uuid references products(id),
  discount_percent integer,
  is_active boolean not null default true
);

-- Award points helper (call from edge functions / triggers)
create or replace function award_points(p_user_id uuid, p_points integer, p_reason text, p_order_id uuid default null)
returns void as $$
begin
  insert into rewards_transactions (user_id, points, reason, order_id)
  values (p_user_id, p_points, p_reason, p_order_id);

  update profiles set points_balance = points_balance + p_points where id = p_user_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table tracks enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table rewards_transactions enable row level security;
alter table rewards_catalog enable row level security;

-- profiles: user sees/edits their own row; admins see all
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_admin_all" on profiles for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- tracks/products: public can read published rows; only admins write
create policy "tracks_public_read" on tracks for select using (is_published = true);
create policy "tracks_admin_write" on tracks for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "products_public_read" on products for select using (is_published = true);
create policy "products_admin_write" on products for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- orders: user sees own orders; admins see all; inserts happen via service role (edge functions)
create policy "orders_select_own" on orders for select using (auth.uid() = user_id);
create policy "orders_admin_all" on orders for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "order_items_select_own" on order_items for select using (
  exists (select 1 from orders o where o.id = order_items.order_id and o.user_id = auth.uid())
);
create policy "order_items_admin_all" on order_items for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- rewards
create policy "rewards_tx_select_own" on rewards_transactions for select using (auth.uid() = user_id);
create policy "rewards_tx_admin_all" on rewards_transactions for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "rewards_catalog_public_read" on rewards_catalog for select using (is_active = true);
create policy "rewards_catalog_admin_write" on rewards_catalog for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ============================================================
-- Convenience view: leaderboard-free, just totals for the rewards page
-- ============================================================
create or replace view my_rewards as
select p.id as user_id, p.points_balance, p.display_name
from profiles p
where p.id = auth.uid();
