import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Signup() {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signUp(email, password, name, refCode)
    setLoading(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  if (done) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <h1 className="font-display font-extrabold text-2xl mb-3">Check your email</h1>
        <p className="text-dmp-white/60">Confirm your address to activate your account, then sign in.</p>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="font-display font-extrabold text-2xl mb-6">Create Account</h1>
      {refCode && (
        <p className="text-xs text-dmp-yellow mb-4">Invited by a Deepmusicpro member — you're all set.</p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input className="input" placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        {error && <p className="text-dmp-red text-sm">{error}</p>}
        <button className="btn-primary" disabled={loading}>{loading ? 'Creating…' : 'Sign Up'}</button>
      </form>
      <p className="text-dmp-white/50 text-sm mt-4">
        Already have an account? <Link to="/login" className="text-dmp-green hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
