import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { input, label, btn, card, COLORS, BASE, SMALL } from '../lib/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, padding: 20 }}>
      <div style={{ ...card, width: '100%', maxWidth: 400, padding: '32px 36px' }}>
        <img src="/plai-logo.jpg" alt="" style={{ height: 40, marginBottom: 20 }} />
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: COLORS.text }}>AccèsActif</h1>
        <p style={{ fontSize: BASE, color: COLORS.muted, marginBottom: 24 }}>
          Espace des membres du PLAI
        </p>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={label} htmlFor="login-email">Email</label>
            <input id="login-email" type="email" autoComplete="username" value={email}
              onChange={e => setEmail(e.target.value)} required style={{ ...input, marginBottom: 0 }} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={label} htmlFor="login-password">Mot de passe</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password}
              onChange={e => setPassword(e.target.value)} required style={{ ...input, marginBottom: 0 }} />
          </div>
          {error && (
            <p role="alert" style={{ fontSize: BASE, color: COLORS.danger, marginBottom: 12 }}>{error}</p>
          )}
          <button type="submit" disabled={loading}
            style={{ ...btn, width: '100%', background: loading ? COLORS.muted : COLORS.teal }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p style={{ fontSize: SMALL, color: COLORS.muted, marginTop: 20, marginBottom: 0 }}>
          Les enseignants n'ont pas de compte : ils reçoivent un lien personnel par email.
        </p>
      </div>
    </div>
  )
}
