// Tokens d'interface AccèsActif.
// Seuils PLAI : 16 px minimum pour tout contenu lu à l'écran, contrastes AA.
// Les couleurs « texte » sont assombries par rapport au branding : #0a9370
// et #9a958c ne passent pas 4.5:1 sur fond clair.

export const BASE = 16
export const SMALL = 14        // plancher, réservé aux méta-informations

export const COLORS = {
  text: '#1a1814',
  muted: '#5a564f',            // 7.0:1 sur #faf9f7
  faint: '#8a857c',            // décor uniquement, jamais du texte porteur de sens
  teal: '#0a9370',             // fonds et bordures
  tealText: '#046b52',         // 6.1:1 sur blanc
  orange: '#c2410c',           // 4.7:1 sur blanc (le #f97316 est à 2.9:1)
  danger: '#a32d2d',
  bg: '#faf9f7',
  border: '#e8e4dd',
  borderStrong: '#d4cfc6',
}

export const input = {
  width: '100%', border: `1px solid ${COLORS.borderStrong}`, borderRadius: 6,
  padding: '10px 12px', fontSize: BASE, boxSizing: 'border-box', marginBottom: 4,
  fontFamily: 'inherit', color: COLORS.text,
}

export const label = {
  fontSize: SMALL, fontWeight: 700, color: COLORS.muted,
  display: 'block', marginBottom: 4,
}

export const help = { fontSize: SMALL, color: COLORS.muted, marginBottom: 14, marginTop: 0 }

export const btn = {
  background: COLORS.teal, color: '#fff', border: 'none', borderRadius: 20,
  padding: '10px 20px', fontSize: BASE, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit',
}

export const btnGhost = {
  background: 'none', border: `1px solid ${COLORS.borderStrong}`, borderRadius: 20,
  padding: '10px 18px', fontSize: BASE, color: COLORS.muted, cursor: 'pointer',
  fontFamily: 'inherit',
}

export const card = {
  background: '#fff', border: `1px solid ${COLORS.border}`,
  borderRadius: 10, padding: '20px 24px',
}

export const h2 = { fontSize: 22, fontWeight: 700, color: COLORS.text, margin: 0 }
export const h3 = { fontSize: 18, fontWeight: 700, color: COLORS.text, margin: '0 0 14px' }

/** Année scolaire courante : bascule au 1er août. */
export function currentSchoolYear(now = new Date()) {
  const y = now.getFullYear()
  const start = now.getMonth() >= 7 ? y : y - 1
  return `${start}-${start + 1}`
}

/** Liste d'années proposées dans le sélecteur : l'an dernier, cette année, l'an prochain. */
export function schoolYearOptions(now = new Date()) {
  const [start] = currentSchoolYear(now).split('-').map(Number)
  return [start - 1, start, start + 1].map(s => `${s}-${s + 1}`)
}

export function fullName(student) {
  if (!student) return ''
  return [student.first_name, student.last_name].filter(Boolean).join(' ').trim()
}
