import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { callApi } from '../../lib/api'
import { useApp } from '../../lib/useApp'
import { input, label, help, btn, card, h2, COLORS, BASE, SMALL } from '../../lib/ui'

const ROLE_OPTIONS = [
  { value: 'referente_pole', label: 'Référente PLAI' },
  { value: 'referente_par', label: 'Référente PAR' },
  { value: 'super_admin', label: 'Super admin' },
]

export default function MembersPage() {
  const { schools } = useApp()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('referente_pole')
  const [schoolIds, setSchoolIds] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleSchool(id) {
    setSchoolIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!schoolIds.length) { setError('Sélectionnez au moins une école.'); return }
    setLoading(true)

    const json = await callApi('/api/create-member', { email, name, role, school_ids: schoolIds })
    if (json.error) { setError(json.error); setLoading(false); return }

    // Le compte existe mais n'a pas de mot de passe : ce lien lui permet
    // d'en choisir un elle-même, sans que personne n'ait à le lui transmettre.
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })

    setSuccess(`Compte créé pour ${email}. Un email vient d'être envoyé pour choisir le mot de passe.`)
    setEmail('')
    setName('')
    setRole('referente_pole')
    setSchoolIds([])
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={{ ...h2, marginBottom: 16 }}>Ajouter un membre</h2>
      <div style={card}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={label} htmlFor="mem-name">Nom</label>
            <input id="mem-name" type="text" value={name} required
              onChange={e => setName(e.target.value)} style={{ ...input, marginBottom: 0 }}
              placeholder="Ex : Marie Dupont" />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={label} htmlFor="mem-email">Email — vérifiez-la avant d'envoyer</label>
            <input id="mem-email" type="email" value={email} required
              onChange={e => setEmail(e.target.value)} style={{ ...input, marginBottom: 0 }}
              placeholder="prenom.nom@ecole.be" />
            <p style={help}>C'est cette adresse qui recevra le lien pour choisir le mot de passe.</p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={label} htmlFor="mem-role">Rôle</label>
            <select id="mem-role" value={role} onChange={e => setRole(e.target.value)}
              style={{ ...input, marginBottom: 0 }}>
              {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <p style={help}>Un super admin voit toutes les écoles ; les autres, seulement celles cochées ci-dessous.</p>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={label}>École(s)</label>
            {schools.map(s => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer', fontSize: BASE, color: COLORS.text }}>
                <input type="checkbox" checked={schoolIds.includes(s.id)}
                  onChange={() => toggleSchool(s.id)} />
                {s.name}
              </label>
            ))}
            {!schools.length && (
              <p style={{ fontSize: SMALL, color: COLORS.muted }}>Aucune école enregistrée pour l'instant.</p>
            )}
          </div>

          {error && (
            <p role="alert" style={{ fontSize: BASE, color: COLORS.danger, marginBottom: 12 }}>{error}</p>
          )}
          {success && (
            <p style={{ fontSize: BASE, color: COLORS.tealText, marginBottom: 12 }}>{success}</p>
          )}

          <button type="submit" disabled={loading}
            style={{ ...btn, width: '100%', background: loading ? COLORS.muted : COLORS.teal }}>
            {loading ? 'Création…' : 'Créer le compte et envoyer le lien'}
          </button>
        </form>
      </div>
    </div>
  )
}
