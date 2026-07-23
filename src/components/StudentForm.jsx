import { useState } from 'react'
import { input, label, help, btn, btnGhost, card, h3, COLORS } from '../lib/ui'

export default function StudentForm({ student, onSave, onCancel }) {
  const [firstName, setFirstName] = useState(student?.first_name || '')
  const [lastName, setLastName] = useState(student?.last_name || '')
  const [code, setCode] = useState(student?.anonymous_code || '')
  const [cls, setCls] = useState(student?.class_code || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave({
        id: student?.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        anonymous_code: code.trim() || null,
        class_code: cls.trim() || null,
      })
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ ...card, marginBottom: 20 }}>
      <h3 style={h3}>{student ? 'Modifier l\'élève' : 'Ajouter un élève'}</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={label} htmlFor="sf-first">Prénom *</label>
            <input id="sf-first" value={firstName} onChange={e => setFirstName(e.target.value)} required
              placeholder="Ex : Alice" style={input} />
            <p style={help}>
              Le prénom et le nom sont visibles par les enseignants à qui vous assignez
              cet élève, et par eux seuls. Aucun diagnostic ne leur est transmis.
            </p>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={label} htmlFor="sf-last">Nom *</label>
            <input id="sf-last" value={lastName} onChange={e => setLastName(e.target.value)} required
              placeholder="Ex : Nguyen" style={input} />
            <p style={help}>
              Nécessaire pour distinguer deux élèves de même prénom dans une classe.
            </p>
          </div>
        </div>

        <div>
          <label style={label} htmlFor="sf-class">Classe</label>
          <input id="sf-class" value={cls} onChange={e => setCls(e.target.value)}
            placeholder="Ex : 3B, 4e Latin, P5" style={input} />
          <p style={help}>
            Regroupe les élèves par classe dans la vue enseignant et sert au calcul
            des aménagements communs. Laissez vide si l'élève n'est rattaché à aucune classe.
          </p>
        </div>

        <div>
          <label style={label} htmlFor="sf-code">Code interne (facultatif)</label>
          <input id="sf-code" value={code} onChange={e => setCode(e.target.value)}
            placeholder="Ex : EL-2026-A07" style={input} />
          <p style={help}>
            Référence propre à votre école (numéro de dossier, code PIA). Utile pour
            faire le lien avec vos autres outils. Non affiché aux enseignants.
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
