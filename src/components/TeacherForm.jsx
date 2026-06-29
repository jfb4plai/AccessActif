import { useState } from 'react'

const inputStyle = {
  width: '100%', border: '1px solid #d4cfc6', borderRadius: 6,
  padding: '8px 10px', fontSize: 13, boxSizing: 'border-box', marginBottom: 4
}
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#5a564f', display: 'block', marginBottom: 4 }
const helpStyle = { fontSize: 11, color: '#9a958c', marginBottom: 12 }

export default function TeacherForm({ teacher, onSave, onCancel }) {
  const [name, setName] = useState(teacher?.name || '')
  const [email, setEmail] = useState(teacher?.email || '')
  const [subject, setSubject] = useState(teacher?.subject || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({ id: teacher?.id, name, email, subject })
    setSaving(false)
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e4dd', borderRadius: 10, padding: '20px 24px', marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#1a1814' }}>
        {teacher ? 'Modifier l\'enseignant' : 'Ajouter un enseignant'}
      </h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label style={labelStyle}>Nom complet *</label>
          <input value={name} onChange={e => setName(e.target.value)} required
            placeholder="Ex: Marie Dupont" style={inputStyle} />
          <p style={helpStyle}>Nom affiché dans le lien magique envoyé à l'enseignant.</p>
        </div>
        <div>
          <label style={labelStyle}>Email *</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="Ex: marie.dupont@ens.ecl.be" style={inputStyle} />
          <p style={helpStyle}>Adresse à laquelle le lien magique sera envoyé. Toute adresse email est acceptée.</p>
        </div>
        <div>
          <label style={labelStyle}>Matière / cours</label>
          <input value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="Ex: Français, Mathématiques, Histoire-Géo" style={inputStyle} />
          <p style={helpStyle}>Optionnel. Utilisé pour regrouper les enseignants par matière dans le suivi.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving}
            style={{ background: saving ? '#9a958c' : '#0a9370', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button type="button" onClick={onCancel}
            style={{ background: 'none', border: '1px solid #d4cfc6', borderRadius: 20, padding: '8px 16px', fontSize: 13, color: '#5a564f', cursor: 'pointer' }}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
