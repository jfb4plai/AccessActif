import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { input, label, help, btn, card, COLORS, BASE } from '../lib/ui'

export default function ResetPasswordPage({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    onDone()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, padding: 20 }}>
      <div style={{ ...card, width: '100%', maxWidth: 400, padding: '32px 36px' }}>
        <img src="/plai-logo.jpg" alt="" style={{ height: 40, marginBottom: 20 }} />
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: COLORS.text }}>Nouveau mot de passe</h1>
        <p style={{ fontSize: BASE, color: COLORS.muted, marginBottom: 24 }}>
          Choisissez un nouveau mot de passe pour votre compte AccèsActif.
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={label} htmlFor="rp-password">Nouveau mot de passe</label>
            <input id="rp-password" type="password" autoComplete="new-password" value={password}
              onChange={e => setPassword(e.target.value)} required style={{ ...input, marginBottom: 0 }} />
            <p style={help}>Au moins 6 caractères.</p>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={label} htmlFor="rp-confirm">Confirmer le mot de passe</label>
            <input id="rp-confirm" type="password" autoComplete="new-password" value={confirm}
              onChange={e => setConfirm(e.target.value)} required style={{ ...input, marginBottom: 0 }} />
          </div>
          {error && (
            <p role="alert" style={{ fontSize: BASE, color: COLORS.danger, marginBottom: 12 }}>{error}</p>
          )}
          <button type="submit" disabled={loading}
            style={{ ...btn, width: '100%', background: loading ? COLORS.muted : COLORS.teal }}>
            {loading ? 'Enregistrement…' : 'Enregistrer et continuer'}
          </button>
        </form>
      </div>
    </div>
  )
}
