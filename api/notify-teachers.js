const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth : vérifier que l'appelant est une référente connectée
  const authHeader = req.headers.authorization || ''
  const jwt = authHeader.replace('Bearer ', '')
  if (!jwt) return res.status(401).json({ error: 'Non authentifié' })

  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
  if (authError || !user) return res.status(401).json({ error: 'Token invalide' })

  // Vérifier que l'utilisateur est bien référente
  const { data: ref } = await supabase
    .from('acces_referentes')
    .select('id, school_id, role')
    .eq('id', user.id)
    .single()
  if (!ref) return res.status(403).json({ error: 'Accès refusé' })

  const { teacher_ids } = req.body || {}
  if (!Array.isArray(teacher_ids) || !teacher_ids.length) {
    return res.status(400).json({ error: 'teacher_ids requis' })
  }

  const results = []

  for (const teacherId of teacher_ids) {
    try {
      // Récupérer l'enseignant (vérifier qu'il appartient à la même école)
      const { data: teacher } = await supabase
        .from('acces_teachers')
        .select('id, name, email, school_id')
        .eq('id', teacherId)
        .eq('school_id', ref.school_id)
        .single()
      if (!teacher) { results.push({ teacherId, status: 'not_found' }); continue }

      // Récupérer un token existant valide ou en créer un nouveau
      let token
      const { data: existing } = await supabase
        .from('acces_tokens')
        .select('token, expires_at')
        .eq('teacher_id', teacherId)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existing) {
        token = existing.token
      } else {
        const { data: newToken } = await supabase
          .from('acces_tokens')
          .insert({ teacher_id: teacherId })
          .select('token')
          .single()
        token = newToken.token
      }

      const magicLink = `${process.env.APP_URL}?token=${token}`

      // Calculer le prochain numéro de version
      const { data: lastVersion } = await supabase
        .from('acces_versions')
        .select('version_number')
        .eq('teacher_id', teacherId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single()
      const nextVersion = (lastVersion?.version_number || 0) + 1

      // Enregistrer la version envoyée
      await supabase.from('acces_versions').insert({
        school_id: ref.school_id,
        teacher_id: teacherId,
        token_used: token,
        version_number: nextVersion,
      })

      // Envoyer l'email via Resend
      await resend.emails.send({
        from: 'AccèsActif PLAI <noreply@jfb4plai.com>',
        to: teacher.email,
        subject: `Vos aménagements raisonnables — AccèsActif`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1814;">
            <div style="background: #0a9370; padding: 16px 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: #fff; margin: 0; font-size: 18px;">AccèsActif — PLAI</h1>
            </div>
            <div style="background: #fff; border: 1px solid #e8e4dd; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
              <p>Bonjour ${teacher.name},</p>
              <p>Vos aménagements raisonnables (version ${nextVersion}) sont disponibles. Cliquez sur le lien ci-dessous pour les consulter :</p>
              <p style="text-align: center; margin: 24px 0;">
                <a href="${magicLink}"
                   style="background: #0a9370; color: #fff; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: 600;">
                  Voir mes aménagements
                </a>
              </p>
              <p style="font-size: 12px; color: #9a958c;">
                Ce lien est valable 30 jours. Il est personnel — ne le partagez pas.<br>
                En cas de problème, contactez votre référente PLAI.
              </p>
            </div>
          </div>
        `,
      })

      results.push({ teacherId, status: 'sent', version: nextVersion })
    } catch (err) {
      results.push({ teacherId, status: 'error', message: err.message })
    }
  }

  return res.status(200).json({ results })
}
