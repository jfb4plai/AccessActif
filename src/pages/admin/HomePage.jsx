import { useState, useMemo } from 'react'
import { useTeachers } from '../../hooks/useTeachers'
import { useStudents } from '../../hooks/useStudents'
import { useVersions } from '../../hooks/useVersions'
import { useApp } from '../../lib/useApp'
import { callApi } from '../../lib/api'
import { BASE, SMALL, COLORS, btn, btnGhost, input, h2, h3, card, fullName } from '../../lib/ui'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function AlertCard({ count, label, tone, onClick }) {
  if (count === 0) return null
  const toneColors = {
    neutral: { bg: '#fff', border: COLORS.border, text: COLORS.muted },
    warning: { bg: '#fdf6ec', border: '#d99a3a', text: '#7a5a1a' },
  }
  const c = toneColors[tone] || toneColors.neutral
  return (
    <button onClick={onClick} type="button" style={{
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10,
      padding: '12px 16px', textAlign: 'left', cursor: onClick ? 'pointer' : 'default',
      fontFamily: 'inherit', flex: '1 1 220px',
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: c.text }}>{count}</div>
      <div style={{ fontSize: SMALL, color: c.text }}>{label}</div>
    </button>
  )
}

/** Statut d'un enseignant, du plus calme (rien à signaler) au plus urgent. */
function teacherStatus(entries, seen) {
  if (!entries?.length) return { key: 'unsent', label: 'Lien pas encore envoyé', color: COLORS.muted }
  const last = entries[0]
  if (!seen) return { key: 'unseen', label: `Envoyé le ${formatDate(last.sent_at)} — pas encore ouvert`, color: '#a06a1a' }
  return { key: 'seen', label: `Consulté ${seen.count} fois — dernière fois le ${formatDate(seen.last)}`, color: COLORS.tealText }
}

