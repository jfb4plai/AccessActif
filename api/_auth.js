import { createClient } from '@supabase/supabase-js'

export const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/** Échappement HTML — libellés et noms sont saisis par des utilisateurs. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Vérifie le JWT de la référente appelante et retourne son profil
 * accompagné des écoles où elle intervient.
 * Retourne null et répond lui-même en cas d'échec.
 */
export async function requireReferente(req, res) {
  const jwt = (req.headers.authorization || '').replace('Bearer ', '')
  if (!jwt) { res.status(401).json({ error: 'Non authentifié' }); return null }

  const { data: { user }, error: authError } = await admin.auth.getUser(jwt)
  if (authError || !user) { res.status(401).json({ error: 'Session invalide' }); return null }

  const { data: ref } = await admin
    .from('acces_referentes')
    .select('id, name, role')
    .eq('id', user.id)
    .single()
  if (!ref) { res.status(403).json({ error: 'Accès refusé' }); return null }

  // Un super_admin couvre toutes les écoles ; une référente, celles
  // où elle est rattachée (table de jonction, migration 007).
  let schoolIds
  if (ref.role === 'super_admin') {
    const { data } = await admin.from('acces_schools').select('id')
    schoolIds = (data || []).map(s => s.id)
  } else {
    const { data } = await admin
      .from('acces_referente_schools')
      .select('school_id')
      .eq('referente_id', user.id)
    schoolIds = (data || []).map(s => s.school_id)
  }

  if (!schoolIds.length) {
    res.status(403).json({ error: 'Aucune école rattachée à ce compte' })
    return null
  }

  return { ...ref, schoolIds }
}

/** Valide un token enseignant. Retourne { teacher_id } ou un code d'erreur. */
export async function resolveToken(token) {
  const { data: row } = await admin
    .from('acces_tokens')
    .select('teacher_id, expires_at, revoked_at')
    .eq('token', token)
    .single()

  if (!row) return { error: 'Lien invalide', status: 404 }
  if (row.revoked_at) return { error: 'Lien révoqué par votre référente PLAI', status: 403 }
  if (new Date(row.expires_at) < new Date()) return { error: 'Lien expiré', status: 410 }
  return { teacherId: row.teacher_id }
}

/**
 * Charge l'enseignant et ses élèves assignés, groupés par classe.
 * Ne sélectionne jamais de donnée autre que l'identité et les aménagements.
 */
export async function loadTeacherView(teacherId) {
  const { data: teacher } = await admin
    .from('acces_teachers')
    .select('id, name, subject')
    .eq('id', teacherId)
    .single()

  const { data: links } = await admin
    .from('acces_teacher_students')
    .select(`
      student_id,
      acces_students (
        id, first_name, last_name, class_code, archived_at,
        acces_student_ars (
          is_active, precision_value,
          acces_ar_definitions ( id, label, category, has_precision, precision_label )
        )
      )
    `)
    .eq('teacher_id', teacherId)

  const byClass = {}
  for (const link of links || []) {
    const s = link.acces_students
    if (!s || s.archived_at) continue

    const cls = s.class_code || 'Sans classe'
    if (!byClass[cls]) byClass[cls] = []

    byClass[cls].push({
      id: s.id,
      name: [s.first_name, s.last_name].filter(Boolean).join(' ').trim(),
      ars: (s.acces_student_ars || [])
        .filter(a => a.is_active && a.acces_ar_definitions?.label)
        .map(a => ({
          label: a.acces_ar_definitions.label,
          category: a.acces_ar_definitions.category,
          has_precision: a.acces_ar_definitions.has_precision,
          precision_value: a.precision_value,
        })),
    })
  }

  for (const cls of Object.keys(byClass)) {
    byClass[cls].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }

  return { teacher, byClass }
}

/** Aménagements présents chez au moins un tiers de la classe (min. 2 élèves). */
export function commonARs(students) {
  const threshold = Math.max(2, Math.ceil(students.length / 3))
  const count = {}
  for (const s of students) {
    for (const ar of s.ars) count[ar.label] = (count[ar.label] || 0) + 1
  }
  return Object.entries(count)
    .filter(([, n]) => n >= threshold)
    .map(([labelText]) => labelText)
    .sort((a, b) => a.localeCompare(b, 'fr'))
}
