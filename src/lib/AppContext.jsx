import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { currentSchoolYear } from './ui'
import { AppCtx } from './appCtx'

// Contexte de travail de la référente : l'école qu'elle consulte et l'année
// scolaire affichée. Un membre du PLAI peut intervenir dans plusieurs écoles
// (fondamental) ou dans une seule (secondaire).

export function AppProvider({ children }) {
  const [schools, setSchools] = useState([])
  const [schoolId, setSchoolId] = useState(null)
  const [year, setYear] = useState(currentSchoolYear())
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }

      const { data: ref } = await supabase
        .from('acces_referentes').select('role').eq('id', user.id).single()

      // Un super_admin voit toutes les écoles ; une référente, celles où
      // elle intervient (acces_referente_schools).
      const query = ref?.role === 'super_admin'
        ? supabase.from('acces_schools').select('id, name, type').order('name')
        : supabase.from('acces_referente_schools')
            .select('acces_schools(id, name, type)')
            .eq('referente_id', user.id)

      const { data, error: qErr } = await query
      if (cancelled) return

      if (qErr) { setError(qErr.message); setLoading(false); return }

      const list = ref?.role === 'super_admin'
        ? (data || [])
        : (data || []).map(r => r.acces_schools).filter(Boolean)

      list.sort((a, b) => a.name.localeCompare(b.name))
      setRole(ref?.role || null)
      setSchools(list)
      setSchoolId(prev => prev ?? list[0]?.id ?? null)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  const value = {
    schools, schoolId, setSchoolId,
    year, setYear,
    role, loading, error,
    school: schools.find(s => s.id === schoolId) || null,
    isSuperAdmin: role === 'super_admin',
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
