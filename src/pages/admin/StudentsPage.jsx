import { useState, useMemo } from 'react'
import { useStudents } from '../../hooks/useStudents'
import { useApp } from '../../lib/useApp'
import StudentForm from '../../components/StudentForm'
import ARCheckList from '../../components/ARCheckList'
import { BASE, SMALL, COLORS, btn, btnGhost, input, h2 } from '../../lib/ui'
import { fullName } from '../../lib/ui'

export default function StudentsPage() {
  const { students, loading, error, upsertStudent, archiveStudent, carryOverFrom } = useStudents()
  const { year, school } = useApp()
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [carry, setCarry] = useState(null)

  const previousYear = useMemo(() => {
    const [start] = year.split('-').map(Number)
    return `${start - 1}-${start}`
  }, [year])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter(s =>
      fullName(s).toLowerCase().includes(q)
      || (s.class_code || '').toLowerCase().includes(q)
      || (s.anonymous_code || '').toLowerCase().includes(q)
    )
  }, [students, search])

  const byClass = useMemo(() => filtered.reduce((acc, s) => {
    const k = s.class_code || 'Sans classe'
    if (!acc[k]) acc[k] = []
    acc[k].push(s)
    return acc
  }, {}), [filtered])

  async function handleSave(data) {
    const saved = await upsertStudent(data)
    setShowForm(false)
    setSelected(saved)
  }

  async function handleArchive(s) {
    if (!window.confirm(
      `Retirer ${fullName(s)} de la liste ${year} ?\n\n`
      + 'Ses aménagements et leur historique sont conservés mais ne seront plus affichés.'
    )) return
    await archiveStudent(s.id)
    if (selected?.id === s.id) setSelected(null)
  }

  async function handleCarryOver() {
    if (!window.confirm(
      `Reprendre les élèves de ${previousYear} dans ${year} ?\n\n`
      + 'Les élèves et leurs aménagements sont recopiés. Vous pourrez ensuite ajuster '
      + 'et retirer ceux qui ne sont plus concernés. Aucun élève déjà repris ne sera dupliqué.'
    )) return
    setCarry({ busy: true })
    try {
      const n = await carryOverFrom(previousYear)
      setCarry({ msg: n > 0
        ? `${n} élève(s) repris depuis ${previousYear}. Vérifiez chaque dossier avant d'envoyer les liens.`
        : `Aucun élève à reprendre depuis ${previousYear}.` })
    } catch (e) {
      setCarry({ err: e.message })
    }
  }

  if (loading) return <p style={{ color: COLORS.muted, padding: 20, fontSize: BASE }}>Chargement…</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <h2 style={h2}>Élèves <span style={{ fontSize: BASE, fontWeight: 400, color: COLORS.muted }}>— {year}</span></h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {students.length === 0 && (
            <button onClick={handleCarryOver} disabled={carry?.busy} style={btnGhost}>
              {carry?.busy ? 'Reprise…' : `Reprendre les élèves de ${previousYear}`}
            </button>
          )}
          <button onClick={() => { setSelected(null); setShowForm(true) }} style={btn}>
            + Ajouter un élève
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ background: '#fdf2f2', border: `1px solid ${COLORS.danger}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: BASE, color: COLORS.danger }}>
          Chargement impossible : {error}
        </div>
      )}

      {carry?.msg && (
        <div role="status" style={{ background: '#e8f5f0', border: `1px solid ${COLORS.teal}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: BASE, color: COLORS.tealText }}>
          {carry.msg}
        </div>
      )}
      {carry?.err && (
        <div role="alert" style={{ background: '#fdf2f2', border: `1px solid ${COLORS.danger}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: BASE, color: COLORS.danger }}>
          Reprise impossible : {carry.err}
        </div>
      )}

      {students.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="student-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            Rechercher un élève
          </label>
          <input id="student-search" type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un nom, une classe…"
            style={{ ...input, marginBottom: 4, maxWidth: 360 }} />
          <p style={{ fontSize: SMALL, color: COLORS.muted, margin: 0 }}>
            {filtered.length} élève(s) sur {students.length}
            {school ? ` — ${school.name}` : ''}
          </p>
        </div>
      )}

      {showForm && (
        <StudentForm student={selected} onSave={handleSave} onCancel={() => setShowForm(false)} />
      )}

      {students.length === 0 && !showForm && (
        <p style={{ color: COLORS.muted, fontSize: BASE }}>
          Aucun élève encodé pour {year}. Ajoutez-en un, ou reprenez la liste de {previousYear}.
        </p>
      )}

      {Object.entries(byClass).sort().map(([cls, eleves]) => (
        <div key={cls} style={{ marginBottom: 24 }}>
          <h3 style={{ background: COLORS.text, color: '#fff', padding: '8px 14px', borderRadius: 6, fontSize: BASE, fontWeight: 700, marginBottom: 8 }}>
            {cls}
          </h3>
          {eleves.map(s => {
            const isSelected = selected?.id === s.id
            return (
              <div key={s.id}
                style={{
                  background: isSelected ? '#f0faf7' : '#fff',
                  border: `1px solid ${isSelected ? COLORS.teal : COLORS.border}`,
                  borderRadius: 8, padding: '10px 14px', marginBottom: 6,
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                }}>
                <button
                  onClick={() => { setSelected(isSelected ? null : s); setShowForm(false) }}
                  aria-expanded={isSelected}
                  style={{ flex: '1 1 200px', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: BASE, fontWeight: 600, color: COLORS.text, fontFamily: 'inherit' }}>
                  {fullName(s)}
                </button>
                <span style={{ fontSize: SMALL, color: COLORS.muted }}>
                  {s.acces_student_ars?.filter(a => a.is_active).length || 0} aménagement(s)
                </span>
                <button onClick={() => { setSelected(s); setShowForm(true) }}
                  style={{ ...btnGhost, padding: '6px 14px', fontSize: SMALL }}>
                  Modifier
                </button>
                <button onClick={() => handleArchive(s)}
                  style={{ ...btnGhost, padding: '6px 14px', fontSize: SMALL, borderColor: COLORS.borderStrong }}>
                  Retirer
                </button>
              </div>
            )
          })}
        </div>
      ))}

      {selected && !showForm && <ARCheckList student={selected} />}
    </div>
  )
}
