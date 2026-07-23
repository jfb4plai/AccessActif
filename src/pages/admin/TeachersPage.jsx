import { useState } from 'react'
import { useTeachers } from '../../hooks/useTeachers'
import TeacherForm from '../../components/TeacherForm'
import StudentLinker from '../../components/StudentLinker'
import { supabase } from '../../lib/supabase'
import { BASE, SMALL, COLORS, btn, btnGhost, h2 } from '../../lib/ui'

async function callApi(path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  })
  return res.json()
}

export default function TeachersPage() {
  const { teachers, loading, error, upsertTeacher, deleteTeacher } = useTeachers()
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(null)
  const [result, setResult] = useState(null)

  if (loading) return <p style={{ color: COLORS.muted, padding: 20, fontSize: BASE }}>Chargement…</p>

  async function handleSave(data) {
    const saved = await upsertTeacher(data)
    setShowForm(false)
    setSelected(saved)
  }

  async function handleSendLink() {
    if (!selected) return
    setBusy('send'); setResult(null)
    try {
      const json = await callApi('/api/notify-teachers', { teacher_ids: [selected.id] })
      const r = json.results?.[0]
      setResult(r?.status === 'sent'
        ? { ok: true, msg: `Lien envoyé à ${selected.email} (version ${r.version}). Les liens précédents ne fonctionnent plus.` }
        : { ok: false, msg: r?.message || json.error || 'Erreur inconnue' })
    } catch (e) {
      setResult({ ok: false, msg: e.message })
    }
    setBusy(null)
  }

  async function handleRevoke() {
    if (!selected) return
    if (!window.confirm(
      `Révoquer les liens de ${selected.name} ?\n\n`
      + 'Ses liens en cours cesseront immédiatement de fonctionner. '
      + 'Vous pourrez lui en renvoyer un nouveau à tout moment.'
    )) return
    setBusy('revoke'); setResult(null)
    try {
      const json = await callApi('/api/revoke-token', { teacher_id: selected.id })
      setResult(json.error
        ? { ok: false, msg: json.error }
        : { ok: true, msg: `${json.revoked} lien(s) révoqué(s).` })
    } catch (e) {
      setResult({ ok: false, msg: e.message })
    }
    setBusy(null)
  }

  async function handleDelete(t) {
    if (!window.confirm(`Supprimer ${t.name} ? Ses assignations et ses liens seront perdus.`)) return
    await deleteTeacher(t.id)
    if (selected?.id === t.id) setSelected(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <h2 style={h2}>Enseignants</h2>
        <button onClick={() => { setSelected(null); setShowForm(true) }} style={btn}>
          + Ajouter un enseignant
        </button>
      </div>

      {error && (
        <div role="alert" style={{ background: '#fdf2f2', border: `1px solid ${COLORS.danger}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: BASE, color: COLORS.danger }}>
          Chargement impossible : {error}
        </div>
      )}

      {showForm && (
        <TeacherForm teacher={selected} onSave={handleSave} onCancel={() => setShowForm(false)} />
      )}

      {teachers.length === 0 && !showForm && (
        <p style={{ color: COLORS.muted, fontSize: BASE }}>Aucun enseignant encodé pour cette école.</p>
      )}

      {teachers.map(t => {
        const isSelected = selected?.id === t.id
        return (
          <div key={t.id}
            style={{
              background: isSelected ? '#f0faf7' : '#fff',
              border: `1px solid ${isSelected ? COLORS.teal : COLORS.border}`,
              borderRadius: 8, padding: '10px 14px', marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
            <button
              onClick={() => { setSelected(isSelected ? null : t); setShowForm(false); setResult(null) }}
              aria-expanded={isSelected}
              style={{ flex: '1 1 220px', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ display: 'block', fontSize: BASE, fontWeight: 600, color: COLORS.text }}>{t.name}</span>
              <span style={{ display: 'block', fontSize: SMALL, color: COLORS.muted }}>
                {t.email} — {t.subject || 'Matière non renseignée'}
              </span>
            </button>
            <span style={{ fontSize: SMALL, color: COLORS.muted }}>
              {t.acces_teacher_students?.length || 0} élève(s)
            </span>
            <button onClick={() => { setSelected(t); setShowForm(true) }}
              style={{ ...btnGhost, padding: '6px 14px', fontSize: SMALL }}>
              Modifier
            </button>
            <button onClick={() => handleDelete(t)}
              style={{ ...btnGhost, padding: '6px 14px', fontSize: SMALL }}>
              Supprimer
            </button>
          </div>
        )
      })}

      {selected && !showForm && (
        <>
          <StudentLinker teacherId={selected.id} />

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={handleSendLink} disabled={busy === 'send'}
              style={{ ...btn, background: busy === 'send' ? COLORS.muted : COLORS.orange }}>
              {busy === 'send' ? 'Envoi…' : 'Envoyer le lien magique'}
            </button>
            <button onClick={handleRevoke} disabled={busy === 'revoke'} style={btnGhost}>
              {busy === 'revoke' ? 'Révocation…' : 'Révoquer ses liens'}
            </button>
          </div>

          {result && (
            <p role="status" style={{ fontSize: BASE, marginTop: 10, color: result.ok ? COLORS.tealText : COLORS.danger }}>
              {result.msg}
            </p>
          )}
        </>
      )}
    </div>
  )
}
