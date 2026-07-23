import { useEffect, useState } from 'react'
import { BASE, SMALL, COLORS } from '../../lib/ui'

const CATEGORIES = ['Matériels', 'Pédagogiques', 'Organisationnels']

/** Aménagements présents chez au moins un tiers de la classe (min. 2 élèves). */
function commonARs(students) {
  const threshold = Math.max(2, Math.ceil(students.length / 3))
  const count = {}
  for (const s of students) {
    for (const ar of s.ars) count[ar.label] = (count[ar.label] || 0) + 1
  }
  return Object.entries(count)
    .filter(([, n]) => n >= threshold)
    .map(([label]) => label)
    .sort((a, b) => a.localeCompare(b, 'fr'))
}

export default function TeacherAccessPage({ token }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/teacher-access?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.bg }}>
      <p role="status" style={{ color: COLORS.muted, fontSize: BASE }}>Chargement de vos aménagements…</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, padding: 20 }}>
      <div role="alert" style={{ textAlign: 'center' }}>
        <p style={{ color: COLORS.danger, fontSize: 18, fontWeight: 700 }}>{error}</p>
        <p style={{ color: COLORS.muted, fontSize: BASE }}>Contactez votre référente PLAI si le problème persiste.</p>
      </div>
    </div>
  )

  const { teacher, byClass } = data
  const classes = Object.entries(byClass).sort()

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontSize: BASE, lineHeight: 1.5 }}>
      <header style={{ background: '#fff', borderBottom: `1px solid ${COLORS.border}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/plai-logo.jpg" alt="" style={{ height: 36 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: COLORS.text }}>AccèsActif</div>
            <div style={{ fontSize: BASE, color: COLORS.muted }}>Aménagements raisonnables</div>
          </div>
        </div>
        <a href={`/api/generate-pdf?token=${encodeURIComponent(token)}`}
          target="_blank" rel="noopener noreferrer"
          style={{ background: COLORS.orange, color: '#fff', borderRadius: 20, padding: '10px 20px', fontSize: BASE, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Imprimer / PDF
        </a>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, margin: '0 0 4px' }}>{teacher?.name}</h1>
          <p style={{ fontSize: BASE, color: COLORS.muted, margin: 0 }}>
            Consulté le {new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
            {teacher?.subject && ` — ${teacher.subject}`}
          </p>
        </div>

        {classes.length === 0 && (
          <p style={{ fontSize: BASE, color: COLORS.muted }}>
            Aucun élève ne vous est assigné pour le moment. Votre référente PLAI
            vous préviendra dès qu'un dossier vous concerne.
          </p>
        )}

        {classes.map(([cls, students]) => {
          const common = commonARs(students)
          return (
            <section key={cls} style={{ marginBottom: 32 }}>
              <h2 style={{ background: COLORS.text, color: '#fff', padding: '10px 16px', borderRadius: '6px 6px 0 0', fontSize: 18, fontWeight: 700, margin: 0 }}>
                {cls}
              </h2>

              {common.length > 0 && (
                <div style={{ background: '#e8f5f0', border: `1px solid ${COLORS.teal}`, borderTop: 'none', padding: '12px 16px' }}>
                  <h3 style={{ fontSize: BASE, fontWeight: 700, color: COLORS.tealText, margin: '0 0 8px' }}>
                    Aménagements communs à la classe
                  </h3>
                  <p style={{ fontSize: SMALL, color: COLORS.muted, margin: '0 0 8px' }}>
                    Partagés par au moins un tiers des élèves suivis : les mettre en place
                    pour tout le groupe coûte moins cher que de les individualiser.
                  </p>
                  <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
                    {common.map(label => (
                      <li key={label} style={{ background: '#fff', border: `1px solid ${COLORS.teal}`, borderRadius: 14, padding: '4px 12px', fontSize: BASE, color: COLORS.tealText }}>
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {students.map(student => (
                <article key={student.id} style={{ border: `1px solid ${COLORS.border}`, borderTop: 'none', background: '#fff' }}>
                  <h3 style={{ padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`, fontSize: BASE, fontWeight: 700, color: COLORS.text, background: COLORS.bg, margin: 0 }}>
                    {student.name}
                  </h3>
                  {/* auto-fit : 3 colonnes sur desktop, empilement sur mobile */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                    {CATEGORIES.map(cat => {
                      const catARs = student.ars.filter(a => a.category === cat)
                      return (
                        <div key={cat} style={{ padding: '12px 14px', borderTop: `1px solid ${COLORS.border}` }}>
                          <div style={{ fontSize: SMALL, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                            {cat}
                          </div>
                          {catARs.length === 0
                            ? <span style={{ fontSize: BASE, color: COLORS.muted }}>Aucun</span>
                            : (
                              <ul style={{ margin: 0, paddingLeft: 20 }}>
                                {catARs.map((ar, i) => (
                                  <li key={i} style={{ fontSize: BASE, color: COLORS.text, marginBottom: 6 }}>
                                    {ar.label}
                                    {ar.has_precision && ar.precision_value && (
                                      <span style={{ color: COLORS.muted }}> ({ar.precision_value})</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                        </div>
                      )
                    })}
                  </div>
                </article>
              ))}
            </section>
          )
        })}

        <p style={{ fontSize: SMALL, color: COLORS.muted, textAlign: 'center', marginTop: 32 }}>
          Document confidentiel — usage pédagogique interne uniquement — PLAI Liège.<br />
          Ce lien est personnel : ne le transmettez pas.
        </p>
      </main>
    </div>
  )
}
