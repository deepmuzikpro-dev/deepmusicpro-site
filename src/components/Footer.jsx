import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-white/10 mt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-dmp-white/50">
        <p>© {new Date().getFullYear()} Deepmusicpro. All rights reserved.</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center">
          <Link to="/terms" className="hover:text-dmp-green">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-dmp-green">Privacy Policy</Link>
          <Link to="/refunds" className="hover:text-dmp-green">Refund Policy</Link>
          <Link to="/dmca" className="hover:text-dmp-green">Copyright / DMCA</Link>
        </div>
      </div>
    </footer>
  )
}
