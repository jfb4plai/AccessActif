import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useVersions() {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('acces_versions')
      .select('*, acces_teachers(name, email, subject)')
      .order('sent_at', { ascending: false })
    setVersions(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  return { versions, loading, reload: load }
}
