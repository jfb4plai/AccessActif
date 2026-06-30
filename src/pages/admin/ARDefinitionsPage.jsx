import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const CATEGORIES = ['Matériels', 'Pédagogiques', 'Organisationnels']
const STATUS_LABELS = { active: 'Actif', proposed: 'Proposé', rejected: 'Rejeté' }
const STATUS_COLORS = { active: '#0a9370', proposed: '#f97316', rejected: '#a32d2d' }

export default function ARDefinitionsPage() {
  const [defs, setDefs] = useState([])
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newAR, setNewAR] = useState({ label: '', category: 'Matériels', has_precision: false, precision_label: '' })
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('active')

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: ref } = await supabase.from('acces_referentes').select('role').eq('id', user.id).single()
    setRole(ref?.role)

    let query = supabase.from('acces_ar_definitions').select('*').order('category').order('label')

    // super_admin voit tout, les autres voient actif + leurs propres propositions
    if (ref?.role === 'super_admin') {
      // pas de filtre : retourne active + proposed + rejected
    } else {
      query = query.or(`status.eq.active,and(status.eq.proposed,created_by.eq.${user.id})`)
    }

    const { data } = await query
    setDefs(data || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function handlePropose(e) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const status = role === 'super_admin' ? 'active' : 'proposed'
    await supabase.from('acces_ar_definitions').insert({
      ...newAR,
      status,
      created_by: user.id,
      precision_label: newAR.has_precision ? newAR.precision_label : null,
    })
    setNewAR({ label: '', category: 'Matériels', has_precision: false, precision_label: '' })
    setShowForm(false)
    await loadAll()
    setSaving(false)
  }

  async function handleStatus(id, status) {
    await supabase.from('acces_ar_definitions').update({ status }).eq('id', id)
    await loadAll()
  }

  const filtered = defs.filter(d => filter === 'all' ? true : d.status === filter)
  const byCategory = filtered.reduce((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d)
    return acc
  }, {})

  if (loading) return <p style={{ color: '#9a958c', padding: 20 }}>Chargement…</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1814', margin: 0 }}>ARs & propositions</h2>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: '#0a9370', color: '#fff', border: 'none', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {role === 'super_admin' ? '+ Ajouter un AR' : '+ Proposer un AR'}
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(role === 'super_admin'
          ? [['active','Actifs'],['proposed','Proposés'],['rejected','Rejetés'],['all','Tous']]
          : [['active','Actifs'],['proposed','Proposés']]
        ).map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{
              background: filter === val ? '#1a1814' : 'transparent',
              color: filter === val ? '#fff' : '#5a564f',
              border: '1px solid #d4cfc6', borderRadius: 20,
              padding: '4px 12px', fontSize: 12, cursor: 'pointer'
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Formulaire proposition */}
      {showForm && (
        <form onSubmit={handlePropose} style={{ background: '#fff', border: '1px solid #e8e4dd', borderRadius: 10, padding: '20px 24px', marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#1a1814' }}>
            {role === 'super_admin' ? 'Ajouter un AR' : 'Proposer un AR'}
          </h3>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5a564f', display: 'block', marginBottom: 4 }}>Libellé *</label>
            <input value={newAR.label} onChange={e => setNewAR(p => ({ ...p, label: e.target.value }))} required
              placeholder="Ex: Utiliser une calculatrice"
              style={{ width: '100%', border: '1px solid #d4cfc6', borderRadius: 6, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 10, display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#5a564f', display: 'block', marginBottom: 4 }}>Catégorie *</label>
              <select value={newAR.category} onChange={e => setNewAR(p => ({ ...p, category: e.target.value }))}
                style={{ width: '100%', border: '1px solid #d4cfc6', borderRadius: 6, padding: '7px 10px', fontSize: 13 }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={newAR.has_precision} onChange={e => setNewAR(p => ({ ...p, has_precision: e.target.checked }))}
                  style={{ accentColor: '#0a9370' }} />
                Précision requise
              </label>
            </div>
          </div>
          {newAR.has_precision && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#5a564f', display: 'block', marginBottom: 4 }}>Label de précision</label>
              <input value={newAR.precision_label} onChange={e => setNewAR(p => ({ ...p, precision_label: e.target.value }))}
                placeholder="Ex: Durée de la pause (minutes)"
                style={{ width: '100%', border: '1px solid #d4cfc6', borderRadius: 6, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving}
              style={{ background: saving ? '#9a958c' : '#0a9370', color: '#fff', border: 'none', borderRadius: 20, padding: '7px 20px', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'Enregistrement…' : (role === 'super_admin' ? 'Ajouter' : 'Proposer')}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ background: 'none', border: '1px solid #d4cfc6', borderRadius: 20, padding: '7px 16px', fontSize: 13, color: '#5a564f', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Liste par catégorie */}
      {CATEGORIES.map(cat => {
        const items = byCategory[cat] || []
        if (!items.length) return null
        return (
          <div key={cat} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0a9370', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{cat}</div>
            {items.map(d => (
              <div key={d.id} style={{ background: '#fff', border: '1px solid #e8e4dd', borderRadius: 6, padding: '9px 14px', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, color: '#1a1814' }}>{d.label}</span>
                  {d.has_precision && <span style={{ fontSize: 11, color: '#9a958c', marginLeft: 8 }}>({d.precision_label})</span>}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLORS[d.status], textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {STATUS_LABELS[d.status]}
                </span>
                {role === 'super_admin' && d.status === 'proposed' && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => handleStatus(d.id, 'active')}
                      style={{ background: '#0a9370', color: '#fff', border: 'none', borderRadius: 12, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>
                      Valider
                    </button>
                    <button onClick={() => handleStatus(d.id, 'rejected')}
                      style={{ background: 'none', border: '1px solid #a32d2d', color: '#a32d2d', borderRadius: 12, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>
                      Rejeter
                    </button>
                  </div>
                )}
                {role === 'super_admin' && d.status === 'active' && (
                  <button onClick={() => handleStatus(d.id, 'rejected')}
                    style={{ background: 'none', border: '1px solid #d4cfc6', color: '#9a958c', borderRadius: 12, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>
                    Désactiver
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
