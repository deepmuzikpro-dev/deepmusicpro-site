import { supabase } from './supabaseClient'

// Calls the create-checkout-session Edge Function and redirects to Stripe.
export async function startCheckout(items, { email, userId }) {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      items,
      email,
      userId,
      successUrl: `${window.location.origin}/checkout/success`,
      cancelUrl: `${window.location.origin}/cart`,
    },
  })
  if (error) throw error
  if (data?.url) {
    window.location.href = data.url
  } else {
    throw new Error(data?.error || 'Could not start checkout')
  }
}

// Sends a user through Stripe Connect Express onboarding so they can
// receive seller payouts (Basic 92% / Premium 100% of each sale).
export async function startConnectOnboarding({ userId, email }) {
  const { data, error } = await supabase.functions.invoke('create-connect-account', {
    body: {
      userId,
      email,
      returnUrl: `${window.location.origin}/sell?connected=1`,
      refreshUrl: `${window.location.origin}/sell`,
    },
  })
  if (error) throw error
  if (data?.url) window.location.href = data.url
  else throw new Error(data?.error || 'Could not start onboarding')
}

// Starts the $9.99/mo Premium seller subscription (0% commission + a
// guaranteed featured slot every week).
export async function startPremiumSubscription({ userId, email }) {
  const { data, error } = await supabase.functions.invoke('create-subscription-session', {
    body: {
      userId,
      email,
      successUrl: `${window.location.origin}/sell?upgraded=1`,
      cancelUrl: `${window.location.origin}/sell`,
    },
  })
  if (error) throw error
  if (data?.url) window.location.href = data.url
  else throw new Error(data?.error || 'Could not start subscription checkout')
}

// Opens the Stripe-hosted billing portal (update card, cancel Premium).
export async function openBillingPortal({ userId }) {
  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: { userId, returnUrl: `${window.location.origin}/sell` },
  })
  if (error) throw error
  if (data?.url) window.location.href = data.url
  else throw new Error(data?.error || 'Could not open billing portal')
}
