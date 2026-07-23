import { register } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { pathToFileURL, fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')

register(pathToFileURL(path.join(HERE, 'supabase-stub-loader.mjs')))

const mkRes = () => ({
  headers: {}, setHeader(k, v) { this.headers[k] = v },
  status(c) { this.code = c; return this },
  send(b) { this.body = b; return this },
  end(b) { this.body = b; return this },
  json(b) { this.body = b; return this },
})

let failures = 0
const check = (name, fn) => {
  try { fn(); console.log('  OK   ', name) }
  catch (e) { failures++; console.log('  ECHEC', name, '->', e.message) }
}

// ---- api/generate-pdf.js ---------------------------------------------------
const { default: pdf } = await import(pathToFileURL(path.join(ROOT, 'api/generate-pdf.js')).href)
const res = mkRes()
await pdf({ method: 'GET', query: { token: 'abc' } }, res)
const html = res.body
fs.writeFileSync(path.join(HERE, 'pdf-preview.html'), html)  // sortie inspectable dans un navigateur

console.log('\ngenerate-pdf')
check('statut 200', () => assert.equal(res.code, 200))
check('Referrer-Policy no-referrer', () => assert.equal(res.headers['Referrer-Policy'], 'no-referrer'))
check('Cache-Control no-store', () => assert.match(res.headers['Cache-Control'], /no-store/))
check('script echappe', () => assert.ok(!/<script>alert/.test(html) && /&lt;script&gt;/.test(html)))
check('balise <b> echappee', () => assert.ok(!/<b>Injection/.test(html) && /&lt;b&gt;Injection/.test(html)))
check('AR inactif exclu', () => assert.ok(!/NE DOIT PAS APPARAITRE/.test(html)))
check('eleve archive exclu', () => assert.ok(!/Eleve Archive/.test(html)))
check('nom complet affiche', () => assert.ok(/Alice Nguyen/.test(html)))
// Tri sur le nom affiche (prenom d'abord), coherent avec les listes referente.
check('tri alphabetique dans la classe', () => {
  const iAlice = html.indexOf('Alice Nguyen')
  const iZoe = html.indexOf('Zoe Bertrand')
  assert.ok(iAlice < iZoe, 'Alice doit preceder Zoe')
})
check('corps en Arial 12pt', () => assert.match(html, /font-family: Arial[^;]*; color: #1a1814; font-size: 12pt/))
check('lang=fr + noindex', () => assert.ok(/<html lang="fr">/.test(html) && /noindex/.test(html)))
check('deux classes rendues (3B et P5)', () => assert.ok(/>3B</.test(html) && /># ?P5|>P5</.test(html)))
// 3B : 3 eleves actifs -> seuil = max(2, ceil(3/3)) = 2 ; Calculatrice x3 -> commun
check('AU commune detectee en 3B', () => assert.match(html, /Aménagements communs à la classe/))
check('Calculatrice listee comme commune', () => {
  const bloc = html.slice(html.indexOf('common-list'), html.indexOf('</ul>', html.indexOf('common-list')))
  assert.match(bloc, /Calculatrice/)
})
// P5 : 1 seul eleve -> seuil = 2 -> aucune AU commune
check('aucune AU commune en P5 (1 eleve)', () => {
  const p5 = html.slice(html.lastIndexOf('P5'))
  assert.ok(!/common-title/.test(p5))
})

// ---- api/_auth.js : seuil proportionnel -----------------------------------
const { commonARs } = await import(pathToFileURL(path.join(ROOT, 'api/_auth.js')).href)
console.log('\nseuil AU communes')
const mk = n => Array.from({ length: n }, () => ({ ars: [{ label: 'X' }] }))
check('1 eleve  -> aucune', () => assert.deepEqual(commonARs(mk(1)), []))
check('2 eleves -> commune', () => assert.deepEqual(commonARs(mk(2)), ['X']))
check('12 eleves, 2 porteurs -> pas commune (ancien bug)', () => {
  const list = [...mk(2), ...Array.from({ length: 10 }, () => ({ ars: [{ label: 'Y' }] }))]
  assert.ok(!commonARs(list).includes('X'))
})
check('12 eleves, 4 porteurs -> commune (seuil 1/3)', () => {
  const list = [...mk(4), ...Array.from({ length: 8 }, () => ({ ars: [{ label: 'Y' }] }))]
  assert.ok(commonARs(list).includes('X'))
})

// ---- src/lib/ui.js : annee scolaire ---------------------------------------
const { currentSchoolYear, fullName } = await import(pathToFileURL(path.join(ROOT, 'src/lib/ui.js')).href)
console.log('\nannee scolaire')
check('septembre 2026 -> 2026-2027', () => assert.equal(currentSchoolYear(new Date('2026-09-15')), '2026-2027'))
check('janvier 2027  -> 2026-2027', () => assert.equal(currentSchoolYear(new Date('2027-01-15')), '2026-2027'))
check('juillet 2027  -> 2026-2027', () => assert.equal(currentSchoolYear(new Date('2027-07-15')), '2026-2027'))
check('aout 2027     -> 2027-2028', () => assert.equal(currentSchoolYear(new Date('2027-08-01')), '2027-2028'))
check('fullName', () => assert.equal(fullName({ first_name: 'Alice', last_name: 'Nguyen' }), 'Alice Nguyen'))

// ---- supabase/INSTALL.sql : couverture du schema -------------------------
// INSTALL.sql doit suffire seul : ni psql ni docker ici, on verifie donc que
// tout ce que le code interroge y figure.
console.log('\nINSTALL.sql')
const sql = fs.readFileSync(path.join(ROOT, 'supabase/INSTALL.sql'), 'utf8')

const TABLES = [
  'acces_schools', 'acces_referentes', 'acces_referente_schools',
  'acces_ar_definitions', 'acces_students', 'acces_student_ars',
  'acces_teachers', 'acces_teacher_students', 'acces_versions',
  'acces_tokens', 'acces_access_log', 'acces_ar_history',
]
for (const t of TABLES) {
  check(`table ${t}`, () => assert.match(sql, new RegExp(`create table if not exists ${t}\\b`)))
  check(`RLS active sur ${t}`, () => assert.match(sql, new RegExp(`alter table ${t}\\s+enable row level security`)))
}

// Colonnes ajoutees apres la migration 001 : sur une base deja installee, le
// create table if not exists est ignore, seuls les alter les ajoutent.
const ALTERS = [
  ['acces_students', 'first_name'], ['acces_students', 'last_name'],
  ['acces_students', 'school_year'], ['acces_students', 'archived_at'],
  ['acces_students', 'carried_from'],
  ['acces_student_ars', 'review_due_on'],
  ['acces_tokens', 'revoked_at'],
  ['acces_access_log', 'teacher_id'],
]
for (const [t, c] of ALTERS) {
  check(`${t}.${c} ajoutee par alter`, () =>
    assert.match(sql, new RegExp(`alter table ${t} add column if not exists ${c}\\b`)))
}

const DROPS = [
  ['acces_students', 'disorders'], ['acces_students', 'name'],
  ['acces_access_log', 'ip_address'], ['acces_access_log', 'token'],
  ['acces_referentes', 'school_id'],
]
for (const [t, c] of DROPS) {
  check(`${t}.${c} supprimee`, () =>
    assert.match(sql, new RegExp(`alter table ${t} drop column if exists ${c}\\b`)))
}

for (const fn of ['acces_my_school_ids', 'acces_my_role', 'acces_carry_over_year', 'acces_purge_old_data', 'acces_log_ar_change']) {
  check(`fonction ${fn}`, () => assert.match(sql, new RegExp(`create or replace function ${fn}\\b`)))
}
check('acces_my_school_id (mono-ecole) supprimee', () =>
  assert.match(sql, /drop function if exists acces_my_school_id\(\)/))
check('trigger historique', () => assert.match(sql, /create trigger acces_ar_history_trg/))
check('rattachement migre AVANT le drop de school_id', () =>
  assert.ok(sql.indexOf('insert into acces_referente_schools (referente_id, school_id)')
          < sql.indexOf('alter table acces_referentes drop column if exists school_id')))
check('48 amenagements semes', () =>
  assert.equal((sql.match(/^\('(Matériels|Pédagogiques|Organisationnels)', /gm) || []).length, 48))
check('policy insert AU couvre le super_admin', () =>
  assert.match(sql, /create policy "ar_def_insert"[\s\S]*?acces_my_role\(\) = 'super_admin'/))
check('aucune policy ne reference acces_my_school_id()', () =>
  assert.ok(!/acces_my_school_id\(\)\s*(or|=)/.test(sql)))

console.log(failures ? `\n${failures} ECHEC(S)` : '\nTout passe.')
process.exit(failures ? 1 : 0)
