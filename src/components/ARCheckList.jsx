import { useState } from 'react'
import { useStudentARs } from '../hooks/useStudents'
import { BASE, SMALL, COLORS, card, h3, input, btnGhost, fullName } from '../lib/ui'

const CATEGORIES = ['Matériels', 'Pédagogiques', 'Organisationnels']

const ACTION_LABELS = {
  accorde: 'Accordé',
  retire: 'Retiré',
  modifie: 'Précision modifiée',
}

export default function ARCheckList({ student }) {
  const studentId = student?.id
  const { ars, definitions, history, loading, error, toggleAR } = useStudentARs(studentId)
  const [showHistory, setShowHistory] = useState(false)

  if (loading) return <p style={{ color: COLORS.muted, padding: '10px 0', fontSize: BASE }}>Chargement des aménagements…</p>

  const getAR = defId => ars.find(a => a.ar_definition_id === defId)
  const activeCount = ars.filter(a => a.is_active).length

  return (
    <div style={{ ...card, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ ...h3, marginBottom: 4 }}>Aménagements de {fullName(student)}</h3>
        <button onClick={() => setShowHistory(h => !h)} style={{ ...btnGhost, padding: '6px 14px', fontSize: SMALL }}>
          {showHistory ? 'Masquer l\'historique' : `Historique (${history.length})`}
        </button>
      </div>
      <p style={{ fontSize: SMALL, color: COLORS.muted, marginTop: 0, marginBottom: 16 }}>
        {activeCount} aménagement(s) actif(s). Chaque modification est horodatée et
        attribuée — l'historique fait foi en cas de contestation.
      </p>

      {error && (
        <p role="alert" style={{ color: COLORS.danger, fontSize: BASE, marginBottom: 12 }}>
          Enregistrement impossible : {error}
        </p>
      )}

      {showHistory && (
        <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
          {history.length === 0
            ? <p style={{ fontSize: BASE, color: COLORS.muted, margin: 0 }}>Aucune décision enregistrée pour l'instant.</p>
            : (
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {history.map(h => (
                  <li key={h.id} style={{ fontSize: SMALL, color: COLORS.text, marginBottom: 6 }}>
                    <strong>{ACTION_LABELS[h.action] || h.action}</strong>
                    {' — '}{h.acces_ar_definitions?.label || 'aménagement supprimé'}
                    <span style={{ color: COLORS.muted }}>
                      {' · '}{new Date(h.decided_at).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {h.acces_referentes?.name ? ` · ${h.acces_referentes.name}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}

      {CATEGORIES.map(cat => {
        const defs = definitions.filter(d => d.category === cat)
        if (!defs.length) return null
        return (
          <fieldset key={cat} style={{ border: 'none', padding: 0, margin: '0 0 24px' }}>
            <legend style={{ fontSize: BASE, fontWeight: 700, color: COLORS.tealText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, padding: 0 }}>
              {cat}
            </legend>
            {defs.map(def => {
              const ar = getAR(def.id)
              const isActive = ar?.is_active || false
              return (
                <div key={def.id} style={{ marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={isActive}
                      onChange={e => toggleAR(def.id, e.target.checked, ar?.precision_value || null, ar?.review_due_on || null)}
                      style={{ marginTop: 3, width: 18, height: 18, accentColor: COLORS.teal, flexShrink: 0 }} />
                    <span style={{ fontSize: BASE, color: COLORS.text, lineHeight: 1.4 }}>{def.label}</span>
                  </label>

                  {isActive && (
                    <div style={{ marginLeft: 28, marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {def.has_precision && (
                        <div>
                          <label style={{ fontSize: SMALL, color: COLORS.muted, display: 'block', marginBottom: 2 }}
                            htmlFor={`prec-${def.id}`}>
                            {def.precision_label || 'Précision'}
                          </label>
                          <input id={`prec-${def.id}`} type="text"
                            placeholder={def.precision_label || ''}
                            defaultValue={ar?.precision_value || ''}
                            onBlur={e => toggleAR(def.id, true, e.target.value || null, ar?.review_due_on || null)}
                            style={{ ...input, width: 220, marginBottom: 0 }} />
                        </div>
                      )}
                      <div>
                        <label style={{ fontSize: SMALL, color: COLORS.muted, display: 'block', marginBottom: 2 }}
                          htmlFor={`rev-${def.id}`}>
                          À revoir le
                        </label>
                        <input id={`rev-${def.id}`} type="date"
                          defaultValue={ar?.review_due_on || ''}
                          onBlur={e => toggleAR(def.id, true, ar?.precision_value || null, e.target.value || null)}
                          style={{ ...input, width: 180, marginBottom: 0 }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </fieldset>
        )
      })}
    </div>
  )
}
