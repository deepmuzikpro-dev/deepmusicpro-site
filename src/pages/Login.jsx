import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { signIn, banned } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/account')
  }

  if (banned) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <h1 className="font-display font-extrabold text-2xl mb-3 text-dmp-red">Account suspended</h1>
        <p className="text-dmp-white/60">This account has been banned from Deepmusicpro. Contact support if you think that's a mistake.</p>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="font-display font-extrabold text-2xl mb-6">Sign In</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-dmp-red text-sm">{error}</p>}
        <button className="btn-primary" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
      </form>
      <p className="text-dmp-white/50 text-sm mt-4">
        No account? <Link to="/signup" className="text-dmp-green hover:underline">Sign up</Link>
      </p>
    </div>
  )
}
