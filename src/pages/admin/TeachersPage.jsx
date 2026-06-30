import { useState } from 'react'
import { useTeachers } from '../../hooks/useTeachers'
import TeacherForm from '../../components/TeacherForm'
import StudentLinker from '../../components/StudentLinker'
import { supabase } from '../../lib/supabase'

export default function TeachersPage() {
  const { teachers, loading, upsertTeacher, deleteTeacher } = useTeachers()
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  if (loading) return <p style={{ color: '#9a958c', padding: 20 }}>Chargement…</p>

  async function handleSave(data) {
    await upsertTeacher(data)
    setShowForm(false)
  }

  async function handleSendLink() {
    if (!selected) return
    setSending(true)
    setSendResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/notify-teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ teacher_ids: [selected.id] }),
      })
      const json = await res.json()
      const r = json.results?.[0]
      if (r?.status === 'sent') setSendResult({ ok: true, msg: `Lien envoyé (v${r.version})` })
      else setSendResult({ ok: false, msg: r?.message || 'Erreur inconnue' })
    } catch (e) {
      setSendResult({ ok: false, msg: e.message })
    }
    setSending(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cet enseignant ? Ses assignations seront perdues.')) return
    await deleteTeacher(id)
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1814', margin: 0 }}>Enseignants</h2>
        <button onClick={() => { setSelected(null); setShowForm(true) }}
          style={{ background: '#0a9370', color: '#fff', border: 'none', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Ajouter un enseignant
        </button>
      </div>

      {showForm && (
        <TeacherForm
          teacher={selected}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {teachers.map(t => (
        <div key={t.id}
          style={{
            background: selected?.id === t.id ? '#f0faf7' : '#fff',
            border: `1px solid ${selected?.id === t.id ? '#0a9370' : '#e8e4dd'}`,
            borderRadius: 8, padding: '10px 14px', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer'
          }}
          onClick={() => { setSelected(t); setShowForm(false) }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1814' }}>{t.name}</div>
            <div style={{ fontSize: 11, color: '#9a958c' }}>{t.email} — {t.subject || 'Matière non renseignée'}</div>
          </div>
          <span style={{ fontSize: 11, color: '#9a958c' }}>
            {t.acces_teacher_students?.length || 0} élève(s)
          </span>
          <button
            onClick={e => { e.stopPropagation(); handleDelete(t.id) }}
            style={{ background: 'none', border: 'none', color: '#9a958c', cursor: 'pointer', fontSize: 13 }}>
            ✕
          </button>
        </div>
      ))}

      {selected && !showForm && <StudentLinker teacherId={selected.id} />}

      {selected && !showForm && (
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleSendLink} disabled={sending}
            style={{ background: sending ? '#9a958c' : '#f97316', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: sending ? 'default' : 'pointer' }}>
            {sending ? 'Envoi…' : 'Envoyer le lien magique'}
          </button>
          {sendResult && (
            <span style={{ fontSize: 12, color: sendResult.ok ? '#0a9370' : '#a32d2d' }}>
              {sendResult.msg}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
