-- Deepmusicpro marketplace: seller accounts, tiered commission, Stripe
-- Connect payouts, Premium subscriptions, tiered-featured placement, and
-- the affiliate/referral program.
--
-- Commission model:
--   Basic sellers (free)   -> Deepmusicpro keeps 8% at checkout, seller gets 92%
--   Premium sellers ($9.99/mo) -> Deepmusicpro keeps 0%, seller gets 100%,
--     and every new upload is auto-featured for 7 days (max 1 per week/user)
-- Payouts use Stripe Connect "separate charges and transfers": the platform
-- collects the full payment, then stripe-webhook creates a Stripe Transfer
-- to the seller's connected account for their net share. This keeps a
-- single Checkout Session working even when a cart mixes items from
-- several different sellers.

-- ============================================================
-- PROFILES: seller + subscription + affiliate fields
-- ============================================================
alter table profiles add column if not exists seller_tier text not null default 'basic'
  check (seller_tier in ('basic', 'premium'));
alter table profiles add column if not exists stripe_connect_account_id text;
alter table profiles add column if not exists stripe_connect_payouts_enabled boolean not null default false;
alter table profiles add column if not exists stripe_customer_id text;
alter table profiles add column if not exists stripe_subscription_id text;
alter table profiles add column if not exists subscription_status text; -- active | past_due | canceled | null
alter table profiles add column if not exists last_auto_featured_at timestamptz;
alter table profiles add column if not exists referral_code text unique;
alter table profiles add column if not exists referred_by uuid references profiles(id);

-- Short, unique referral codes (e.g. "GORDO4F2A") generated for every
-- existing and future profile.
create or replace function generate_referral_code()
returns text as $$
declare
  code text;
begin
  loop
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from profiles where referral_code = code);
  end loop;
  return code;
end;
$$ language plpgsql;

update profiles set referral_code = generate_referral_code() where referral_code is null;

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email, referral_code, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    generate_referral_code(),
    (select id from profiles where referral_code = upper(new.raw_user_meta_data->>'ref_code'))
  );
  return new;
end;
$$ language plpgsql security definer;
-- (re-uses the existing on_auth_user_created trigger from 0001/0003)

-- ============================================================
-- TRACKS / PRODUCTS: seller ownership + featured placement
-- ============================================================
alter table tracks add column if not exists seller_id uuid references profiles(id);
alter table tracks add column if not exists is_featured boolean not null default false;
alter table tracks add column if not exists featured_until timestamptz;

alter table products add column if not exists seller_id uuid references profiles(id);
alter table products add column if not exists is_featured boolean not null default false;
alter table products add column if not exists featured_until timestamptz;

create index if not exists idx_tracks_seller on tracks(seller_id);
create index if not exists idx_products_seller on products(seller_id);
create index if not exists idx_tracks_featured on tracks(is_featured, featured_until);
create index if not exists idx_products_featured on products(is_featured, featured_until);

-- Premium sellers: auto-feature a new upload for 7 days, capped at one
-- newly-*started* featured window per seller per rolling 7 days. Basic
-- sellers (and Deepmusicpro's own catalog, seller_id null) are never
-- auto-featured here — their visibility in the "Featured" rail instead
-- comes from an ORDER BY play_count query in the app (organic, no flag
-- needed), which naturally excludes tracks < a play threshold.
create or replace function auto_feature_premium_upload()
returns trigger as $$
declare
  seller_tier_val text;
  last_featured timestamptz;
begin
  if new.seller_id is null then
    return new;
  end if;

  select seller_tier, last_auto_featured_at into seller_tier_val, last_featured
  from profiles where id = new.seller_id;

  if seller_tier_val = 'premium' and (last_featured is null or last_featured < now() - interval '7 days') then
    new.is_featured := true;
    new.featured_until := now() + interval '7 days';
    update profiles set last_auto_featured_at = now() where id = new.seller_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_tracks_auto_feature on tracks;
create trigger trg_tracks_auto_feature
  before insert on tracks
  for each row execute procedure auto_feature_premium_upload();

drop trigger if exists trg_products_auto_feature on products;
create trigger trg_products_auto_feature
  before insert on products
  for each row execute procedure auto_feature_premium_upload();

-- ============================================================
-- ORDER ITEMS: per-item commission + payout tracking
-- ============================================================
alter table order_items add column if not exists seller_id uuid references profiles(id);
alter table order_items add column if not exists commission_rate numeric(5,4) not null default 0; -- e.g. 0.0800 = 8%
alter table order_items add column if not exists platform_fee_amount numeric(10,2) not null default 0;
alter table order_items add column if not exists seller_payout_amount numeric(10,2) not null default 0;
alter table order_items add column if not exists stripe_transfer_id text;
alter table order_items add column if not exists payout_status text not null default 'n/a'
  check (payout_status in ('n/a', 'pending', 'paid', 'failed'));
-- n/a = platform-owned item (seller_id is null), nothing to transfer

create index if not exists idx_order_items_seller on order_items(seller_id);

-- ============================================================
-- AFFILIATE / REFERRAL PROGRAM
-- ============================================================
-- Tier is derived live from how many people someone has referred (see
-- affiliate_tier_for below) rather than stored, so thresholds can change
-- without a backfill.
--   affiliate        (0-4 referred signups)  -> 10% of referred purchases
--   ambassador        (5-19 referred signups)  -> 15%
--   grand_ambassador (20+ referred signups)   -> 20%
create or replace function affiliate_tier_for(p_user_id uuid)
returns table(tier text, rate numeric, referral_count integer) as $$
declare
  cnt integer;
begin
  select count(*) into cnt from profiles where referred_by = p_user_id;
  if cnt >= 20 then
    return query select 'grand_ambassador', 0.20::numeric, cnt;
  elsif cnt >= 5 then
    return query select 'ambassador', 0.15::numeric, cnt;
  else
    return query select 'affiliate', 0.10::numeric, cnt;
  end if;
end;
$$ language plpgsql stable;

create table if not exists affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles(id) on delete cascade,
  referred_user_id uuid not null references profiles(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  order_amount numeric(10,2) not null,
  commission_rate numeric(5,4) not null,
  commission_amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  stripe_transfer_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_affiliate_commissions_referrer on affiliate_commissions(referrer_id);
create index if not exists idx_affiliate_commissions_order on affiliate_commissions(order_id);

-- ============================================================
-- RLS
-- ============================================================
alter table affiliate_commissions enable row level security;

create policy "affiliate_commissions_select_own" on affiliate_commissions for select using (
  auth.uid() = referrer_id
);
create policy "affiliate_commissions_admin_all" on affiliate_commissions for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Sellers can create/manage their own catalog rows (seller_id must be
-- themselves); admins keep full access via the existing *_admin_write
-- policies from 0001. Everyone can still read published rows.
create policy "tracks_seller_write" on tracks for all using (
  auth.uid() = seller_id
) with check (
  auth.uid() = seller_id
);
create policy "products_seller_write" on products for all using (
  auth.uid() = seller_id
) with check (
  auth.uid() = seller_id
);

-- Sellers can see order_items where they're the seller (their sales/earnings).
create policy "order_items_select_seller" on order_items for select using (
  auth.uid() = seller_id
);

comment on function affiliate_tier_for is
  'Live-computed affiliate rank + commission rate from referral count. Thresholds: 0-4 affiliate/10%, 5-19 ambassador/15%, 20+ grand_ambassador/20%.';
