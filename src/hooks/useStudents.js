import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/useApp'

export function useStudents() {
  const { schoolId, year } = useApp()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!schoolId) { setStudents([]); setLoading(false); return }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('acces_students')
      .select('*, acces_student_ars(id, is_active)')
      .eq('school_id', schoolId)
      .eq('school_year', year)
      .is('archived_at', null)
      // Tri sur l'ordre affiché (prénom puis nom), sinon la liste
      // paraît désordonnée à l'écran.
      .order('class_code')
      .order('first_name')
      .order('last_name')
    setError(err?.message || null)
    setStudents(data || [])
    setLoading(false)
  }, [schoolId, year])

  async function upsertStudent(student) {
    const payload = { ...student, school_id: student.school_id || schoolId, school_year: student.school_year || year }
    const { data, error: err } = await supabase
      .from('acces_students')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()
    if (err) throw err
    await load()
    return data
  }

  /** Suppression logique : l'historique d'aménagements doit survivre à un clic. */
  async function archiveStudent(id) {
    const { error: err } = await supabase
      .from('acces_students')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw err
    await load()
  }

  /**
   * Reprise d'une année sur l'autre. Duplique élèves + aménagements dans
   * l'année courante ; la référente valide et élague ensuite.
   * Idempotent côté SQL : relancer ne crée pas de doublon.
   */
  async function carryOverFrom(fromYear) {
    const { data, error: err } = await supabase.rpc('acces_carry_over_year', {
      p_school_id: schoolId,
      p_from: fromYear,
      p_to: year,
    })
    if (err) throw err
    await load()
    return data
  }

  useEffect(() => { load() }, [load])
  return { students, loading, error, upsertStudent, archiveStudent, carryOverFrom, reload: load }
}

export function useStudentARs(studentId) {
  const [ars, setArs] = useState([])
  const [definitions, setDefinitions] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!studentId) { setLoading(false); return }
    setLoading(true)
    const [{ data: defs }, { data: studentArs }, { data: hist }] = await Promise.all([
      supabase.from('acces_ar_definitions').select('*')
        .eq('status', 'active').order('category').order('label'),
      supabase.from('acces_student_ars').select('*').eq('student_id', studentId),
      supabase.from('acces_ar_history')
        .select('*, acces_ar_definitions(label), acces_referentes(name)')
        .eq('student_id', studentId)
        .order('decided_at', { ascending: false })
        .limit(50),
    ])
    setDefinitions(defs || [])
    setArs(studentArs || [])
    setHistory(hist || [])
    setLoading(false)
  }, [studentId])

  async function toggleAR(arDefinitionId, isActive, precisionValue = null, reviewDueOn = null) {
    const existing = ars.find(a => a.ar_definition_id === arDefinitionId)
    const err = existing
      ? (await supabase.from('acces_student_ars').update({
          is_active: isActive,
          precision_value: precisionValue,
          review_due_on: reviewDueOn,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id)).error
      : (await supabase.from('acces_student_ars').insert({
          student_id: studentId,
          ar_definition_id: arDefinitionId,
          is_active: isActive,
          precision_value: precisionValue,
          review_due_on: reviewDueOn,
        })).error
    setError(err?.message || null)
    await load()
  }

  useEffect(() => { load() }, [load])
  return { ars, definitions, history, loading, error, toggleAR, reload: load }
}
