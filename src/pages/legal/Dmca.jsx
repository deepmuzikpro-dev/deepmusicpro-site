import LegalLayout from './LegalLayout.jsx'

export default function Dmca() {
  return (
    <LegalLayout title="Copyright / DMCA Policy">
      <p><em>Draft placeholder — have a lawyer review before you rely on this.</em></p>

      <h2>Our respect for copyright</h2>
      <p>All beats, samples, and drum kits sold on Deepmusicpro are either originally produced by Deepmusicpro or licensed to us with the right to resell. If you believe content on this Site infringes your copyright, we'll respond promptly to valid notices.</p>

      <h2>Filing a notice</h2>
      <p>Send the following to [designated agent email]:</p>
      <ul>
        <li>Identification of the copyrighted work you claim is infringed.</li>
        <li>Identification of the material on the Site you claim is infringing, with a URL.</li>
        <li>Your contact information (name, address, phone, email).</li>
        <li>A statement that you have a good-faith belief the use is not authorized.</li>
        <li>A statement, under penalty of perjury, that the information is accurate and you're authorized to act on behalf of the copyright owner.</li>
        <li>Your physical or electronic signature.</li>
      </ul>

      <h2>Counter-notice</h2>
      <p>If you believe content was removed in error, you may submit a counter-notice to the same address with your contact info, identification of the removed material, and a statement under penalty of perjury that you have a good-faith belief the material was removed by mistake.</p>

      <h2>Repeat infringers</h2>
      <p>Accounts found to repeatedly infringe copyright will be banned from the Site.</p>

      <p className="opacity-60 text-sm mt-8">Last updated: [date]</p>
    </LegalLayout>
  )
}
