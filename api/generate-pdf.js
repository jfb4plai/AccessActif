const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CATEGORIES = ['Matériels', 'Pédagogiques', 'Organisationnels']

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { token } = req.query
  if (!token) return res.status(400).end('Token manquant')

  // Valider le token
  const { data: tokenRow } = await supabase
    .from('acces_tokens')
    .select('teacher_id, expires_at')
    .eq('token', token)
    .single()

  if (!tokenRow) return res.status(404).end('Lien invalide')
  if (new Date(tokenRow.expires_at) < new Date()) return res.status(410).end('Lien expiré')

  // Récupérer l'enseignant
  const { data: teacher } = await supabase
    .from('acces_teachers')
    .select('id, name, subject')
    .eq('id', tokenRow.teacher_id)
    .single()

  // Récupérer les élèves et leurs ARs
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

  // Construire byClass
  const byClass = {}
  for (const link of links || []) {
    const s = link.acces_students
    if (!s) continue
    const cls = s.class_code || 'Sans classe'
    if (!byClass[cls]) byClass[cls] = []
    const activeARs = (s.acces_student_ars || [])
      .filter(a => a.is_active && a.acces_ar_definitions?.label)
      .map(a => ({
        label: a.acces_ar_definitions.label,
        category: a.acces_ar_definitions.category,
        has_precision: a.acces_ar_definitions.has_precision,
        precision_value: a.precision_value,
      }))
    byClass[cls].push({ anonymous_code: s.anonymous_code, ars: activeARs })
  }

  const date = new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })

  // Générer le HTML des classes
  const classesHtml = Object.entries(byClass).sort().map(([cls, students]) => {
    const studentsHtml = students.map(student => {
      const cols = CATEGORIES.map(cat => {
        const catARs = student.ars.filter(a => a.category === cat)
        const items = catARs.length
          ? catARs.map(ar => `<li>${ar.label}${ar.has_precision && ar.precision_value ? ` (${ar.precision_value})` : ''}</li>`).join('')
          : '<li style="color:#ccc">—</li>'
        return `<td style="border:1px solid #e8e4dd;padding:8px;vertical-align:top;width:33%"><ul style="margin:0;padding-left:16px;font-size:11px">${items}</ul></td>`
      }).join('')

      return `
        <tr>
          <td colspan="3" style="background:#faf9f7;padding:4px 8px;font-size:11px;font-weight:600;border:1px solid #e8e4dd">${student.anonymous_code}</td>
        </tr>
        <tr>${cols}</tr>
      `
    }).join('')

    return `
      <div style="margin-bottom:20px;page-break-inside:avoid">
        <div style="background:#1a1814;color:#fff;padding:6px 12px;font-size:12px;font-weight:700">${cls}</div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              ${CATEGORIES.map(c => `<th style="background:#f0faf7;color:#0a9370;font-size:10px;text-transform:uppercase;padding:5px 8px;border:1px solid #e8e4dd;text-align:left">${c}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${studentsHtml}</tbody>
        </table>
      </div>
    `
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>ARs — ${teacher?.name || ''} — AccèsActif</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #1a1814; font-size: 12px; line-height: 1.4; }
  @media print {
    body { padding: 0; margin: 0; }
    .no-print { display: none !important; }
    @page { size: A4; margin: 1.5cm; }
  }
  .print-container { padding: 20px; }
  .header { border-bottom: 2px solid #0a9370; padding-bottom: 12px; margin-bottom: 20px; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; }
  .logo-title { flex: 1; }
  .logo-title > div:first-child { font-size: 18px; font-weight: 700; color: #0a9370; }
  .logo-title > div:nth-child(2) { font-size: 13px; font-weight: 600; margin-top: 4px; }
  .logo-title > div:nth-child(3) { font-size: 11px; color: #9a958c; margin-top: 2px; }
  .print-btn { background: #0a9370; color: #fff; border: none; padding: 8px 20px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .print-btn:hover { background: #067d5c; }
  .footer { margin-top: 24px; font-size: 10px; color: #9a958c; text-align: center; border-top: 1px solid #e8e4dd; padding-top: 12px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { margin-bottom: 2px; }
</style>
</head>
<body>
<div class="print-container">
  <div class="header">
    <div class="header-top">
      <div class="logo-title">
        <div>AccèsActif — PLAI</div>
        <div>${teacher?.name || ''}${teacher?.subject ? ' — ' + teacher.subject : ''}</div>
        <div>Aménagements raisonnables · ${date}</div>
      </div>
      <button class="no-print print-btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
    </div>
  </div>

  ${classesHtml}

  <div class="footer">Document confidentiel — usage pédagogique interne uniquement — PLAI Liège</div>
</div>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.status(200).send(html)
}
