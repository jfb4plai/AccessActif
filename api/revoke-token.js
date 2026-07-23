import { admin, requireReferente } from './_auth.js'

/**
 * Coupe immédiatement l'accès d'un enseignant à ses liens en cours.
 * Cas d'usage : départ de l'école, lien transmis par erreur, changement
 * d'affectation en cours d'année.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ref = await requireReferente(req, res)
  if (!ref) return

  const { teacher_id } = req.body || {}
  if (!teacher_id) return res.status(400).json({ error: 'teacher_id requis' })

  const { data: teacher } = await admin
    .from('acces_teachers')
    .select('id')
    .eq('id', teacher_id)
    .in('school_id', ref.schoolIds)
    .single()
  if (!teacher) return res.status(404).json({ error: 'Enseignant introuvable' })

  const { data, error } = await admin
    .from('acces_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('teacher_id', teacher_id)
    .is('revoked_at', null)
    .select('id')

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ revoked: (data || []).length })
}
