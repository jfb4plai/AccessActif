import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7' }}>
      <div style={{ background: '#fff', border: '1px solid #e8e4dd', borderRadius: 12, padding: '32px 36px', width: 360 }}>
        <img src="/plai-logo.jpg" alt="PLAI" style={{ height: 36, marginBottom: 20 }} />
        <h1 style={{ fontFamily: 'system-ui', fontSize: 22, fontWeight: 700, marginBottom: 4, color: '#1a1814' }}>AccèsActif</h1>
        <p style={{ fontSize: 13, color: '#9a958c', marginBottom: 24 }}>Accès référentes du Pôle</p>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5a564f', display: 'block', marginBottom: 4 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: '100%', border: '1px solid #d4cfc6', borderRadius: 6, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5a564f', display: 'block', marginBottom: 4 }}>Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width: '100%', border: '1px solid #d4cfc6', borderRadius: 6, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          {error && <p style={{ fontSize: 12, color: '#a32d2d', marginBottom: 12 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ width: '100%', background: loading ? '#9a958c' : '#0a9370', color: '#fff', border: 'none', borderRadius: 20, padding: '10px', fontSize: 13, fontWeight: 600, cursor: loading ? 'default' : 'pointer' }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
