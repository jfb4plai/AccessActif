import { esc, resolveToken, loadTeacherView, commonARs } from './_auth.js'

const CATEGORIES = ['Matériels', 'Pédagogiques', 'Organisationnels']

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { token } = req.query
  if (!token) return res.status(400).end('Token manquant')

  const resolved = await resolveToken(token)
  if (resolved.error) return res.status(resolved.status).end(resolved.error)

  const { teacher, byClass } = await loadTeacherView(resolved.teacherId)
  const date = new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })

  const classesHtml = Object.entries(byClass).sort().map(([cls, students]) => {
    const common = commonARs(students)

    const commonHtml = common.length ? `
      <div class="common">
        <div class="common-title">Aménagements communs à la classe</div>
        <ul class="common-list">${common.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      </div>` : ''

    const studentsHtml = students.map(student => {
      const cols = CATEGORIES.map(cat => {
        const catARs = student.ars.filter(a => a.category === cat)
        const items = catARs.length
          ? catARs.map(ar => `<li>${esc(ar.label)}${ar.has_precision && ar.precision_value ? ` (${esc(ar.precision_value)})` : ''}</li>`).join('')
          : '<li class="none">Aucun</li>'
        return `<td data-cat="${esc(cat)}"><ul>${items}</ul></td>`
      }).join('')

      return `
        <tr><th colspan="3" class="student">${esc(student.name)}</th></tr>
        <tr>${cols}</tr>`
    }).join('')

    return `
      <section class="classe">
        <h2>${esc(cls)}</h2>
        ${commonHtml}
        <table>
          <thead>
            <tr>${CATEGORIES.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr>
          </thead>
          <tbody>${studentsHtml}</tbody>
        </table>
      </section>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>Aménagements — ${esc(teacher?.name)} — AccèsActif</title>
<style>
  /* Arial 12 pt : seuil de lisibilité retenu pour les supports AU imprimés. */
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1814; font-size: 12pt; line-height: 1.45; }
  .print-container { padding: 20px; max-width: 1000px; margin: 0 auto; }
  .header { border-bottom: 2px solid #0a9370; padding-bottom: 12px; margin-bottom: 20px; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
  .brand { font-size: 18pt; font-weight: 700; color: #046b52; }
  .who { font-size: 13pt; font-weight: 700; margin-top: 4px; }
  .when { font-size: 12pt; color: #5a564f; margin-top: 2px; }
  .print-btn { background: #0a9370; color: #fff; border: none; padding: 10px 22px; border-radius: 20px; font-size: 12pt; font-weight: 600; cursor: pointer; font-family: inherit; }
  .print-btn:hover { background: #067d5c; }
  .classe { margin-bottom: 24px; page-break-inside: avoid; }
  .classe > h2 { background: #1a1814; color: #fff; padding: 8px 12px; font-size: 13pt; }
  .common { background: #e8f5f0; border: 1px solid #0a9370; border-top: none; padding: 10px 12px; }
  .common-title { font-weight: 700; color: #046b52; margin-bottom: 4px; }
  .common-list { padding-left: 20px; }
  .common-list li { list-style: disc; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #e8e4dd; padding: 8px; vertical-align: top; text-align: left; width: 33.33%; }
  thead th { background: #f0faf7; color: #046b52; text-transform: uppercase; font-size: 11pt; }
  .student { background: #faf9f7; font-weight: 700; }
  td ul { padding-left: 18px; }
  td li { list-style: disc; margin-bottom: 4px; }
  td li.none { list-style: none; margin-left: -18px; color: #5a564f; }
  .footer { margin-top: 24px; font-size: 11pt; color: #5a564f; text-align: center; border-top: 1px solid #e8e4dd; padding-top: 12px; }
  .empty { font-size: 12pt; color: #5a564f; }
  @media print {
    body { padding: 0; margin: 0; }
    .no-print { display: none !important; }
    @page { size: A4; margin: 1.5cm; }
  }
  /* Sur téléphone, les 3 colonnes deviennent 3 blocs empilés. */
  @media screen and (max-width: 640px) {
    table, thead, tbody, tr, td, th { display: block; width: 100% !important; }
    thead { display: none; }
    td { border-top: none; }
    td::before { content: attr(data-cat); display: block; font-size: 11pt; font-weight: 700; color: #046b52; text-transform: uppercase; margin-bottom: 4px; }
  }
</style>
</head>
<body>
<div class="print-container">
  <header class="header">
    <div class="header-top">
      <div>
        <div class="brand">AccèsActif — PLAI</div>
        <div class="who">${esc(teacher?.name)}${teacher?.subject ? ' — ' + esc(teacher.subject) : ''}</div>
        <div class="when">Aménagements raisonnables · ${esc(date)}</div>
      </div>
      <button class="no-print print-btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
    </div>
  </header>

  ${classesHtml || '<p class="empty">Aucun élève ne vous est assigné pour le moment.</p>'}

  <footer class="footer">
    Document confidentiel — usage pédagogique interne uniquement — PLAI Liège<br>
    Ne pas diffuser hors de l'équipe éducative concernée.
  </footer>
</div>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // Le token circule en query string : pas de fuite via Referer, pas de cache.
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  return res.status(200).send(html)
}
