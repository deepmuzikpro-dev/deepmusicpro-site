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
const connectWebhookSecret = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET')
const resendApiKey = Deno.env.get('RESEND_API_KEY') // optional — receipts are skipped if unset
const fromEmail = Deno.env.get('RECEIPT_FROM_EMAIL') || 'orders@deepmusicpro.com'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const POINTS_PER_DOLLAR = 1

type Tier = 'basic' | 'premium' | 'exclusive'

const TIER_NAME: Record<Tier, string> = {
  basic: 'Basic Lease',
  premium: 'Premium Lease',
  exclusive: 'Exclusive Rights',
}

const safe = (s: unknown) =>
  String(s ?? '').replace(/\s+/g, ' ').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')

function wrapText(text: string, f: any, size: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (f.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function licenseClauses(
  tier: Tier,
  p: { producer: string; licensee: string; track: string; orderId: string; date: string }
): [string, string][] {
  const nonExclusive = tier !== 'exclusive'

  const grant: Record<Tier, string> = {
    basic: `Producer grants Licensee a non-exclusive, non-transferable, worldwide license to use the Beat in ONE (1) new song (the "Song").`,
    premium: `Producer grants Licensee a non-exclusive, non-transferable, worldwide license to use the Beat in ONE (1) new song (the "Song").`,
    exclusive: `Producer grants Licensee exclusive rights to the Beat. On payment, Producer transfers to Licensee ownership of the Beat's instrumental master recording and the exclusive right to license it. Producer will not sell, license or distribute the Beat to anyone else, and the Beat is removed from the Deepmusicpro store. Non-exclusive licenses sold before this date remain valid for their existing licensees. Unless agreed otherwise in writing, the transfer covers the instrumental only; lyrics and vocals Licensee adds belong to Licensee. Producer may show the Beat in a portfolio for promotion only, without making it available for streaming or sale.`,
  }

  const delivery: Record<Tier, string> = {
    basic: `Licensee receives the Beat as an untagged MP3 file, available in the Licensee's Deepmusicpro account.`,
    premium: `Licensee receives the Beat as an untagged WAV file and an untagged MP3 file, available in the Licensee's Deepmusicpro account (if the Producer has uploaded both formats).`,
    exclusive: `Licensee receives the Beat as untagged files in the highest quality the Producer has uploaded (WAV and/or MP3), available in the Licensee's Deepmusicpro account.`,
  }

  const permitted: Record<Tier, string> = {
    basic: `Licensee may distribute the Song on audio streaming platforms and digital download stores, and perform the Song live. Not included: monetized video content (for example, ad-supported video uploads), film, television, radio, advertising and video games. Those uses need a Premium license or the Producer's written permission.`,
    premium: `Licensee may distribute the Song on all audio streaming platforms and digital download stores, perform it live, and use it in music videos and other video content on monetized platforms (for example, YouTube). Not included: film, television, advertising and video-game synchronization, which need the Producer's written permission.`,
    exclusive: `Licensee may use the Beat and any song made with it for unlimited commercial purposes in any medium worldwide, including synchronization in film, television, advertising and video games.`,
  }

  const restrictions = nonExclusive
    ? `Licensee may not resell, sublicense, transfer, give away or redistribute the Beat or its files, on their own or as part of a beat pack or sample library. Licensee may not register the Beat with Content ID or similar rights-claiming systems in a way that claims or blocks revenue from the Producer or other licensees of the Beat. Licensee may not use the Beat in unlawful, defamatory or infringing content.`
    : `Licensee may not use the Beat in unlawful, defamatory or infringing content. Licensee remains responsible for clearing any third-party material they add to the Beat.`

  const credit = nonExclusive
    ? `Licensee must credit the Producer as "Prod. by ${p.producer}" in the Song's title, description or metadata wherever credits can be given.`
    : `Credit as "Prod. by ${p.producer}" is requested and customary, but not required.`

  const ownership = nonExclusive
    ? `Producer remains the sole owner of the Beat (the instrumental composition and master recording) and may license it to others. Licensee owns the new elements they add (such as lyrics and vocals) but acquires no ownership of the Beat.`
    : `Ownership of the Beat's instrumental master recording passes to Licensee as described in Section 2.`

  return [
    ['1. Parties', `This License Agreement is made on ${p.date} between ${p.producer} ("Producer") and ${p.licensee} ("Licensee") for the instrumental titled "${p.track}" (the "Beat"). The Beat was sold through the Deepmusicpro marketplace ("Deepmusicpro"), which facilitates the sale as an intermediary. Order ID: ${p.orderId}.`],
    ['2. Grant of license', grant[tier]],
    ['3. Delivery', delivery[tier]],
    ['4. Permitted use', permitted[tier]],
    ['5. Restrictions', restrictions],
    ['6. Credit', credit],
    ['7. Ownership', ownership],
    ['8. Producer warranties', `Producer represents that the Beat is original or that Producer holds the rights needed to license it, and that Producer has not granted exclusive rights in the Beat to anyone else before this date. Licensee is responsible for everything they add to the Song.`],
    ['9. Limitation of liability', `The Beat is provided "as is". To the fullest extent permitted by law, the total liability of Producer and Deepmusicpro under this agreement is limited to the price Licensee paid for this license.`],
    ['10. Term and termination', nonExclusive
      ? `This license is perpetual and worldwide. Producer may terminate it if Licensee materially breaches it and does not fix the breach within 30 days of written notice.`
      : `This agreement lasts for the life of the copyright. A breach by Licensee does not reverse the transfer of ownership, but Producer may seek any remedy the law allows.`],
    ['11. Governing law', `This agreement is governed by the laws of the State of Florida, United States.`],
    ['12. Entire agreement', `This agreement and the order record on Deepmusicpro are the entire agreement between the parties. It was accepted by completing the purchase, and this auto-generated document serves as proof of license.`],
  ]
}

async function generateLicensePdf(opts: {
  buyerEmail: string
  trackTitle: string
  producer: string
  license: string
  orderId: string
  purchaseDate: string
}) {
  const tier = (['basic', 'premium', 'exclusive'].includes(opts.license) ? opts.license : 'basic') as Tier
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const green = rgb(0.114, 0.725, 0.329)
  const margin = 56
  const maxWidth = 500
  let page = doc.addPage([612, 792])
  let y = 740

  const ensure = (space: number) => {
    if (y - space < 60) {
      page = doc.addPage([612, 792])
      y = 740
    }
  }
  const paragraph = (text: string, size: number, f: any, gapAfter: number) => {
    for (const line of wrapText(safe(text), f, size, maxWidth)) {
      ensure(size + 4)
      page.drawText(line, { x: margin, y, size, font: f })
      y -= size + 4
    }
    y -= gapAfter
  }

  page.drawText('DEEPMUSICPRO', { x: margin, y, size: 22, font: bold, color: green })
  y -= 22
  page.drawText(safe(`Beat License Agreement - ${TIER_NAME[tier]}`), { x: margin, y, size: 13, font })
  y -= 34

  const summary: [string, string][] = [
    ['Order ID', opts.orderId],
    ['Purchase date', opts.purchaseDate],
    ['Producer', opts.producer],
    ['Licensee (buyer)', opts.buyerEmail],
    ['Track', opts.trackTitle],
    ['License tier', TIER_NAME[tier]],
  ]
  for (const [label, value] of summary) {
    ensure(20)
    page.drawText(`${label}:`, { x: margin, y, size: 10.5, font: bold })
    page.drawText(safe(value).slice(0, 80), { x: 190, y, size: 10.5, font })
    y -= 20
  }
  y -= 12

  const clauses = licenseClauses(tier, {
    producer: safe(opts.producer),
    licensee: safe(opts.buyerEmail),
    track: safe(opts.trackTitle),
    orderId: opts.orderId,
    date: opts.purchaseDate,
  })
  for (const [heading, body] of clauses) {
    ensure(40)
    page.drawText(heading, { x: margin, y, size: 11, font: bold })
    y -= 16
    paragraph(body, 10, font, 8)
  }

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
    if (!connectWebhookSecret) {
      return new Response(`Webhook signature error: ${err.message}`, { status: 400 })
    }
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, connectWebhookSecret)
    } catch (err2) {
      return new Response(`Webhook signature error: ${err2.message}`, { status: 400 })
    }
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
      let downloadPathExtra: string | null = null
      let licensePdfPath: string | null = null

      if (item.item_type === 'track_license' && item.track_id) {
        const { data: track } = await supabaseAdmin
          .from('tracks')
          .select('*')
          .eq('id', item.track_id)
          .single()

        // Basic = MP3. Premium/Exclusive = WAV (main) + MP3 (extra).
        const tier = item.license || 'basic'
        const mp3 = track?.master_mp3_path || null
        const wav = track?.master_wav_path || null
        if (tier === 'basic') {
          downloadPath = mp3 || wav
        } else {
          downloadPath = wav || mp3
          downloadPathExtra = wav && mp3 ? mp3 : null
        }

        let producer = 'Deepmusicpro'
        if (track?.seller_id) {
          const { data: sp } = await supabaseAdmin
            .from('profiles')
            .select('display_name')
            .eq('id', track.seller_id)
            .single()
          producer = sp?.display_name || producer
        }

        try {
          const pdfBytes = await generateLicensePdf({
            buyerEmail: order.email,
            trackTitle: track?.title || item.title,
            producer,
            license: tier,
            orderId: order.id,
            purchaseDate: new Date().toLocaleDateString('en-US'),
          })
          licensePdfPath = `licenses/${order.id}-${item.id}.pdf`
          await supabaseAdmin.storage.from('docs').upload(licensePdfPath, pdfBytes, {
            contentType: 'application/pdf',
            upsert: true,
          })
        } catch (err) {
          console.error('License PDF failed:', err.message)
          licensePdfPath = null
        }

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
        .update({
          download_path: downloadPath,
          download_path_extra: downloadPathExtra,
          license_pdf_path: licensePdfPath,
        })
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