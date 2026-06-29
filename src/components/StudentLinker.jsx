import { useTeacherStudents } from '../hooks/useTeachers'

export default function StudentLinker({ teacherId }) {
  const { linkedStudentIds, allStudents, loading, toggleStudent } = useTeacherStudents(teacherId)

  if (loading) return <p style={{ color: '#9a958c', fontSize: 13, padding: '10px 0' }}>Chargement…</p>

  const byClass = allStudents.reduce((acc, s) => {
    const k = s.class_code || 'Sans classe'
    if (!acc[k]) acc[k] = []
    acc[k].push(s)
    return acc
  }, {})

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e4dd', borderRadius: 10, padding: '20px 24px', marginTop: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#1a1814' }}>Élèves assignés</h3>
      <p style={{ fontSize: 12, color: '#9a958c', marginBottom: 16 }}>
        Seuls les ARs des élèves cochés seront visibles par cet enseignant dans son lien magique.
      </p>
      {Object.entries(byClass).sort().map(([cls, students]) => (
        <div key={cls} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0a9370', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            {cls}
          </div>
          {students.map(s => {
            const linked = linkedStudentIds.includes(s.id)
            return (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={linked}
                  onChange={e => toggleStudent(s.id, e.target.checked)}
                  style={{ accentColor: '#0a9370' }} />
                <span style={{ fontSize: 13, color: '#1a1814' }}>{s.anonymous_code}</span>
                <span style={{ fontSize: 11, color: '#9a958c' }}>({cls})</span>
              </label>
            )
          })}
        </div>
      ))}
    </div>
  )
}
