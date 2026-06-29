import { useState } from 'react'

const inputStyle = {
  width: '100%', border: '1px solid #d4cfc6', borderRadius: 6,
  padding: '8px 10px', fontSize: 13, boxSizing: 'border-box', marginBottom: 4
}
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#5a564f', display: 'block', marginBottom: 4 }
const helpStyle = { fontSize: 11, color: '#9a958c', marginBottom: 12 }

export default function StudentForm({ student, onSave, onCancel }) {
  const [code, setCode] = useState(student?.anonymous_code || '')
  const [cls, setCls] = useState(student?.class_code || '')
  const [disorders, setDisorders] = useState(student?.disorders || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({ id: student?.id, anonymous_code: code, class_code: cls, disorders })
    setSaving(false)
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e4dd', borderRadius: 10, padding: '20px 24px', marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#1a1814' }}>
        {student ? 'Modifier l\'élève' : 'Ajouter un élève'}
      </h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label style={labelStyle}>Code anonyme *</label>
          <input value={code} onChange={e => setCode(e.target.value)} required
            placeholder="Ex: EL-2024-A07" style={inputStyle} />
          <p style={helpStyle}>Identifiant unique sans données personnelles. Ce code sera visible dans la vue enseignant.</p>
        </div>
        <div>
          <label style={labelStyle}>Classe</label>
          <input value={cls} onChange={e => setCls(e.target.value)}
            placeholder="Ex: 3B, 4ème-Latin, S3" style={inputStyle} />
          <p style={helpStyle}>Permet de regrouper les élèves par classe dans la vue enseignant.</p>
        </div>
        <div>
          <label style={labelStyle}>Troubles / profil (optionnel)</label>
          <input value={disorders} onChange={e => setDisorders(e.target.value)}
            placeholder="Ex: dyslexie, TDAH, dyscalculie" style={inputStyle} />
          <p style={helpStyle}>Usage interne uniquement. Non transmis aux enseignants.</p>
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
