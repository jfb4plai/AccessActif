import { admin, requireReferente } from './_auth.js'

const ROLES = ['super_admin', 'referente_pole', 'referente_par']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ref = await requireReferente(req, res)
  if (!ref) return
  if (ref.role !== 'super_admin') {
    return res.status(403).json({ error: 'Réservé au super_admin' })
  }

  const { email, name, role, school_ids } = req.body || {}
  if (!email || !name || !ROLES.includes(role) || !Array.isArray(school_ids) || !school_ids.length) {
    return res.status(400).json({ error: 'email, name, role et au moins une école sont requis' })
  }

  // Compte sans mot de passe : la personne le choisit elle-même via le lien
  // "mot de passe oublié" envoyé juste après par le client.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (createErr) return res.status(400).json({ error: createErr.message })

  const userId = created.user.id

  const { error: refErr } = await admin
    .from('acces_referentes')
    .upsert({ id: userId, name, role })
  if (refErr) return res.status(500).json({ error: refErr.message })

  const { error: schoolsErr } = await admin
    .from('acces_referente_schools')
    .insert(school_ids.map(school_id => ({ referente_id: userId, school_id })))
  if (schoolsErr) return res.status(500).json({ error: schoolsErr.message })

  return res.status(200).json({ ok: true })
}
