// Supabase Edge Function: create-checkout-session
// Builds a Stripe Checkout Session from the cart the client sends, and
// records a pending order (+ order_items) so the webhook can reconcile it
// on payment. Bundle cart items are expanded into their underlying
// track/product order_items here, so the webhook's existing per-item
// download/license logic handles them with no special-casing.
//
// Deploy: supabase functions deploy create-checkout-session
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_... SUPABASE_SERVICE_ROLE_KEY=...

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@16?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function expandBundle(bundleId: string, bundlePrice: number) {
  const { data: bundle } = await supabaseAdmin
    .from('bundles')
    .select('*, bundle_items(*, tracks(title, seller_id), products(title, seller_id))')
    .eq('id', bundleId)
    .single()
  if (!bundle) return []

  return bundle.bundle_items.map((sub: any, idx: number) => ({
    item_type: sub.item_type,
    track_id: sub.item_type === 'track_license' ? sub.track_id : null,
    product_id: sub.item_type === 'product' ? sub.product_id : null,
    license: sub.license || null,
    bundle_id: bundleId,
    // Bundles mix items from potentially different sellers; a bundle is
    // treated as a platform (Deepmusicpro-curated) sale — no per-item
    // commission split — since it's Deepmusicpro doing the packaging and
    // discounting, not an individual seller's storefront.
    seller_id: null,
    title: sub.item_type === 'track_license'
      ? `${bundle.title}: ${sub.tracks?.title || 'track'} — ${sub.license} license`
      : `${bundle.title}: ${sub.products?.title || 'item'}`,
    // Only the first sub-item carries the price so the order subtotal
    // matches what was actually charged; the rest are $0 line items that
    // still resolve their own download separately.
    unit_price: idx === 0 ? bundlePrice : 0,
  }))
}

// Looks up the seller (and their current commission rate) for a single
// track/product cart item. Deepmusicpro's own catalog has seller_id = null
// and pays no commission (there's no one to pay out to).
async function resolveSeller(type: string, id: string) {
  const table = type === 'track_license' ? 'tracks' : 'products'
  const { data } = await supabaseAdmin.from(table).select('seller_id').eq('id', id).single()
  const sellerId = data?.seller_id || null
  if (!sellerId) return { sellerId: null, commissionRate: 0 }

  const { data: seller } = await supabaseAdmin
    .from('profiles')
    .select('seller_tier')
    .eq('id', sellerId)
    .single()
  const commissionRate = seller?.seller_tier === 'premium' ? 0 : 0.08 // Basic sellers: 8% platform fee
  return { sellerId, commissionRate }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const { items, email, userId, successUrl, cancelUrl } = await req.json()
    // items: [{ type: 'track_license'|'product'|'bundle', id, license?, title, price }]

    if (!items?.length) {
      return new Response(JSON.stringify({ error: 'Cart is empty' }), {
        status: 400,
        headers: CORS_HEADERS,
      })
    }

    const subtotal = items.reduce((s: number, i: any) => s + Number(i.price), 0)

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({ user_id: userId || null, email, subtotal, status: 'pending' })
      .select()
      .single()
    if (orderErr) throw orderErr

    const orderItemsPayload: any[] = []
    for (const i of items) {
      if (i.type === 'bundle') {
        const expanded = await expandBundle(i.id, Number(i.price))
        orderItemsPayload.push(...expanded.map((e: any) => ({ ...e, order_id: order.id })))
      } else {
        const { sellerId, commissionRate } = await resolveSeller(i.type, i.id)
        const platformFee = sellerId ? Math.round(Number(i.price) * commissionRate * 100) / 100 : 0
        orderItemsPayload.push({
          order_id: order.id,
          item_type: i.type,
          track_id: i.type === 'track_license' ? i.id : null,
          product_id: i.type === 'product' ? i.id : null,
          license: i.license || null,
          title: i.title,
          unit_price: i.price,
          seller_id: sellerId,
          commission_rate: commissionRate,
          platform_fee_amount: platformFee,
          seller_payout_amount: sellerId ? Math.round((Number(i.price) - platformFee) * 100) / 100 : 0,
          payout_status: sellerId ? 'pending' : 'n/a',
        })
      }
    }
    const { error: itemsErr } = await supabaseAdmin.from('order_items').insert(orderItemsPayload)
    if (itemsErr) throw itemsErr

    // Stripe line items mirror the cart as the shopper saw it (one line per
    // cart entry, bundle included as a single discounted line) — not the
    // expanded order_items above.
    const line_items = items.map((i: any) => ({
      price_data: {
        currency: 'usd',
        product_data: { name: i.title },
        unit_amount: Math.round(Number(i.price) * 100),
      },
      quantity: 1,
    }))

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { order_id: order.id },
      // Lets buyers enter a coupon/promo code you create in the Stripe
      // Dashboard (Products → Coupons) at checkout.
      allow_promotion_codes: true,
      // Turn on once you've set your origin address and tax registrations
      // under Stripe Dashboard → Settings → Tax — Stripe then calculates
      // and collects the right sales tax/VAT automatically per order.
      automatic_tax: { enabled: false },
    })

    await supabaseAdmin
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id)

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: CORS_HEADERS,
    })
  }
})
