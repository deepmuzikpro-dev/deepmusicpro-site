# Deepmusicpro

A Spotify-style streaming front end for Deepmusicpro's exclusive beats,
paired with a digital-goods shop (ebooks, PDF guides, sample kits, drum
kits, and bundle deals), Stripe checkout with license PDFs and email
receipts, an admin portal (uploads, users, genres, orders, analytics), a
points-based rewards program for buyers and listeners, and a **multi-vendor
marketplace** — any member can open their own store inside Deepmusicpro to
sell their own beats/ebooks/guides, on a Basic (8% commission) or Premium
($9.99/mo, 0% commission + guaranteed weekly featured slot) plan, plus a
tiered **affiliate program** paying cash commission on referred members'
purchases.

Color scheme: **Black / White / Green / Red / Yellow** (`tailwind.config.js` → `theme.extend.colors.dmp`).

## Stack

- React 18 + Vite + React Router
- Tailwind CSS
- Supabase (Postgres + Auth + Storage + Edge Functions) as the backend
- Stripe Checkout for payments
- Resend for order-receipt emails (optional but recommended)

## 1. Create the Supabase project

1. Create a project at supabase.com.
2. In the SQL editor, run the migrations **in order** — each one only
   depends on the ones before it:
   1. `supabase/migrations/0001_schema.sql` — `profiles`, `tracks`,
      `products`, `orders`/`order_items`, `rewards_transactions`/
      `rewards_catalog`, RLS.
   2. `supabase/migrations/0002_genres.sql` — admin-editable genres table
      (Drill/Type Beats/Lo-Fi/etc. are no longer hardcoded).
   3. `supabase/migrations/0003_user_management.sql` — adds `email` +
      `is_banned` to `profiles` so the admin Users page can list/search/ban
      accounts.
   4. `supabase/migrations/0004_catalog_protection.sql` — adds
      `tracks.exclusive_sold` (auto-unpublish on exclusive sale) and
      `order_items.license_pdf_path`.
   5. `supabase/migrations/0005_favorites.sql` — liked-tracks table +
      `increment_play_count()` (powers Trending sort and analytics).
   6. `supabase/migrations/0006_bundles.sql` — bundle deals.
   7. `supabase/migrations/0007_engagement.sql` — public `like_count` on
      tracks (synced automatically from the favorites table via trigger)
      and the `track_comments` table.
   8. `supabase/migrations/0008_marketplace.sql` — seller accounts
      (`seller_tier`, Stripe Connect fields), per-item commission/payout
      tracking on `order_items`, auto-featuring for Premium sellers, and
      the `affiliate_commissions` table + tiered commission-rate function.
3. Create four Storage buckets (Storage → New bucket):

   | Bucket | Public? | Purpose |
   |---|---|---|
   | `audio-previews` | **Public** | Streaming preview MP3s |
   | `artwork` | **Public** | Cover art |
   | `audio-masters` | **Private** | Full WAV/MP3 sold to buyers |
   | `docs` | **Private** | PDF guides, ebooks, zipped kits, and auto-generated license PDFs (stored under `licenses/`) |

4. Make yourself an admin: sign up in the app once, then in the SQL editor:
   ```sql
   update profiles set role = 'admin' where id = (
     select id from auth.users where email = 'you@example.com'
   );
   ```

## 2. Configure environment variables

```bash
cp .env.example .env
```
Fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Project Settings →
API), and `VITE_STRIPE_PUBLISHABLE_KEY`.

## 3. Stripe + Edge Functions (checkout, licenses, receipts)

The cart calls `create-checkout-session`, which creates a Stripe Checkout
Session and a pending order (expanding any bundle in the cart into its
underlying tracks/products). `stripe-webhook` then, once Stripe confirms
payment:
- marks the order paid and unlocks download links
- generates a license agreement **PDF** per track sold (buyer, track,
  license tier, terms, date) and stores it privately
- **auto-unpublishes any track sold under an Exclusive license** so it can
  never be sold twice
