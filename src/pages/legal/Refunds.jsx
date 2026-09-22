import LegalLayout from './LegalLayout.jsx'

export default function Refunds() {
  return (
    <LegalLayout title="Refund Policy">
      <p><em>Draft placeholder — adjust to match how you actually want to run this, then have a lawyer review.</em></p>

      <h2>Digital goods, generally</h2>
      <p>Because beats, ebooks, PDF guides, sample kits, and drum kits are delivered instantly as digital files, all sales are final once a download link has been issued — except as described below.</p>

      <h2>When we will issue a refund</h2>
      <ul>
        <li>You were charged more than once for the same order (duplicate charge).</li>
        <li>The file you received is corrupted or doesn't match the product description, and we can't resolve it by re-issuing the file.</li>
        <li>An exclusive license track was already sold to someone else due to a site error (won't happen under normal operation — exclusive tracks are auto-removed from the store the moment they sell).</li>
      </ul>

      <h2>When we generally will not</h2>
      <ul>
        <li>"Changed my mind" after downloading a Basic or Premium license, ebook, guide, or kit.</li>
        <li>Compatibility issues with your specific DAW/software not disclosed as a requirement on the product page.</li>
      </ul>

      <h2>How to request one</h2>
      <p>Email [support email] with your order ID within 7 days of purchase. We'll respond within 2 business days.</p>

      <p className="opacity-60 text-sm mt-8">Last updated: [date]</p>
    </LegalLayout>
  )
}
