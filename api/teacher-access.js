import { admin, resolveToken, loadTeacherView } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Le token circule en query string : pas de fuite via Referer, pas de cache.
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Token manquant' })

  const resolved = await resolveToken(token)
  if (resolved.error) return res.status(resolved.status).json({ error: resolved.error })

  // Journal d'accès : rattaché à l'enseignant, sans IP ni token en clair.
  await admin.from('acces_access_log').insert({
    teacher_id: resolved.teacherId,
    accessed_at: new Date().toISOString(),
  })

  const { teacher, byClass } = await loadTeacherView(resolved.teacherId)
  return res.status(200).json({ teacher, byClass })
}
