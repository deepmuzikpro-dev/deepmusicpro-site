import LegalLayout from './LegalLayout.jsx'

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p><em>Draft placeholder — have a lawyer review before you rely on this, especially if you have customers in the EU/UK (GDPR) or California (CCPA).</em></p>

      <h2>1. What we collect</h2>
      <ul>
        <li>Account info: email, display name, password (hashed, never visible to us).</li>
        <li>Order info: items purchased, order total, email used at checkout.</li>
        <li>Usage info: streaming activity (play counts) used to power Trending and, where you're signed in, your Liked Tracks and rewards points.</li>
        <li>Payment info: handled entirely by Stripe — we never see or store your full card number.</li>
      </ul>

      <h2>2. How we use it</h2>
      <p>To create and manage your account, fulfill orders and deliver downloads/licenses, calculate and award rewards points, and improve the catalog (e.g. which genres/tracks are popular).</p>

      <h2>3. Who we share it with</h2>
      <ul>
        <li><strong>Stripe</strong> — payment processing.</li>
        <li><strong>Supabase</strong> — our database, authentication, and file storage provider.</li>
        <li><strong>Resend</strong> — sends order receipt emails.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>4. Your choices</h2>
      <p>You can update your account info anytime from your account page, or request account deletion by contacting [support email]. You can unsubscribe from marketing emails (not transactional receipts) via the link in those emails.</p>

      <h2>5. Data retention</h2>
      <p>We retain order and license records for as long as needed for legal, tax, and license-proof purposes.</p>

      <h2>6. Contact</h2>
      <p>Questions about this policy: [support email].</p>

      <p className="opacity-60 text-sm mt-8">Last updated: [date]</p>
    </LegalLayout>
  )
}
