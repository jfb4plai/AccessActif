import { useState } from 'react'
import { useStudents } from '../../hooks/useStudents'
import StudentForm from '../../components/StudentForm'
import ARCheckList from '../../components/ARCheckList'

export default function StudentsPage() {
  const { students, loading, upsertStudent, deleteStudent } = useStudents()
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)

  if (loading) return <p style={{ color: '#9a958c', padding: 20 }}>Chargement…</p>

  // Grouper par classe
  const byClass = students.reduce((acc, s) => {
    const k = s.class_code || 'Sans classe'
    if (!acc[k]) acc[k] = []
    acc[k].push(s)
    return acc
  }, {})

  async function handleSave(data) {
    await upsertStudent(data)
    setShowForm(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cet élève et tous ses aménagements ?')) return
    await deleteStudent(id)
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1814', margin: 0 }}>Élèves</h2>
        <button onClick={() => { setSelected(null); setShowForm(true) }}
          style={{ background: '#0a9370', color: '#fff', border: 'none', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Ajouter un élève
        </button>
      </div>

      {showForm && (
        <StudentForm
          student={selected}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {Object.entries(byClass).sort().map(([cls, eleves]) => (
        <div key={cls} style={{ marginBottom: 24 }}>
          <div style={{ background: '#1a1814', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            {cls}
          </div>
          {eleves.map(s => (
            <div key={s.id}
              style={{
                background: selected?.id === s.id ? '#f0faf7' : '#fff',
                border: `1px solid ${selected?.id === s.id ? '#0a9370' : '#e8e4dd'}`,
                borderRadius: 8, padding: '10px 14px', marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer'
              }}
              onClick={() => { setSelected(s); setShowForm(true) }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1a1814' }}>{s.anonymous_code}</span>
              <span style={{ fontSize: 11, color: '#9a958c' }}>
                {s.acces_student_ars?.filter(a => a.is_active).length || 0} AR(s)
              </span>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(s.id) }}
                style={{ background: 'none', border: 'none', color: '#9a958c', cursor: 'pointer', fontSize: 13, padding: '0 4px' }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      ))}

      {selected && !showForm && <ARCheckList studentId={selected.id} />}
    </div>
  )
}