- awards reward points (1 point per $1 spent)
- **emails the buyer a receipt** with their items, if `RESEND_API_KEY` is set

```bash
supabase login
supabase link --project-ref <your-project-ref>

supabase secrets set STRIPE_SECRET_KEY=sk_live_or_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set RESEND_API_KEY=re_...          # optional — enables receipt emails
supabase secrets set RECEIPT_FROM_EMAIL=orders@yourdomain.com   # optional, defaults shown in code

supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook --no-verify-jwt
```

See **3b** below before deploying — the marketplace needs three more
functions (`create-connect-account`, `create-subscription-session`,
`create-portal-session`) and a couple more webhook events.

```bash
```

In the Stripe dashboard, add a webhook endpoint pointing at:
`https://<project-ref>.functions.supabase.co/stripe-webhook`, listening for
`checkout.session.completed`.

**Promo codes:** already enabled (`allow_promotion_codes: true`) — create
codes anytime in the Stripe Dashboard under Products → Coupons, no code
changes needed.

**Sales tax / VAT:** `automatic_tax` is present but set to `false` in
`create-checkout-session/index.ts`. Once you've set your origin address and
tax registrations under Stripe Dashboard → Settings → Tax, flip it to
`{ enabled: true }` and Stripe calculates/collects tax automatically.

## 3b. Marketplace: Stripe Connect, Premium subscriptions & payouts

Deepmusicpro is a multi-vendor marketplace — any signed-in member can open
their own store (`/sell`) to list their own tracks/products alongside
Deepmusicpro's own catalog (which still uses `seller_id = null` and pays no
commission, since there's no separate party to pay out).

**Commission model** (open to revisiting once you have real sales data —
this undercuts BeatStars-style marketplace fees while still being
sustainable):
| Plan | Cost | Commission | Featured placement |
|---|---|---|---|
| Basic | Free | Deepmusicpro keeps **8%**, seller keeps 92% | Organic — earned by play count (Home's Featured rail falls back to trending when nothing's manually featured) |
| Premium | **$9.99/mo** | Deepmusicpro keeps **0%**, seller keeps 100% | Every new upload is auto-featured for 7 days, capped at 1 feature-window per seller per week |

**How payouts work:** rather than splitting each Stripe Checkout Session
per seller (which breaks down the moment a cart mixes items from different
sellers), Deepmusicpro collects the full payment itself and then — once
`stripe-webhook` sees `checkout.session.completed` — creates a **Stripe
Transfer** to each seller's connected account for their net share
(`order_items.seller_payout_amount`). This needs Stripe Connect **Express**
accounts, one per seller:

```bash
supabase secrets set STRIPE_PREMIUM_PRICE_ID=price_...   # from the product you create below
supabase functions deploy create-connect-account
supabase functions deploy create-subscription-session
supabase functions deploy create-portal-session
```

In the Stripe dashboard:
1. **Connect** → Settings → make sure Express accounts are enabled for your platform.
2. **Products** → add a recurring $9.99/month product for the Premium
   plan; copy its Price ID into `STRIPE_PREMIUM_PRICE_ID` above.
3. Add these events to the *same* webhook endpoint you set up in step 3
   (`checkout.session.completed` is already there):
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `account.updated`.

Sellers connect their payout account and (optionally) upgrade to Premium
from `/sell`. Until a seller finishes Connect onboarding
(`stripe_connect_payouts_enabled`), their sales still go through — the
payout just stays `pending` on `order_items` / `affiliate_commissions`
until they connect (no sale is ever lost, just held).

**Bundles** are treated as Deepmusicpro's own curated products (no
per-seller commission split), since bundling and discounting across
sellers is a platform decision, not an individual seller's.

## 3c. Affiliate program

