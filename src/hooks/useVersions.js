import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/useApp'

export function useVersions() {
  const { schoolId } = useApp()
  const [versions, setVersions] = useState([])
  const [consultations, setConsultations] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!schoolId) { setVersions([]); setLoading(false); return }
    setLoading(true)

    const { data } = await supabase
      .from('acces_versions')
      .select('*, acces_teachers(name, email, subject)')
      .eq('school_id', schoolId)
      .order('sent_at', { ascending: false })

    // Le journal d'accès était alimenté depuis le début et n'était lu nulle
    // part : on transforme un suivi d'envoi en suivi de réception.
    const { data: log } = await supabase
      .from('acces_access_log')
      .select('teacher_id, accessed_at')
      .order('accessed_at', { ascending: false })

    const stats = {}
    for (const row of log || []) {
      if (!row.teacher_id) continue
      if (!stats[row.teacher_id]) stats[row.teacher_id] = { count: 0, last: row.accessed_at }
      stats[row.teacher_id].count += 1
    }

    setVersions(data || [])
    setConsultations(stats)
    setLoading(false)
  }, [schoolId])

  useEffect(() => { load() }, [load])
  return { versions, consultations, loading, reload: load }
}
