-- Bundle deals: package tracks/products together at a discounted total price.
-- Run after 0005.

create table if not exists bundles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_url text,
  price numeric(10,2) not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references bundles(id) on delete cascade,
  item_type text not null check (item_type in ('track_license', 'product')),
  track_id uuid references tracks(id),
  product_id uuid references products(id),
  license text check (license in ('basic', 'premium', 'exclusive'))
);

alter table order_items
  add constraint order_items_bundle_id_fkey foreign key (bundle_id) references bundles(id);

alter table bundles enable row level security;
alter table bundle_items enable row level security;

create policy "bundles_public_read" on bundles for select using (is_published = true);
create policy "bundles_admin_write" on bundles for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "bundle_items_public_read" on bundle_items for select using (
  exists (select 1 from bundles b where b.id = bundle_items.bundle_id and b.is_published = true)
);
create policy "bundle_items_admin_write" on bundle_items for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