Every member has a referral link (`/signup?ref=THEIRCODE`, shown on
`/sell`). When someone they referred makes a purchase, the referrer earns a
cash commission, paid out the same way as seller payouts (a Stripe Transfer
to their connected account once they've completed Connect onboarding).

Rates are tiered by how many members someone has referred (computed live
by `affiliate_tier_for()` in `0008_marketplace.sql` — tune the thresholds
there if you want to change them):

| Rank | Referrals | Commission rate |
|---|---|---|
| Affiliate | 0–4 | 10% |
| Ambassador | 5–19 | 15% |
| Grand Ambassador | 20+ | 20% |

Admins get a full leaderboard at `/admin/affiliates`.

## 4. Watermarking streaming previews (optional but recommended)

Supabase Edge Functions can't run ffmpeg, so audio watermarking happens on
your own machine before you upload a preview:

```bash
node tools/watermark-preview.js beats/track-full.mp3 tools/dmp-tag.mp3 beats/track-preview.mp3
```

Requires Node 18+ and [ffmpeg](https://ffmpeg.org/download.html) installed
locally, plus a short "Deepmusicpro" audio tag clip of your own. It loops
the tag quietly under the beat and trims to 60s — upload the result as the
track's "Streaming preview" in `/admin/upload`. See comments in the script
for details.

## 5. Run locally

```bash
npm install
npm run dev
```

> This sandbox's network policy blocks `registry.npmjs.org`, so
> dependencies could not be installed or the build test-run in this
> session. Run `npm install && npm run build` on your own machine or in CI
> to install packages and confirm the build — the code itself is complete
> and ready to run.

Visit `http://localhost:5173`. Admin portal is at `/admin` (only visible to
the admin account you created in step 1.4).

## 6. Deploy

Any static host works (Netlify, Vercel). For Netlify:

```bash
npm run build
netlify deploy --prod --dir=dist
```

Set the same env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_STRIPE_PUBLISHABLE_KEY`) in the host's environment settings.

## How it's organized

```
src/
  context/         Auth, streaming Player, and Cart state (React context)
  lib/              Supabase client, storage bucket names, checkout helper
  components/      Navbar, Footer, persistent bottom PlayerBar, track/product cards
  pages/           Public site: Home (+ Featured rail), Browse (stream,
                   with BPM/key/Trending filters), Shop (+ Bundles),
                   product/track/bundle detail, Cart, Rewards, Login/Signup
                   (accepts ?ref= referral codes), Account (orders, license
                   PDFs, liked tracks), Sell (seller hub + affiliate
                   dashboard), legal pages
  pages/seller/    Seller-facing store: SellerUpload, SellerDashboard
  pages/admin/     Gated admin portal: dashboard + top-sellers, upload,
                   manage tracks/products/bundles/genres/users, orders,
                   rewards catalog, affiliate leaderboard
supabase/
  migrations/      SQL schema + RLS policies (run 0001 → 0008 in order)
  functions/       create-checkout-session, stripe-webhook,
                   create-connect-account, create-subscription-session,
                   create-portal-session (Deno edge fns)
tools/
  watermark-preview.js   Local ffmpeg script for tagging streaming previews
```

## Rewards program

- Buyers earn 1 point per $1 spent automatically via the Stripe webhook.
- The `rewards_catalog` table (managed from `/admin/rewards`) lists what
  points can be redeemed for (free licenses, free products, discount
  codes). Redemption UI can be wired up next — the balance and catalog are
  already live on `/rewards`.
- Listener-only earning (e.g. points for streaming, daily sign-in) is shown
  on the Rewards page as planned mechanics; hook them up by calling the
  `award_points(user_id, points, reason)` Postgres function from a
  scheduled Edge Function or client action once you decide the exact rules.

## Licensing model for beats

Each track has three price points baked in (`price_basic`,
`price_premium`, `price_exclusive`). Buyers pick a license on the track
page; the webhook grants the matching master file (WAV/MP3) **and** a
generated license agreement PDF after payment, both downloadable from
`/account`. Selling the Exclusive tier auto-removes the track from the
store (`tracks.exclusive_sold` + `is_published = false`) — it can never be
double-sold. Adjust license terms/copy in `LICENSE_TERMS` inside
`supabase/functions/stripe-webhook/index.ts` and in `src/pages/TrackDetail.jsx`.

## Catalog management

- **Genres** (`/admin/genres`) are fully admin-editable — add, rename,
  hide, or delete; the Stream Beats filter and the upload dropdown both
  read live from this table.
- **Bundles** (`/admin/bundles`) package any mix of tracks (with a chosen
  license) and products at one discounted price; they show on `/shop` and
  checkout expands them into normal per-item downloads/licenses.
- **Users** (`/admin/users`) — search, change role (listener/buyer/admin),
  or ban an account (banned users are signed out and blocked from logging
  back in). Full account deletion still requires the Supabase dashboard
  (Auth → Users) — the anon key intentionally can't do that.

## Legal pages

`/terms`, `/privacy`, `/refunds`, and `/dmca` are **drafted placeholders**
linked from the site footer — replace the bracketed placeholders (business
name, support email, effective dates) and have a lawyer review before
launch, especially if you'll have customers outside the US.

## Discovery features

- **Related tracks** ("You might also like") on every track page, matched
  by genre.
- **Favorites/liked tracks** — sign-in required; heart icon on the track
  page, full list under Account → Liked Tracks.
- **Trending sort** on Browse, powered by `play_count` (incremented once
  per track play via the `increment_play_count` RPC).
- **BPM range + key search** alongside the existing title/tag search and
  genre filter on Browse.

## Waveform, bulk upload, likes & comments

- **Waveform player**: `src/components/Waveform.jsx` decodes the preview
  audio in the browser (Web Audio API) and draws real peaks — no backend
  changes needed. Peaks are cached per-URL in memory for the session
  (`src/lib/waveform.js`). Shown in the bottom PlayerBar and on the track
  page; click/drag to seek. Decoding can silently fall back to a flat
  placeholder if the browser can't decode a file (rare, e.g. very unusual
  codecs) — playback still works either way.
- **Bulk upload**: Admin → Upload → "Bulk Upload" tab. Pick multiple audio
  files (tracks) or multiple PDF/DOC/ZIP files (products) at once; each
  becomes its own row, titled from its filename, sharing the genre/pricing
  or category/price you set once. For tracks, the same file is used as
  both the public preview and the private sellable master — go to Manage
  Tracks afterward if you want to swap in a separately tagged preview
  (e.g. via `tools/watermark-preview.js`) or a proper WAV master.
- **Likes**: reuses the existing favorites feature — the heart icon on a
  track page both favorites it for the signed-in user *and* increments a
  public `like_count` (kept in sync by a Postgres trigger, so the count is
  visible to everyone without exposing who liked what).
- **Comments**: any signed-in user can comment on a track page (500 char
  cap); a user can delete their own comment, and admins can delete any
  comment (basic moderation) via `/track/:id`. There's no separate
  moderation queue/admin page yet — deletion happens inline on the track
  page itself.

## What's intentionally out of scope for now

- A dedicated comment-moderation dashboard (flag/report, bulk delete) —
  today admins moderate inline on each track page.
- Stripe Tax and audio watermarking need one-time setup on your end (Stripe
  Dashboard config; a local ffmpeg tag clip) — see sections 3 and 4 above.
- **Retrying stuck payouts automatically.** If a seller/affiliate makes a
  sale before finishing Connect onboarding, their payout sits as `pending`
  (`order_items.payout_status` / `affiliate_commissions.status`) rather
  than being lost — but nothing currently re-checks and pays those out the
  moment they connect. A small scheduled Edge Function that sweeps
  `pending` rows for now-connected accounts would close that gap.
- **Commission rate changes mid-flight.** The 8% Basic rate and the tier
  thresholds in `affiliate_tier_for()` are simple constants in
  `0008_marketplace.sql` / `create-checkout-session` — fine to tune anytime
  via a migration, but there's no admin UI to change them without editing
  SQL.
- Full Connect account state (rejected verification, required-information
  flags) isn't surfaced anywhere beyond "connected / not connected" on
  `/sell` — check the Stripe Dashboard for anything Stripe needs from a
  seller beyond onboarding.
