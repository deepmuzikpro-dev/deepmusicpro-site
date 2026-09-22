// Supabase Edge Function: stripe-webhook
// Handles checkout.session.completed:
//   1. marks the order paid
//   2. resolves the private download path for each item
//   3. for track licenses: generates a license agreement PDF, and if the
//      license is "exclusive", auto-unpublishes the track (catalog protection)
//   4. awards reward points (1 point per $1 spent)
//   5. emails the buyer a receipt with their download links (via Resend)
//
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... RESEND_API_KEY=re_...
// Stripe dashboard: point the webhook endpoint at
//   https://<project-ref>.functions.supabase.co/stripe-webhook

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@16?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const resendApiKey = Deno.env.get('RESEND_API_KEY') // optional — receipts are skipped if unset
const fromEmail = Deno.env.get('RECEIPT_FROM_EMAIL') || 'orders@deepmusicpro.com'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const POINTS_PER_DOLLAR = 1

const LICENSE_TERMS: Record<string, string> = {
  basic: 'Non-exclusive license. MP3 delivery, tagged. May be used in one commercial music release (streaming, downloads, live performance). No resale or redistribution of the beat itself. Producer retains ownership and may license this beat to other artists.',
  premium: 'Non-exclusive license. WAV + MP3 delivery, untagged. May be used in one commercial music release across all platforms, including monetized video. No resale or redistribution of the beat itself. Producer retains ownership and may license this beat to other artists.',
  exclusive: 'Exclusive rights license. Full ownership transfer of this instrumental. The beat is permanently removed from the Deepmusicpro store upon purchase and will not be licensed to any other artist. Unlimited commercial use.',
}

async function generateLicensePdf(opts: {
  buyerEmail: string
  trackTitle: string
  license: string
  orderId: string
  purchaseDate: string
}) {
  const doc = await PDFDocument.create()
  const page = doc.addPage([612, 792]) // US letter
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const green = rgb(0.114, 0.725, 0.329)
  let y = 730

  page.drawText('DEEPMUSICPRO', { x: 50, y, size: 22, font: bold, color: green })
  y -= 20
  page.drawText('Beat License Agreement', { x: 50, y, size: 13, font })
  y -= 40

  const lines: [string, string][] = [
    ['Order ID', opts.orderId],
    ['Purchase date', opts.purchaseDate],
    ['Licensee (buyer)', opts.buyerEmail],
    ['Track', opts.trackTitle],
    ['License tier', opts.license.toUpperCase()],
  ]
  for (const [label, value] of lines) {
    page.drawText(`${label}:`, { x: 50, y, size: 11, font: bold })
    page.drawText(value, { x: 200, y, size: 11, font })
    y -= 24
  }

  y -= 16
  page.drawText('Terms', { x: 50, y, size: 12, font: bold })
  y -= 20
  const terms = LICENSE_TERMS[opts.license] || LICENSE_TERMS.basic
  const maxWidth = 500
  const words = terms.split(' ')
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(test, 10.5) > maxWidth) {
      page.drawText(line, { x: 50, y, size: 10.5, font })
      y -= 16
      line = word
    } else {
      line = test
    }
  }
  if (line) page.drawText(line, { x: 50, y, size: 10.5, font })

  y -= 50
  page.drawText('This document is auto-generated at time of purchase and serves as proof of license.', {
    x: 50, y, size: 9, font, color: rgb(0.5, 0.5, 0.5),
  })

  return await doc.save()
}

