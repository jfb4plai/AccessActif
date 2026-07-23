import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/useApp'

export function useTeachers() {
  const { schoolId } = useApp()
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!schoolId) { setTeachers([]); setLoading(false); return }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('acces_teachers')
      .select('*, acces_teacher_students(student_id)')
      .eq('school_id', schoolId)
      .order('name')
    setError(err?.message || null)
    setTeachers(data || [])
    setLoading(false)
  }, [schoolId])

  async function upsertTeacher(teacher) {
    const payload = { ...teacher, school_id: teacher.school_id || schoolId }
    const { data, error: err } = await supabase
      .from('acces_teachers')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()
    if (err) throw err
    await load()
    return data
  }

  async function deleteTeacher(id) {
    const { error: err } = await supabase.from('acces_teachers').delete().eq('id', id)
    if (err) throw err
    await load()
  }

  useEffect(() => { load() }, [load])
  return { teachers, loading, error, upsertTeacher, deleteTeacher, reload: load }
}

export function useTeacherStudents(teacherId) {
  const { schoolId, year } = useApp()
  const [linkedStudentIds, setLinkedStudentIds] = useState([])
  const [allStudents, setAllStudents] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!teacherId || !schoolId) { setLoading(false); return }
    setLoading(true)
    const [{ data: links }, { data: students }] = await Promise.all([
      supabase.from('acces_teacher_students').select('student_id').eq('teacher_id', teacherId),
      supabase.from('acces_students')
        .select('id, first_name, last_name, anonymous_code, class_code')
        .eq('school_id', schoolId)
        .eq('school_year', year)
        .is('archived_at', null)
        .order('class_code').order('first_name').order('last_name'),
    ])
    setLinkedStudentIds((links || []).map(l => l.student_id))
    setAllStudents(students || [])
    setLoading(false)
  }, [teacherId, schoolId, year])

  async function toggleStudent(studentId, linked) {
    if (linked) {
      await supabase.from('acces_teacher_students').insert({ teacher_id: teacherId, student_id: studentId })
    } else {
      await supabase.from('acces_teacher_students').delete()
        .eq('teacher_id', teacherId).eq('student_id', studentId)
    }
    await load()
  }

  useEffect(() => { load() }, [load])
  return { linkedStudentIds, allStudents, loading, toggleStudent, reload: load }
}
