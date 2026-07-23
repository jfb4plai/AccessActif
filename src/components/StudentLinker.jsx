import { useState, useMemo } from 'react'
import { useTeacherStudents } from '../hooks/useTeachers'
import { BASE, SMALL, COLORS, card, h3, input, fullName } from '../lib/ui'

export default function StudentLinker({ teacherId }) {
  const { linkedStudentIds, allStudents, loading, toggleStudent } = useTeacherStudents(teacherId)
  const [search, setSearch] = useState('')

  const byClass = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allStudents
      .filter(s => !q || fullName(s).toLowerCase().includes(q) || (s.class_code || '').toLowerCase().includes(q))
      .reduce((acc, s) => {
        const k = s.class_code || 'Sans classe'
        if (!acc[k]) acc[k] = []
        acc[k].push(s)
        return acc
      }, {})
  }, [allStudents, search])

  if (loading) return <p style={{ color: COLORS.muted, fontSize: BASE, padding: '10px 0' }}>Chargement…</p>

  return (
    <div style={{ ...card, marginTop: 16 }}>
      <h3 style={{ ...h3, marginBottom: 4 }}>Élèves assignés</h3>
      <p style={{ fontSize: SMALL, color: COLORS.muted, marginTop: 0, marginBottom: 14 }}>
        Cet enseignant ne verra que les élèves cochés ici, et uniquement leurs
        aménagements — jamais leur diagnostic. {linkedStudentIds.length} élève(s) coché(s).
      </p>

      {allStudents.length > 6 && (
        <>
          <label htmlFor="linker-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            Rechercher un élève à assigner
          </label>
          <input id="linker-search" type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un nom, une classe…"
            style={{ ...input, maxWidth: 320, marginBottom: 16 }} />
        </>
      )}

      {allStudents.length === 0 && (
        <p style={{ fontSize: BASE, color: COLORS.muted }}>
          Aucun élève encodé pour cette école et cette année scolaire.
        </p>
      )}

      {Object.entries(byClass).sort().map(([cls, students]) => (
        <fieldset key={cls} style={{ border: 'none', padding: 0, margin: '0 0 18px' }}>
          <legend style={{ fontSize: BASE, fontWeight: 700, color: COLORS.tealText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, padding: 0 }}>
            {cls}
          </legend>
          {students.map(s => (
            <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={linkedStudentIds.includes(s.id)}
                onChange={e => toggleStudent(s.id, e.target.checked)}
                style={{ width: 18, height: 18, accentColor: COLORS.teal, flexShrink: 0 }} />
              <span style={{ fontSize: BASE, color: COLORS.text }}>{fullName(s)}</span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  )
}
