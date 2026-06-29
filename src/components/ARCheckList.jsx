import { useStudentARs } from '../hooks/useStudents'

export default function ARCheckList({ studentId }) {
  const { ars, definitions, loading, toggleAR } = useStudentARs(studentId)

  if (loading) return <p style={{ color: '#9a958c', padding: '10px 0', fontSize: 13 }}>Chargement des ARs…</p>

  const categories = ['Matériels', 'Pédagogiques', 'Organisationnels']

  function getAR(defId) {
    return ars.find(a => a.ar_definition_id === defId)
  }

  async function handleToggle(def, checked) {
    const existing = getAR(def.id)
    await toggleAR(def.id, checked, existing?.precision_value || null)
  }

  async function handlePrecision(def, value) {
    await toggleAR(def.id, true, value)
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e4dd', borderRadius: 10, padding: '20px 24px', marginTop: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#1a1814' }}>Aménagements raisonnables</h3>
      {categories.map(cat => {
        const defs = definitions.filter(d => d.category === cat)
        if (!defs.length) return null
        return (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0a9370', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {cat}
            </div>
            {defs.map(def => {
              const ar = getAR(def.id)
              const isActive = ar?.is_active || false
              return (
                <div key={def.id} style={{ marginBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={isActive}
                      onChange={e => handleToggle(def, e.target.checked)}
                      style={{ marginTop: 2, accentColor: '#0a9370' }} />
                    <span style={{ fontSize: 13, color: '#1a1814' }}>{def.label}</span>
                  </label>
                  {def.has_precision && isActive && (
                    <div style={{ marginLeft: 24, marginTop: 4 }}>
                      <input
                        type="text"
                        placeholder={def.precision_label}
                        defaultValue={ar?.precision_value || ''}
                        onBlur={e => handlePrecision(def, e.target.value)}
                        style={{ border: '1px solid #d4cfc6', borderRadius: 4, padding: '4px 8px', fontSize: 12, width: 180 }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