async function sendReceiptEmail(to: string, order: any, downloadLinks: { title: string; url: string | null }[]) {
  if (!resendApiKey) return
  const itemsHtml = downloadLinks
    .map((d) => `<li>${d.title}${d.url ? ` — <a href="${d.url}">Download</a>` : ''}</li>`)
    .join('')
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject: 'Your Deepmusicpro order is ready',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#1db954">Thanks for your order!</h2>
          <p>Order total: $${Number(order.subtotal).toFixed(2)}</p>
          <ul>${itemsHtml}</ul>
          <p>You can also find every download and license PDF anytime in
          your <a href="https://deepmusicpro.com/account">Deepmusicpro account</a>.</p>
        </div>
      `,
    }),
  }).catch((err) => console.error('Resend email failed:', err))
}

const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*' }

// Pays each seller their net share (price minus the platform's commission)
// via a Stripe Transfer to their connected Express account. The platform
// already collected the full charge, so this is "separate charges and
// transfers" — it lets one Checkout Session cover a cart with items from
// several different sellers, which a per-session destination charge can't.
async function payOutSellers(order: any) {
  for (const item of order.order_items) {
    if (!item.seller_id || item.payout_status !== 'pending' || Number(item.seller_payout_amount) <= 0) continue

    const { data: seller } = await supabaseAdmin
      .from('profiles')
      .select('stripe_connect_account_id, stripe_connect_payouts_enabled')
      .eq('id', item.seller_id)
      .single()

    if (!seller?.stripe_connect_account_id || !seller.stripe_connect_payouts_enabled) {
      // Seller hasn't finished Connect onboarding yet — leave payout_status
      // as 'pending' so it can be reconciled manually (or by a follow-up
      // job) once they do. Nothing is lost; it's just held.
      continue
    }

    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(Number(item.seller_payout_amount) * 100),
        currency: 'usd',
        destination: seller.stripe_connect_account_id,
        transfer_group: order.id,
        metadata: { order_id: order.id, order_item_id: item.id },
      })
      await supabaseAdmin
        .from('order_items')
        .update({ payout_status: 'paid', stripe_transfer_id: transfer.id })
        .eq('id', item.id)
    } catch (err) {
      console.error('Seller transfer failed:', err.message)
      await supabaseAdmin.from('order_items').update({ payout_status: 'failed' }).eq('id', item.id)
    }
  }
}

// If the buyer was referred by another member, credits that member a
// commission (at their current affiliate tier rate) on this purchase, and
// pays it out immediately if they've completed Connect onboarding.
async function payAffiliateCommission(order: any) {
  if (!order.user_id) return

  const { data: buyer } = await supabaseAdmin
    .from('profiles')
    .select('referred_by')
    .eq('id', order.user_id)
    .single()
  if (!buyer?.referred_by) return

  const { data: tierRows } = await supabaseAdmin.rpc('affiliate_tier_for', { p_user_id: buyer.referred_by })
  const tier = tierRows?.[0]
  if (!tier) return

  const commissionAmount = Math.round(Number(order.subtotal) * Number(tier.rate) * 100) / 100
  if (commissionAmount <= 0) return

  const { data: commissionRow } = await supabaseAdmin
    .from('affiliate_commissions')
    .insert({
      referrer_id: buyer.referred_by,
      referred_user_id: order.user_id,
      order_id: order.id,
      order_amount: order.subtotal,
      commission_rate: tier.rate,
      commission_amount: commissionAmount,
      status: 'pending',
    })
    .select()
    .single()

  const { data: referrer } = await supabaseAdmin
    .from('profiles')
    .select('stripe_connect_account_id, stripe_connect_payouts_enabled')
    .eq('id', buyer.referred_by)
    .single()

  if (referrer?.stripe_connect_account_id && referrer.stripe_connect_payouts_enabled && commissionRow) {
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(commissionAmount * 100),
        currency: 'usd',
        destination: referrer.stripe_connect_account_id,
        transfer_group: order.id,
        metadata: { order_id: order.id, affiliate_commission_id: commissionRow.id },
      })
      await supabaseAdmin
        .from('affiliate_commissions')
        .update({ status: 'paid', stripe_transfer_id: transfer.id })
        .eq('id', commissionRow.id)
    } catch (err) {
      console.error('Affiliate transfer failed:', err.message)
      if (commissionRow) {
        await supabaseAdmin.from('affiliate_commissions').update({ status: 'failed' }).eq('id', commissionRow.id)
      }
    }
  }
  // If the referrer hasn't onboarded to Connect yet, the commission row
  // stays 'pending' — visible on their Account -> Affiliate tab, and payable
  // once they connect (a manual "retry payouts" pass over pending rows, or
  // a scheduled Edge Function, can settle those later).
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    return new Response(`Webhook signature error: ${err.message}`, { status: 400 })
  }

  // --- Premium seller subscription lifecycle -----------------------------
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.user_id
    if (userId) {
      const active = sub.status === 'active' || sub.status === 'trialing'
      await supabaseAdmin
        .from('profiles')
        .update({
          seller_tier: active ? 'premium' : 'basic',
          subscription_status: sub.status,
          stripe_subscription_id: sub.id,
        })
        .eq('id', userId)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.user_id
    if (userId) {
      // Downgrade to Basic — commission resumes at 8%, no more guaranteed
      // weekly featured slot. Already-live listings are untouched.
      await supabaseAdmin
        .from('profiles')
        .update({ seller_tier: 'basic', subscription_status: 'canceled' })
        .eq('id', userId)
    }
  }

  // --- Seller Connect onboarding status -----------------------------------
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account
    await supabaseAdmin
      .from('profiles')
      .update({ stripe_connect_payouts_enabled: !!account.payouts_enabled })
      .eq('stripe_connect_account_id', account.id)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Premium subscription checkout (mode: 'subscription') carries user_id
    // directly in metadata instead of order_id — handle it separately from
    // the digital-goods purchase flow below.
    if (session.mode === 'subscription' && session.metadata?.user_id) {
      await supabaseAdmin
        .from('profiles')
        .update({ seller_tier: 'premium', subscription_status: 'active' })
        .eq('id', session.metadata.user_id)
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: CORS_HEADERS })
    }

    const orderId = session.metadata?.order_id
    if (!orderId) return new Response('missing order_id', { status: 400, headers: CORS_HEADERS })

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single()
    if (!order) return new Response('order not found', { status: 404, headers: CORS_HEADERS })

    const downloadLinks: { title: string; url: string | null }[] = []

    for (const item of order.order_items) {
      let downloadPath: string | null = null
      let licensePdfPath: string | null = null

      if (item.item_type === 'track_license' && item.track_id) {
        const { data: track } = await supabaseAdmin
          .from('tracks')
          .select('*')
          .eq('id', item.track_id)
          .single()
        downloadPath = track?.master_wav_path || track?.master_mp3_path || null

        // Generate + store the license agreement PDF.
        const pdfBytes = await generateLicensePdf({
          buyerEmail: order.email,
          trackTitle: track?.title || item.title,
          license: item.license || 'basic',
          orderId: order.id,
          purchaseDate: new Date().toLocaleDateString('en-US'),
        })
        licensePdfPath = `licenses/${order.id}-${item.id}.pdf`
        await supabaseAdmin.storage.from('docs').upload(licensePdfPath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        })

        // Catalog protection: exclusive sale pulls the track from the store.
        if (item.license === 'exclusive' && track) {
          await supabaseAdmin
            .from('tracks')
            .update({ exclusive_sold: true, is_published: false })
            .eq('id', item.track_id)
        }
      } else if (item.item_type === 'product' && item.product_id) {
        const { data: product } = await supabaseAdmin
          .from('products')
          .select('file_path')
          .eq('id', item.product_id)
          .single()
        downloadPath = product?.file_path || null
      }
      // Note: bundle purchases are expanded into individual track_license /
      // product order_items (with a shared bundle_id) by
      // create-checkout-session, so no separate 'bundle' case is needed here.

      await supabaseAdmin
        .from('order_items')
        .update({ download_path: downloadPath, license_pdf_path: licensePdfPath })
        .eq('id', item.id)

      downloadLinks.push({ title: item.title, url: downloadPath ? `(available in your account)` : null })
    }

    const pointsEarned = Math.floor(Number(order.subtotal) * POINTS_PER_DOLLAR)

    await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        stripe_payment_intent: session.payment_intent as string,
        points_earned: pointsEarned,
      })
      .eq('id', orderId)

    if (order.user_id && pointsEarned > 0) {
      await supabaseAdmin.rpc('award_points', {
        p_user_id: order.user_id,
        p_points: pointsEarned,
        p_reason: 'purchase',
        p_order_id: orderId,
      })
    }

    await payOutSellers(order)
    await payAffiliateCommission(order)
    await sendReceiptEmail(order.email, order, downloadLinks)
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: CORS_HEADERS })
})
