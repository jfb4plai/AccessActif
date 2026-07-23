export async function resolve(spec, ctx, next) {
  if (spec === '@supabase/supabase-js') return { url: 'stub:supabase', shortCircuit: true }
  return next(spec, ctx)
}

export async function load(url, ctx, next) {
  if (url === 'stub:supabase') {
    return { format: 'module', shortCircuit: true, source: `
      const ars = (list) => list.map(([label, category, has_precision, precision_value, is_active]) => ({
        is_active, precision_value,
        acces_ar_definitions: { id: label, label, category, has_precision, precision_label: null },
      }))

      const rows = {
        acces_tokens: { teacher_id: 't1', expires_at: new Date(Date.now() + 8.64e7).toISOString(), revoked_at: null },
        acces_teachers: { id: 't1', name: 'Martine <script>alert(1)</script> Dupont', subject: 'Français' },
      }

      const links = [
        { acces_students: { id: 's3', first_name: 'Zoe', last_name: 'Bertrand', class_code: '3B', archived_at: null,
          acces_student_ars: ars([
            ['Calculatrice', 'Matériels', false, null, true],
            ['Une consigne à la fois', 'Pédagogiques', false, null, true],
          ]) } },
        { acces_students: { id: 's1', first_name: 'Alice', last_name: 'Nguyen', class_code: '3B', archived_at: null,
          acces_student_ars: ars([
            ['Calculatrice', 'Matériels', false, null, true],
            ['Tiers-temps', 'Organisationnels', true, '20 min', true],
            ['Lire oralement les consignes et les textes (si lecture non évaluée)', 'Pédagogiques', false, null, true],
            ['NE DOIT PAS APPARAITRE', 'Matériels', false, null, false],
          ]) } },
        { acces_students: { id: 's2', first_name: 'Bilal <b>Injection</b>', last_name: 'Karim', class_code: '3B', archived_at: null,
          acces_student_ars: ars([['Calculatrice', 'Matériels', false, null, true]]) } },
        { acces_students: { id: 's4', first_name: 'Eleve', last_name: 'Archive', class_code: '3B', archived_at: '2026-01-01',
          acces_student_ars: ars([['ARCHIVE NE DOIT PAS APPARAITRE', 'Matériels', false, null, true]]) } },
        { acces_students: { id: 's5', first_name: 'Karim', last_name: 'Ouali', class_code: 'P5', archived_at: null,
          acces_student_ars: ars([['Latte de lecture', 'Matériels', false, null, true]]) } },
      ]

      function builder(table) {
        const api = {}
        const chain = () => api
        api.select = chain; api.eq = chain; api.order = chain; api.limit = chain; api.is = chain; api.in = chain
        api.single = async () => ({ data: rows[table] || null })
        api.maybeSingle = api.single
        api.insert = () => api
        api.update = () => api
        api.then = (r) => r({ data: table === 'acces_teacher_students' ? links : [] })
        return api
      }

      export function createClient() { return { from: builder } }
    ` }
  }
  return next(url, ctx)
}
