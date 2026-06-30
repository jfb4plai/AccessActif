const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Token manquant' })

  // Valider le token
  const { data: tokenRow } = await supabase
    .from('acces_tokens')
    .select('teacher_id, expires_at')
    .eq('token', token)
    .single()

  if (!tokenRow) return res.status(404).json({ error: 'Lien invalide' })
  if (new Date(tokenRow.expires_at) < new Date()) return res.status(410).json({ error: 'Lien expiré' })

  // Logger l'accès
  await supabase.from('acces_access_log').insert({
    token,
    accessed_at: new Date().toISOString(),
    ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown',
  })

  // Récupérer l'enseignant
  const { data: teacher } = await supabase
    .from('acces_teachers')
    .select('id, name, subject')
    .eq('id', tokenRow.teacher_id)
    .single()

  // Récupérer les élèves assignés avec leurs ARs actifs
  const { data: links } = await supabase
    .from('acces_teacher_students')
    .select(`
      student_id,
      acces_students (
        id, anonymous_code, class_code,
        acces_student_ars (
          is_active, precision_value,
          acces_ar_definitions ( id, label, category, has_precision, precision_label )
        )
      )
    `)
    .eq('teacher_id', tokenRow.teacher_id)

  // Construire la structure par classe
  const byClass = {}
  for (const link of links || []) {
    const s = link.acces_students
    if (!s) continue
    const cls = s.class_code || 'Sans classe'
    if (!byClass[cls]) byClass[cls] = []

    const activeARs = (s.acces_student_ars || [])
      .filter(a => a.is_active)
      .map(a => ({
        label: a.acces_ar_definitions?.label,
        category: a.acces_ar_definitions?.category,
        has_precision: a.acces_ar_definitions?.has_precision,
        precision_label: a.acces_ar_definitions?.precision_label,
        precision_value: a.precision_value,
      }))
      .filter(a => a.label)

    byClass[cls].push({
      id: s.id,
      anonymous_code: s.anonymous_code,
      ars: activeARs,
    })
  }

  return res.status(200).json({ teacher, byClass })
}
