import { useEffect, useState } from 'react'

const CATEGORIES = ['Matériels', 'Pédagogiques', 'Organisationnels']

export default function TeacherAccessPage({ token }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/teacher-access?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7' }}>
      <p style={{ color: '#9a958c' }}>Chargement de vos aménagements…</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#a32d2d', fontSize: 16, fontWeight: 600 }}>{error}</p>
        <p style={{ color: '#9a958c', fontSize: 13 }}>Contactez votre référente PLAI si le problème persiste.</p>
      </div>
    </div>
  )

  const { teacher, byClass } = data

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7' }}>
      {/* En-tête */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e4dd', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/plai-logo.jpg" alt="PLAI" style={{ height: 32 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1814' }}>AccèsActif</div>
            <div style={{ fontSize: 11, color: '#9a958c' }}>Aménagements raisonnables</div>
          </div>
        </div>
        <a href={`/api/generate-pdf?token=${encodeURIComponent(token)}`}
          target="_blank" rel="noopener noreferrer"
          style={{ background: '#f97316', color: '#fff', borderRadius: 20, padding: '6px 16px', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Imprimer / PDF
        </a>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1814', margin: '0 0 4px' }}>
            {teacher?.name}
          </h1>
          <p style={{ fontSize: 12, color: '#9a958c', margin: 0 }}>
            Consulté le {new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
            {teacher?.subject && ` — ${teacher.subject}`}
          </p>
        </div>

        {Object.entries(byClass).sort().map(([cls, students]) => {
          // Calculer les AUs communes (ARs présents chez ≥2 élèves)
          const arCount = {}
          students.forEach(s => s.ars.forEach(ar => {
            arCount[ar.label] = (arCount[ar.label] || 0) + 1
          }))
          const commonARs = Object.entries(arCount)
            .filter(([, count]) => count >= 2)
            .map(([label]) => label)

          return (
            <div key={cls} style={{ marginBottom: 32 }}>
              {/* En-tête classe */}
              <div style={{ background: '#1a1814', color: '#fff', padding: '8px 16px', borderRadius: '6px 6px 0 0', fontSize: 13, fontWeight: 700 }}>
                {cls}
              </div>

              {/* AUs communes */}
              {commonARs.length > 0 && (
                <div style={{ background: '#e8f5f0', border: '1px solid #0a9370', borderTop: 'none', padding: '10px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0a9370', marginBottom: 6 }}>
                    AMÉNAGEMENTS COMMUNS À LA CLASSE
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {commonARs.map(label => (
                      <span key={label} style={{ background: '#fff', border: '1px solid #0a9370', borderRadius: 12, padding: '2px 10px', fontSize: 11, color: '#0a9370' }}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tableau par élève */}
              {students.map(student => (
                <div key={student.id} style={{ border: '1px solid #e8e4dd', borderTop: 'none', background: '#fff' }}>
                  <div style={{ padding: '6px 16px', borderBottom: '1px solid #e8e4dd', fontSize: 12, fontWeight: 600, color: '#1a1814', background: '#faf9f7' }}>
                    {student.anonymous_code}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                    {CATEGORIES.map(cat => {
                      const catARs = student.ars.filter(a => a.category === cat)
                      return (
                        <div key={cat} style={{ padding: '10px 12px', borderRight: cat !== 'Organisationnels' ? '1px solid #e8e4dd' : 'none' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a958c', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                            {cat}
                          </div>
                          {catARs.length === 0
                            ? <span style={{ fontSize: 11, color: '#d4cfc6' }}>—</span>
                            : catARs.map((ar, i) => (
                              <div key={i} style={{ fontSize: 12, color: '#1a1814', marginBottom: 4 }}>
                                • {ar.label}
                                {ar.has_precision && ar.precision_value && (
                                  <span style={{ color: '#5a564f' }}> ({ar.precision_value})</span>
                                )}
                              </div>
                            ))
                          }
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        })}

        <p style={{ fontSize: 11, color: '#9a958c', textAlign: 'center', marginTop: 32 }}>
          Document confidentiel — usage pédagogique interne uniquement — PLAI Liège
        </p>
      </div>
    </div>
  )
}
