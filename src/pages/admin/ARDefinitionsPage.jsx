import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../lib/useApp'
import { BASE, SMALL, COLORS, input, label, help, btn, btnGhost, card, h2, h3 } from '../../lib/ui'

const CATEGORIES = ['Matériels', 'Pédagogiques', 'Organisationnels']
const STATUS_LABELS = { active: 'Actif', proposed: 'Proposé', rejected: 'Retiré' }
const STATUS_COLORS = { active: COLORS.tealText, proposed: COLORS.orange, rejected: COLORS.danger }

export default function ARDefinitionsPage() {
  const { isSuperAdmin } = useApp()
  const [defs, setDefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newAR, setNewAR] = useState({ label: '', category: 'Matériels', has_precision: false, precision_label: '' })
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('active')
  const [error, setError] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    let query = supabase.from('acces_ar_definitions').select('*').order('category').order('label')
    // Un super_admin voit tout ; les autres, les AU actifs et leurs propres propositions.
    if (!isSuperAdmin) {
      query = query.or(`status.eq.active,and(status.eq.proposed,created_by.eq.${user.id})`)
    }

    const { data, error: err } = await query
    setError(err?.message || null)
    setDefs(data || [])
    setLoading(false)
  }, [isSuperAdmin])

  useEffect(() => { loadAll() }, [loadAll])

  async function handlePropose(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('acces_ar_definitions').insert({
      ...newAR,
      label: newAR.label.trim(),
      status: isSuperAdmin ? 'active' : 'proposed',
      created_by: user.id,
      precision_label: newAR.has_precision ? newAR.precision_label.trim() : null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setNewAR({ label: '', category: 'Matériels', has_precision: false, precision_label: '' })
    setShowForm(false)
    await loadAll()
  }

  async function handleStatus(id, status) {
    setError(null)
    const { error: err } = await supabase.from('acces_ar_definitions').update({ status }).eq('id', id)
    if (err) { setError(err.message); return }
    await loadAll()
  }

  if (loading) return <p style={{ color: COLORS.muted, padding: 20, fontSize: BASE }}>Chargement…</p>

  const filtered = defs.filter(d => filter === 'all' || d.status === filter)
  const byCategory = filtered.reduce((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d)
    return acc
  }, {})

  const filters = isSuperAdmin
    ? [['active', 'Actifs'], ['proposed', 'Proposés'], ['rejected', 'Retirés'], ['all', 'Tous']]
    : [['active', 'Actifs'], ['proposed', 'Mes propositions']]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <h2 style={h2}>Aménagements & propositions</h2>
        <button onClick={() => setShowForm(s => !s)} style={btn}>
          {isSuperAdmin ? '+ Ajouter un aménagement' : '+ Proposer un aménagement'}
        </button>
      </div>
      <p style={{ fontSize: SMALL, color: COLORS.muted, marginTop: 0, marginBottom: 20 }}>
        Liste partagée par toutes les écoles du Pôle. Proposer plutôt que créer librement
        garantit qu'un même aménagement porte le même nom partout — c'est ce qui rend
        les comparaisons entre écoles possibles.
      </p>

      {error && (
        <div role="alert" style={{ background: '#fdf2f2', border: `1px solid ${COLORS.danger}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: BASE, color: COLORS.danger }}>
          Opération impossible : {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {filters.map(([val, text]) => (
          <button key={val} onClick={() => setFilter(val)}
            aria-pressed={filter === val}
            style={{
              background: filter === val ? COLORS.text : 'transparent',
              color: filter === val ? '#fff' : COLORS.muted,
              border: `1px solid ${COLORS.borderStrong}`, borderRadius: 20,
              padding: '6px 14px', fontSize: SMALL, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {text}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handlePropose} style={{ ...card, marginBottom: 20 }}>
          <h3 style={h3}>{isSuperAdmin ? 'Ajouter un aménagement' : 'Proposer un aménagement'}</h3>
          <div>
            <label style={label} htmlFor="ar-label">Libellé *</label>
            <input id="ar-label" value={newAR.label} onChange={e => setNewAR(p => ({ ...p, label: e.target.value }))} required
              placeholder="Ex : Fiche outil plastifiée disponible en atelier" style={input} />
            <p style={help}>
              Formulez une action observable par l'enseignant, pas un objectif.
              C'est ce texte exact qui apparaîtra sur son document.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 220px' }}>
              <label style={label} htmlFor="ar-cat">Catégorie *</label>
              <select id="ar-cat" value={newAR.category} onChange={e => setNewAR(p => ({ ...p, category: e.target.value }))}
                style={input}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <p style={help}>Matériel fourni, geste pédagogique, ou organisation du travail.</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: BASE, cursor: 'pointer', paddingTop: 28 }}>
              <input type="checkbox" checked={newAR.has_precision}
                onChange={e => setNewAR(p => ({ ...p, has_precision: e.target.checked }))}
                style={{ width: 18, height: 18, accentColor: COLORS.teal }} />
              Demande une précision
            </label>
          </div>
          {newAR.has_precision && (
            <div>
              <label style={label} htmlFor="ar-prec">Intitulé de la précision</label>
              <input id="ar-prec" value={newAR.precision_label}
                onChange={e => setNewAR(p => ({ ...p, precision_label: e.target.value }))}
                placeholder="Ex : Durée de la pause (minutes)" style={input} />
              <p style={help}>
                La référente devra remplir ce champ pour chaque élève concerné.
                À utiliser quand une même mesure varie d'un élève à l'autre.
              </p>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving}
              style={{ ...btn, background: saving ? COLORS.muted : COLORS.teal }}>
              {saving ? 'Enregistrement…' : (isSuperAdmin ? 'Ajouter' : 'Proposer')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={btnGhost}>Annuler</button>
          </div>
        </form>
      )}

      {filtered.length === 0 && (
        <p style={{ color: COLORS.muted, fontSize: BASE }}>Aucun aménagement dans cette vue.</p>
      )}

      {CATEGORIES.map(cat => {
        const items = byCategory[cat] || []
        if (!items.length) return null
        return (
          <section key={cat} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: BASE, fontWeight: 700, color: COLORS.tealText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              {cat} <span style={{ color: COLORS.muted, fontWeight: 400, textTransform: 'none' }}>({items.length})</span>
            </h3>
            {items.map(d => (
              <div key={d.id} style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 260px' }}>
                  <span style={{ fontSize: BASE, color: COLORS.text }}>{d.label}</span>
                  {d.has_precision && (
                    <span style={{ fontSize: SMALL, color: COLORS.muted, marginLeft: 8 }}>({d.precision_label})</span>
                  )}
                </div>
                <span style={{ fontSize: SMALL, fontWeight: 700, color: STATUS_COLORS[d.status], textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {STATUS_LABELS[d.status]}
                </span>
                {isSuperAdmin && d.status === 'proposed' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleStatus(d.id, 'active')}
                      style={{ ...btn, padding: '5px 14px', fontSize: SMALL }}>Valider</button>
                    <button onClick={() => handleStatus(d.id, 'rejected')}
                      style={{ ...btnGhost, padding: '5px 14px', fontSize: SMALL, borderColor: COLORS.danger, color: COLORS.danger }}>Rejeter</button>
                  </div>
                )}
                {isSuperAdmin && d.status === 'active' && (
                  <button onClick={() => handleStatus(d.id, 'rejected')}
                    style={{ ...btnGhost, padding: '5px 14px', fontSize: SMALL }}>Retirer</button>
                )}
                {isSuperAdmin && d.status === 'rejected' && (
                  <button onClick={() => handleStatus(d.id, 'active')}
                    style={{ ...btnGhost, padding: '5px 14px', fontSize: SMALL }}>Réactiver</button>
                )}
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
