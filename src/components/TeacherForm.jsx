import { useState } from 'react'
import { input, label, help, btn, btnGhost, card, h3, COLORS } from '../lib/ui'

export default function TeacherForm({ teacher, onSave, onCancel }) {
  const [name, setName] = useState(teacher?.name || '')
  const [email, setEmail] = useState(teacher?.email || '')
  const [subject, setSubject] = useState(teacher?.subject || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave({ id: teacher?.id, name: name.trim(), email: email.trim(), subject: subject.trim() || null })
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ ...card, marginBottom: 20 }}>
      <h3 style={h3}>{teacher ? 'Modifier l\'enseignant' : 'Ajouter un enseignant'}</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label style={label} htmlFor="tf-name">Nom complet *</label>
          <input id="tf-name" value={name} onChange={e => setName(e.target.value)} required
            placeholder="Ex : Marie Dupont" style={input} />
          <p style={help}>Affiché en tête du document que l'enseignant consulte et imprime.</p>
        </div>
        <div>
          <label style={label} htmlFor="tf-email">Email *</label>
          <input id="tf-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="Ex : marie.dupont@ens.ecl.be" style={input} />
          <p style={help}>
            Adresse à laquelle le lien est envoyé. Vérifiez-la : le lien donne accès
            à des informations sur des élèves nommés.
          </p>
        </div>
        <div>
          <label style={label} htmlFor="tf-subject">Matière / cours</label>
          <input id="tf-subject" value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="Ex : Français, Mathématiques, Atelier cuisine" style={input} />
          <p style={help}>
            Facultatif. Apparaît sur son document et sert à repérer qui a été prévenu
            dans le suivi des envois.
          </p>
        </div>

        {error && (
          <p role="alert" style={{ color: COLORS.danger, fontSize: 16, marginBottom: 12 }}>
            Enregistrement impossible : {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving}
            style={{ ...btn, background: saving ? COLORS.muted : COLORS.teal }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button type="button" onClick={onCancel} style={btnGhost}>Annuler</button>
        </div>
      </form>
    </div>
  )
}
