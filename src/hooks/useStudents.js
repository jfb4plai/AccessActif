import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('acces_students')
      .select('*, acces_student_ars(id, is_active)')
      .order('class_code')
    setStudents(data || [])
    setLoading(false)
  }

  async function upsertStudent(student) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: ref } = await supabase
      .from('acces_referentes')
      .select('school_id')
      .eq('id', user.id)
      .single()

    const payload = {
      ...student,
      school_id: student.school_id || ref?.school_id,
    }
    const { data, error } = await supabase
      .from('acces_students')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()
    if (error) throw error
    await load()
    return data
  }

  async function deleteStudent(id) {
    await supabase.from('acces_students').delete().eq('id', id)
    await load()
  }

  useEffect(() => { load() }, [])
  return { students, loading, upsertStudent, deleteStudent, reload: load }
}

export function useStudentARs(studentId) {
  const [ars, setArs] = useState([])
  const [definitions, setDefinitions] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!studentId) { setLoading(false); return }
    setLoading(true)
    const [{ data: defs }, { data: studentArs }] = await Promise.all([
      supabase
        .from('acces_ar_definitions')
        .select('*')
        .eq('status', 'active')
        .order('category')
        .order('label'),
      supabase
        .from('acces_student_ars')
        .select('*')
        .eq('student_id', studentId),
    ])
    setDefinitions(defs || [])
    setArs(studentArs || [])
    setLoading(false)
  }

  async function toggleAR(arDefinitionId, isActive, precisionValue = null) {
    const existing = ars.find(a => a.ar_definition_id === arDefinitionId)
    if (existing) {
      await supabase
        .from('acces_student_ars')
        .update({
          is_active: isActive,
          precision_value: precisionValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('acces_student_ars')
        .insert({
          student_id: studentId,
          ar_definition_id: arDefinitionId,
          is_active: isActive,
          precision_value: precisionValue,
        })
    }
    await load()
  }

  useEffect(() => { load() }, [studentId])
  return { ars, definitions, loading, toggleAR, reload: load }
}