export default function HomePage({ onManageTeacher }) {
  const { teachers, loading: loadingTeachers } = useTeachers()
  const { students, loading: loadingStudents } = useStudents()
  const { versions, consultations, loading: loadingVersions, reload: reloadVersions } = useVersions()
  const { year } = useApp()
  const [search, setSearch] = useState('')
  const [filterAlert, setFilterAlert] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  const loading = loadingTeachers || loadingStudents || loadingVersions

  const versionsByTeacher = useMemo(() => versions.reduce((acc, v) => {
    (acc[v.teacher_id] ||= []).push(v)
    return acc
  }, {}), [versions])

  const rows = useMemo(() => teachers.map(t => {
    const entries = versionsByTeacher[t.id] || []
    return {
      teacher: t,
      entries,
      seen: consultations[t.id] || null,
      studentCount: t.acces_teacher_students?.length || 0,
      status: teacherStatus(entries, consultations[t.id]),
    }
  }), [teachers, versionsByTeacher, consultations])

  const studentsWithoutAR = useMemo(() =>
    students.filter(s => !(s.acces_student_ars || []).some(a => a.is_active)), [students])

  const overdueReviews = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const items = []
    for (const s of students) {
      for (const a of s.acces_student_ars || []) {
        if (a.is_active && a.review_due_on && a.review_due_on < today) items.push({ student: s, ar: a })
      }
    }
    return items
  }, [students])

  const neverSent = useMemo(() => rows.filter(r => r.status.key === 'unsent'), [rows])
  const neverOpened = useMemo(() => rows.filter(r => r.status.key === 'unseen'), [rows])

  const filteredRows = useMemo(() => {
    let r = rows
    if (filterAlert === 'unsent') r = r.filter(x => x.status.key === 'unsent')
    if (filterAlert === 'unseen') r = r.filter(x => x.status.key === 'unseen')
    const q = search.trim().toLowerCase()
    if (q) r = r.filter(x => x.teacher.name.toLowerCase().includes(q) || (x.teacher.subject || '').toLowerCase().includes(q))
    return r
  }, [rows, filterAlert, search])

  function toggleRow(id, checked) {
    setSelectedIds(ids => checked ? [...ids, id] : ids.filter(x => x !== id))
  }

  function toggleAllVisible(checked) {
    setSelectedIds(checked ? filteredRows.map(r => r.teacher.id) : [])
  }

  async function handleBulkSend() {
    if (!selectedIds.length) return
    setSending(true); setResult(null)
    try {
      const json = await callApi('/api/notify-teachers', { teacher_ids: selectedIds })
      const okCount = (json.results || []).filter(r => r.status === 'sent').length
      const failed = (json.results || []).filter(r => r.status !== 'sent')
      setResult(failed.length === 0
        ? { ok: true, msg: `${okCount} lien(s) envoyé(s). Les liens précédents ne fonctionnent plus.` }
        : { ok: false, msg: `${okCount} envoyé(s), ${failed.length} en échec (${failed.map(f => f.message || f.status).join(', ')}).` })
      setSelectedIds([])
      await reloadVersions()
    } catch (e) {
      setResult({ ok: false, msg: e.message })
    }
    setSending(false)
  }

  if (loading) return <p style={{ color: COLORS.muted, padding: 20, fontSize: BASE }}>Chargement…</p>

  const allVisibleSelected = filteredRows.length > 0 && filteredRows.every(r => selectedIds.includes(r.teacher.id))

  return (
    <div>
      <h2 style={{ ...h2, marginBottom: 4 }}>Accueil <span style={{ fontSize: BASE, fontWeight: 400, color: COLORS.muted }}>— {year}</span></h2>
      <p style={{ fontSize: SMALL, color: COLORS.muted, marginTop: 0, marginBottom: 20 }}>
        Ce qui mérite votre attention, puis le statut de chaque enseignant.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <AlertCard count={studentsWithoutAR.length} tone="neutral"
          label={studentsWithoutAR.length > 1 ? 'élèves sans aménagement encodé' : 'élève sans aménagement encodé'} />
        <AlertCard count={overdueReviews.length} tone="warning"
          label={overdueReviews.length > 1 ? 'aménagements à revoir (échéance dépassée)' : 'aménagement à revoir (échéance dépassée)'} />
        <AlertCard count={neverSent.length} tone="neutral"
          onClick={() => setFilterAlert(f => f === 'unsent' ? null : 'unsent')}
          label={neverSent.length > 1 ? 'enseignants sans lien envoyé' : 'enseignant sans lien envoyé'} />
        <AlertCard count={neverOpened.length} tone="warning"
          onClick={() => setFilterAlert(f => f === 'unseen' ? null : 'unseen')}
          label={neverOpened.length > 1 ? 'liens envoyés jamais ouverts' : 'lien envoyé jamais ouvert'} />
      </div>

      {overdueReviews.length > 0 && (
        <div style={{ ...card, marginBottom: 20, borderColor: '#d99a3a' }}>
          <h3 style={{ ...h3, marginBottom: 8 }}>Aménagements à revoir</h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {overdueReviews.slice(0, 8).map(({ student, ar }) => (
              <li key={ar.id} style={{ fontSize: BASE, color: COLORS.text, marginBottom: 4 }}>
                {fullName(student)} — échéance du {formatDate(ar.review_due_on)}
              </li>
            ))}
          </ul>
          {overdueReviews.length > 8 && (
            <p style={{ fontSize: SMALL, color: COLORS.muted, margin: '8px 0 0' }}>
              + {overdueReviews.length - 8} autre(s). Ouvrez l'onglet Élèves pour les traiter un par un.
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <h3 style={{ ...h3, marginBottom: 0 }}>Enseignants</h3>
        {filterAlert && (
          <button onClick={() => setFilterAlert(null)} style={{ ...btnGhost, padding: '6px 14px', fontSize: SMALL }}>
            Filtre actif — tout afficher
          </button>
        )}
      </div>

      {teachers.length > 6 && (
        <input type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un nom, une matière…"
          style={{ ...input, marginBottom: 12, maxWidth: 360 }} />
      )}

      {teachers.length === 0 && (
        <p style={{ color: COLORS.muted, fontSize: BASE }}>Aucun enseignant encodé pour cette école.</p>
      )}

      {teachers.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '0 4px' }}>
            <input type="checkbox" checked={allVisibleSelected} onChange={e => toggleAllVisible(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: COLORS.teal }}
              aria-label="Sélectionner tous les enseignants affichés" />
            <span style={{ fontSize: SMALL, color: COLORS.muted }}>
              {selectedIds.length > 0 ? `${selectedIds.length} sélectionné(s)` : 'Tout sélectionner'}
            </span>
            <button onClick={handleBulkSend} disabled={!selectedIds.length || sending}
              style={{ ...btn, marginLeft: 'auto', padding: '8px 18px', fontSize: SMALL,
                background: (!selectedIds.length || sending) ? COLORS.muted : COLORS.orange }}>
              {sending ? 'Envoi…' : `Envoyer à la sélection (${selectedIds.length})`}
            </button>
          </div>

          {result && (
            <p role="status" style={{ fontSize: BASE, marginBottom: 12, color: result.ok ? COLORS.tealText : COLORS.danger }}>
              {result.msg}
            </p>
          )}

          {filteredRows.length === 0 && (
            <p style={{ color: COLORS.muted, fontSize: BASE }}>Aucun enseignant ne correspond.</p>
          )}

          {filteredRows.map(({ teacher, studentCount, status }) => (
            <div key={teacher.id} style={{
              background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 8,
              padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              <input type="checkbox" checked={selectedIds.includes(teacher.id)}
                onChange={e => toggleRow(teacher.id, e.target.checked)}
                style={{ width: 18, height: 18, accentColor: COLORS.teal, flexShrink: 0 }}
                aria-label={`Sélectionner ${teacher.name}`} />
              <div style={{ flex: '1 1 220px' }}>
                <span style={{ fontSize: BASE, fontWeight: 700, color: COLORS.text }}>{teacher.name}</span>
                <span style={{ fontSize: SMALL, color: COLORS.muted, marginLeft: 8 }}>
                  {studentCount} élève(s){teacher.subject ? ` — ${teacher.subject}` : ''}
                </span>
              </div>
              <span style={{ fontSize: SMALL, color: status.color, fontWeight: 600 }}>{status.label}</span>
              <button onClick={() => onManageTeacher(teacher.id)} style={{ ...btnGhost, padding: '6px 14px', fontSize: SMALL }}>
                Gérer
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
