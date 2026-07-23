import { Resend } from 'resend'
import { admin, esc, requireReferente } from './_auth.js'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ref = await requireReferente(req, res)
  if (!ref) return

  const { teacher_ids } = req.body || {}
  if (!Array.isArray(teacher_ids) || !teacher_ids.length) {
    return res.status(400).json({ error: 'teacher_ids requis' })
  }

  const results = []

  for (const teacherId of teacher_ids) {
    try {
      // L'enseignant doit relever d'une des écoles de la référente.
      const { data: teacher } = await admin
        .from('acces_teachers')
        .select('id, name, email, school_id')
        .eq('id', teacherId)
        .in('school_id', ref.schoolIds)
        .single()
      if (!teacher) { results.push({ teacherId, status: 'not_found' }); continue }

      // Rotation : chaque envoi révoque les liens précédents et en émet un
      // neuf. Un lien qui a circulé par erreur cesse de fonctionner au
      // prochain envoi, au lieu de rester valide jusqu'à 30 jours.
      await admin
        .from('acces_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('teacher_id', teacherId)
        .is('revoked_at', null)

      const { data: newToken, error: tokenError } = await admin
        .from('acces_tokens')
        .insert({ teacher_id: teacherId })
        .select('token')
        .single()
      if (tokenError || !newToken) {
        results.push({ teacherId, status: 'error', message: tokenError?.message || 'Token non créé' })
        continue
      }

      const magicLink = `${process.env.APP_URL}?token=${newToken.token}`

      const { data: lastVersion } = await admin
        .from('acces_versions')
        .select('version_number')
        .eq('teacher_id', teacherId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()
      const nextVersion = (lastVersion?.version_number || 0) + 1

      await admin.from('acces_versions').insert({
        school_id: teacher.school_id,
        teacher_id: teacherId,
        token_used: newToken.token,
        version_number: nextVersion,
      })

      await resend.emails.send({
        from: 'AccèsActif PLAI <noreply@jfb4plai.com>',
        to: teacher.email,
        subject: 'Vos aménagements raisonnables — AccèsActif',
        html: `
          <div style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.5; max-width: 560px; margin: 0 auto; color: #1a1814;">
            <div style="background: #0a9370; padding: 16px 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: #fff; margin: 0; font-size: 20px;">AccèsActif — PLAI</h1>
            </div>
            <div style="background: #fff; border: 1px solid #e8e4dd; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
              <p>Bonjour ${esc(teacher.name)},</p>
              <p>Les aménagements raisonnables des élèves que vous accompagnez sont disponibles (version ${nextVersion}).</p>
              <p style="text-align: center; margin: 24px 0;">
                <a href="${magicLink}"
                   style="background: #0a9370; color: #fff; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                  Voir mes aménagements
                </a>
              </p>
              <p style="font-size: 14px; color: #5a564f;">
                Ce lien est personnel et valable 30 jours. Ne le transmettez pas :
                il donne accès à des informations sur des élèves nommés.<br>
                Tout envoi ultérieur remplace ce lien par un nouveau.<br>
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
