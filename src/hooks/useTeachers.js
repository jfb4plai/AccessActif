import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useTeachers() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('acces_teachers')
      .select('*, acces_teacher_students(student_id)')
      .order('name')
    setTeachers(data || [])
    setLoading(false)
  }

  async function upsertTeacher(teacher) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: ref } = await supabase
      .from('acces_referentes')
      .select('school_id')
      .eq('id', user.id)
      .single()

    const payload = {
      ...teacher,
      school_id: teacher.school_id || ref?.school_id,
    }
    const { data, error } = await supabase
      .from('acces_teachers')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()
    if (error) throw error
    await load()
    return data
  }

  async function deleteTeacher(id) {
    await supabase.from('acces_teachers').delete().eq('id', id)
    await load()
  }

  useEffect(() => { load() }, [])
  return { teachers, loading, upsertTeacher, deleteTeacher, reload: load }
}

export function useTeacherStudents(teacherId) {
  const [linkedStudentIds, setLinkedStudentIds] = useState([])
  const [allStudents, setAllStudents] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!teacherId) { setLoading(false); return }
    setLoading(true)
    const [{ data: links }, { data: students }] = await Promise.all([
      supabase.from('acces_teacher_students').select('student_id').eq('teacher_id', teacherId),
      supabase.from('acces_students').select('id, anonymous_code, class_code').order('class_code'),
    ])
    setLinkedStudentIds((links || []).map(l => l.student_id))
    setAllStudents(students || [])
    setLoading(false)
  }

  async function toggleStudent(studentId, linked) {
    if (linked) {
      await supabase.from('acces_teacher_students').insert({ teacher_id: teacherId, student_id: studentId })
    } else {
      await supabase.from('acces_teacher_students').delete()
        .eq('teacher_id', teacherId).eq('student_id', studentId)
    }
    await load()
  }

  useEffect(() => { load() }, [teacherId])
  return { linkedStudentIds, allStudents, loading, toggleStudent, reload: load }
}
