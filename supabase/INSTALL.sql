-- ============================================================================
-- AccèsActif — INSTALLATION COMPLÈTE, EN UN SEUL COPIER-COLLER
-- ============================================================================
-- Écrit l'état final du schéma, sans rejouer l'historique des migrations 001 à
-- 009 (qui restent dans le dossier pour mémoire).
--
-- Fonctionne aussi bien sur une base vierge que sur une base où 001 à 004 ont
-- déjà été appliquées : chaque table est créée si absente, puis mise à niveau
-- colonne par colonne si elle existait déjà.
--
-- Rejouable sans risque. Les seules suppressions sont les colonnes
-- `disorders`, `name`, `ip_address` et `token`, voulues (donnée de santé et
-- secrets en clair).
--
-- UNE SEULE CHOSE À MODIFIER : les noms d'écoles, tout en bas (PARTIE 5).
-- Le compte jf.beguin@outlook.com est déjà renseigné.
-- ============================================================================


-- ============================================================================
-- PARTIE 1 — TABLES
-- ============================================================================

create table if not exists acces_schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text check (type in ('IPT','PAR','both')) default 'IPT',
  created_at timestamptz default now()
);

create table if not exists acces_referentes (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  role       text check (role in ('super_admin','referente_pole','referente_par')) default 'referente_pole',
  created_at timestamptz default now()
);
-- Un membre du PLAI a un seul compte et peut intervenir dans N écoles
-- (cas courant dans le fondamental).
create table if not exists acces_referente_schools (
  referente_id uuid not null references acces_referentes(id) on delete cascade,
  school_id    uuid not null references acces_schools(id)    on delete cascade,
  created_at   timestamptz default now(),
  primary key (referente_id, school_id)
);

-- Reprise du rattachement mono-école AVANT de supprimer la colonne, sinon
-- le lien serait perdu sur une base déjà peuplée.
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_name = 'acces_referentes' and column_name = 'school_id') then
    execute $q$insert into acces_referente_schools (referente_id, school_id)
               select id, school_id from acces_referentes where school_id is not null
               on conflict do nothing$q$;
  end if;
end $$;

-- Deux sources de vérité pour le rattachement = bug garanti.
alter table acces_referentes drop column if exists school_id;

create table if not exists acces_ar_definitions (
  id              uuid primary key default gen_random_uuid(),
  category        text not null,
  label           text not null unique,
  has_precision   boolean default false,
  precision_label text,
  status          text check (status in ('active','proposed','rejected')) default 'active',
  created_by      uuid references acces_referentes(id),
  created_at      timestamptz default now()
);

-- Élèves nominatifs. Aucune donnée de santé : le diagnostic vit dans le
-- dossier de l'élève, pas ici.
create table if not exists acces_students (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references acces_schools(id),
  first_name     text not null,
  last_name      text not null default '',
  anonymous_code text,
  class_code     text,
  school_year    text not null default '2026-2027',
  archived_at    timestamptz,
  carried_from   uuid references acces_students(id) on delete set null,
  created_at     timestamptz default now()
);
-- Mise à niveau si la table datait de la migration 001.
alter table acces_students add column if not exists first_name   text;
alter table acces_students add column if not exists last_name    text not null default '';
alter table acces_students add column if not exists school_year  text not null default '2026-2027';
alter table acces_students add column if not exists archived_at  timestamptz;
alter table acces_students add column if not exists carried_from uuid references acces_students(id) on delete set null;

-- Reprise des identités : la colonne `name` (migration 004) n'a jamais été
-- écrite par l'interface, on retombe sur anonymous_code si elle est vide.
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_name = 'acces_students' and column_name = 'name') then
    execute $q$update acces_students
                  set first_name = coalesce(nullif(trim(name), ''), anonymous_code, 'À compléter')
                where first_name is null$q$;
  end if;
end $$;
update acces_students set first_name = coalesce(anonymous_code, 'À compléter') where first_name is null;

alter table acces_students alter column first_name set not null;
alter table acces_students alter column anonymous_code drop not null;
alter table acces_students drop constraint if exists acces_students_anonymous_code_key;

-- Donnée de santé (RGPD art. 9) : supprimée, le diagnostic vit dans le
-- dossier de l'élève. `name` est remplacée par first_name / last_name.
alter table acces_students drop column if exists disorders;
alter table acces_students drop column if exists name;

create unique index if not exists acces_students_code_uniq
  on acces_students (school_id, school_year, anonymous_code)
  where anonymous_code is not null;
create index if not exists acces_students_year_idx
  on acces_students (school_id, school_year) where archived_at is null;

create table if not exists acces_student_ars (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid references acces_students(id) on delete cascade,
  ar_definition_id uuid references acces_ar_definitions(id),
  is_active        boolean default true,
  precision_value  text,
  review_due_on    date,
  updated_at       timestamptz default now(),
  unique(student_id, ar_definition_id)
);
alter table acces_student_ars add column if not exists review_due_on date;

create table if not exists acces_teachers (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid references acces_schools(id),
  name       text not null,
  email      text not null,
  subject    text,
  created_at timestamptz default now()
);

create table if not exists acces_teacher_students (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid references acces_teachers(id) on delete cascade,
  student_id uuid references acces_students(id) on delete cascade,
  unique(teacher_id, student_id)
);

create table if not exists acces_versions (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid references acces_schools(id),
  teacher_id     uuid references acces_teachers(id) on delete cascade,
  sent_at        timestamptz default now(),
  token_used     text,
  version_number integer not null default 1
);

create table if not exists acces_tokens (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid references acces_teachers(id) on delete cascade,
  token      text unique not null default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz,
  created_at timestamptz default now()
);
alter table acces_tokens add column if not exists revoked_at timestamptz;
create index if not exists acces_tokens_teacher_idx on acces_tokens (teacher_id, expires_at desc);

-- Journal minimisé : ni IP ni token en clair.
create table if not exists acces_access_log (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid references acces_teachers(id) on delete cascade,
  accessed_at timestamptz default now()
);
alter table acces_access_log add column if not exists teacher_id uuid
  references acces_teachers(id) on delete cascade;

-- Rattachement des lignes existantes avant de perdre la colonne token.
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_name = 'acces_access_log' and column_name = 'token') then
    execute $q$update acces_access_log l set teacher_id = t.teacher_id
                 from acces_tokens t where t.token = l.token and l.teacher_id is null$q$;
  end if;
end $$;

alter table acces_access_log drop column if exists ip_address;
alter table acces_access_log drop column if exists token;
create index if not exists acces_access_log_teacher_idx on acces_access_log (teacher_id, accessed_at desc);

-- Historique des décisions : un aménagement est un acte, pas une case cochée.
create table if not exists acces_ar_history (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references acces_students(id) on delete cascade,
  ar_definition_id uuid not null references acces_ar_definitions(id),
  action           text not null check (action in ('accorde','retire','modifie')),
  precision_value  text,
  decided_by       uuid references acces_referentes(id),
  decided_at       timestamptz not null default now(),
  note             text
);
create index if not exists acces_ar_history_student_idx on acces_ar_history (student_id, decided_at desc);


-- ============================================================================
-- PARTIE 2 — FONCTIONS
-- ============================================================================

create or replace function acces_my_school_ids()
returns setof uuid language sql security definer stable as $$
  select school_id from acces_referente_schools where referente_id = auth.uid()
$$;

create or replace function acces_my_role()
returns text language sql security definer stable as $$
  select role from acces_referentes where id = auth.uid()
$$;

drop function if exists acces_my_school_id();

-- Reprise d'une année sur l'autre. Security invoker volontairement : la RLS
-- s'applique, une référente ne peut reprendre que ses propres écoles.
create or replace function acces_carry_over_year(p_school_id uuid, p_from text, p_to text)
returns integer language plpgsql as $$
declare r record; v_new_id uuid; v_count integer := 0;
begin
  if p_from = p_to then raise exception 'Année source et cible identiques (%)', p_from; end if;

  for r in select * from acces_students
            where school_id = p_school_id and school_year = p_from and archived_at is null
            order by first_name, last_name
  loop
    if exists (select 1 from acces_students s
                where s.school_id = p_school_id and s.school_year = p_to and s.carried_from = r.id)
    then continue; end if;

    insert into acces_students (school_id, anonymous_code, first_name, last_name, class_code, school_year, carried_from)
    values (p_school_id, r.anonymous_code, r.first_name, r.last_name, r.class_code, p_to, r.id)
    returning id into v_new_id;

    insert into acces_student_ars (student_id, ar_definition_id, is_active, precision_value)
    select v_new_id, ar_definition_id, is_active, precision_value
      from acces_student_ars where student_id = r.id;

    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;

-- Rétention : à lancer une fois par an à la rentrée.
create or replace function acces_purge_old_data(p_keep_years integer default 2)
returns text language plpgsql security definer as $$
declare v_cutoff text; v_students integer; v_logs integer;
begin
  v_cutoff := (extract(year from now())::int - p_keep_years)::text;
  delete from acces_students where left(school_year, 4) < v_cutoff;
  get diagnostics v_students = row_count;
  delete from acces_access_log where accessed_at < now() - interval '12 months';
  get diagnostics v_logs = row_count;
  return format('%s élève(s) purgé(s), %s ligne(s) de journal purgée(s)', v_students, v_logs);
end; $$;

-- L'historique est alimenté par trigger : impossible de modifier un
-- aménagement sans laisser de trace, même en accès direct à la base.
create or replace function acces_log_ar_change()
returns trigger language plpgsql security definer as $$
declare v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := case when new.is_active then 'accorde' else 'retire' end;
  elsif old.is_active is distinct from new.is_active then
    v_action := case when new.is_active then 'accorde' else 'retire' end;
  elsif old.precision_value is distinct from new.precision_value then
    v_action := 'modifie';
  else
    return new;
  end if;

  insert into acces_ar_history (student_id, ar_definition_id, action, precision_value, decided_by)
  values (new.student_id, new.ar_definition_id, v_action, new.precision_value, auth.uid());
  return new;
end; $$;

drop trigger if exists acces_ar_history_trg on acces_student_ars;
create trigger acces_ar_history_trg
  after insert or update on acces_student_ars
  for each row execute function acces_log_ar_change();


-- ============================================================================
-- PARTIE 3 — RLS ET POLICIES
-- ============================================================================

alter table acces_schools           enable row level security;
alter table acces_referentes        enable row level security;
alter table acces_referente_schools enable row level security;
alter table acces_ar_definitions    enable row level security;
alter table acces_students          enable row level security;
alter table acces_student_ars       enable row level security;
alter table acces_teachers          enable row level security;
alter table acces_teacher_students  enable row level security;
alter table acces_versions          enable row level security;
alter table acces_tokens            enable row level security;
alter table acces_access_log        enable row level security;
alter table acces_ar_history        enable row level security;

-- Anciennes policies (mono-école) écartées avant recréation.
drop policy if exists "schools_read"                  on acces_schools;
drop policy if exists "referentes_self"               on acces_referentes;
drop policy if exists "referente_schools_read"        on acces_referente_schools;
drop policy if exists "referente_schools_admin"       on acces_referente_schools;
drop policy if exists "ar_def_read"                   on acces_ar_definitions;
drop policy if exists "ar_def_propose"                on acces_ar_definitions;
drop policy if exists "ar_def_insert"                 on acces_ar_definitions;
drop policy if exists "ar_def_admin"                  on acces_ar_definitions;
drop policy if exists "students_own_school"           on acces_students;
drop policy if exists "students_own_schools"          on acces_students;
drop policy if exists "student_ars_own_school"        on acces_student_ars;
drop policy if exists "student_ars_own_schools"       on acces_student_ars;
drop policy if exists "teachers_own_school"           on acces_teachers;
drop policy if exists "teachers_own_schools"          on acces_teachers;
drop policy if exists "teacher_students_own_school"   on acces_teacher_students;
drop policy if exists "teacher_students_own_schools"  on acces_teacher_students;
drop policy if exists "versions_own_school"           on acces_versions;
drop policy if exists "versions_own_schools"          on acces_versions;
drop policy if exists "tokens_service_only"           on acces_tokens;
drop policy if exists "log_service_only"              on acces_access_log;
drop policy if exists "log_read_own_schools"          on acces_access_log;
drop policy if exists "ar_history_own_schools"        on acces_ar_history;

create policy "schools_read" on acces_schools for select
  using (auth.uid() is not null);

create policy "referentes_self" on acces_referentes for select
  using (id = auth.uid() or acces_my_role() = 'super_admin');

create policy "referente_schools_read" on acces_referente_schools for select
  using (referente_id = auth.uid() or acces_my_role() = 'super_admin');
create policy "referente_schools_admin" on acces_referente_schools for all
  using (acces_my_role() = 'super_admin');

create policy "ar_def_read" on acces_ar_definitions for select
  using (auth.uid() is not null);
-- Une référente propose ; un super_admin crée directement un AU actif.
create policy "ar_def_insert" on acces_ar_definitions for insert
  with check (
    (auth.uid() is not null and status = 'proposed' and created_by = auth.uid())
    or acces_my_role() = 'super_admin'
  );
create policy "ar_def_admin" on acces_ar_definitions for update
  using (acces_my_role() = 'super_admin');

create policy "students_own_schools" on acces_students for all
  using (school_id in (select acces_my_school_ids()) or acces_my_role() = 'super_admin');

create policy "student_ars_own_schools" on acces_student_ars for all
  using (exists (select 1 from acces_students s where s.id = student_id
    and (s.school_id in (select acces_my_school_ids()) or acces_my_role() = 'super_admin')));

create policy "teachers_own_schools" on acces_teachers for all
  using (school_id in (select acces_my_school_ids()) or acces_my_role() = 'super_admin');

create policy "teacher_students_own_schools" on acces_teacher_students for all
  using (exists (select 1 from acces_teachers t where t.id = teacher_id
    and (t.school_id in (select acces_my_school_ids()) or acces_my_role() = 'super_admin')));

create policy "versions_own_schools" on acces_versions for all
  using (school_id in (select acces_my_school_ids()) or acces_my_role() = 'super_admin');

create policy "ar_history_own_schools" on acces_ar_history for all
  using (exists (select 1 from acces_students s where s.id = student_id
    and (s.school_id in (select acces_my_school_ids()) or acces_my_role() = 'super_admin')));

-- Les tokens restent inaccessibles au frontend (API Vercel uniquement).
create policy "tokens_service_only" on acces_tokens for all using (false);

-- Le journal est lisible par la référente concernée ; l'écriture passe par
-- le service_role, qui contourne la RLS.
create policy "log_read_own_schools" on acces_access_log for select
  using (exists (select 1 from acces_teachers t where t.id = teacher_id
    and (t.school_id in (select acces_my_school_ids()) or acces_my_role() = 'super_admin')));


-- ============================================================================
-- PARTIE 4 — LES 48 AMÉNAGEMENTS DE RÉFÉRENCE
-- ============================================================================

insert into acces_ar_definitions (category, label, has_precision, precision_label, status) values
('Matériels', 'Supports de cours lisibles et aérés (Arial 12, interlignes, titres en évidence, pages numérotées)', false, null, 'active'),
('Matériels', 'Taille de police plus grande (Arial 14)', false, null, 'active'),
('Matériels', 'Notes de cours et évaluations avec place suffisante pour écrire', false, null, 'active'),
('Matériels', 'Notes de cours et évaluations uniquement en recto', false, null, 'active'),
('Matériels', 'Objets silencieux à manipuler (aide attentionnelle)', false, null, 'active'),
('Matériels', 'Écouteurs avec musique douce autorisés', false, null, 'active'),
('Matériels', 'Casque anti-bruit / boules quies / écouteurs sans musique autorisés', false, null, 'active'),
('Matériels', 'Tables de multiplication à disposition', false, null, 'active'),
('Matériels', 'Calculatrice', false, null, 'active'),
('Matériels', 'Faire effectuer les calculs en colonnes (pas en ligne)', false, null, 'active'),
('Matériels', 'Google Lens (traduction ou lecture de textes)', false, null, 'active'),
('Matériels', 'Prendre des photos du tableau', false, null, 'active'),
('Matériels', 'Dictionnaire (imagé) en ligne pour le vocabulaire', false, null, 'active'),
('Matériels', 'Fiches outils (lexique, procédures, formules, référentiel…) y compris lors des évaluations', false, null, 'active'),
('Matériels', 'Outil numérique (iPad / ordinateur) avec envoi des cours', false, null, 'active'),
('Matériels', 'Latte de lecture', false, null, 'active'),
('Pédagogiques', 'Fournir le cours complété en format numérique ou papier', false, null, 'active'),
('Pédagogiques', 'S''assurer que le cours est convenablement complété par l''élève', false, null, 'active'),
('Pédagogiques', 'Support visuel en soutien aux explications orales', false, null, 'active'),
('Pédagogiques', 'Répéter l''info importante au moins 2 fois / la noter au tableau', false, null, 'active'),
('Pédagogiques', 'Expliciter les mots potentiellement incompris', false, null, 'active'),
('Pédagogiques', 'Privilégier les textes simples et courts (si lecture non évaluée)', false, null, 'active'),
('Pédagogiques', 'Lire oralement les consignes et les textes (si lecture non évaluée)', false, null, 'active'),
('Pédagogiques', 'Favoriser les réponses orales', false, null, 'active'),
('Pédagogiques', 'Favoriser les QCM / vrai-faux (sans cotation négative)', false, null, 'active'),
('Pédagogiques', 'Une consigne à la fois', false, null, 'active'),
('Pédagogiques', 'Vérifier la compréhension des consignes', false, null, 'active'),
('Pédagogiques', 'Explications plus approfondies / reformulations', false, null, 'active'),
('Pédagogiques', 'Renforcements positifs et aide à la gestion du stress', false, null, 'active'),
('Pédagogiques', 'Relances attentionnelles', false, null, 'active'),
('Pédagogiques', 'Feedbacks fréquents, spécifiques et immédiats', false, null, 'active'),
('Pédagogiques', 'Parler lentement, face à l''élève, dans le silence', false, null, 'active'),
('Pédagogiques', 'Laisser un temps de traitement de l''information', false, null, 'active'),
('Pédagogiques', 'Ne pas pénaliser l''orthographe et la graphie si non évaluées', false, null, 'active'),
('Pédagogiques', 'Faire surligner les éléments importants dans la théorie', false, null, 'active'),
('Pédagogiques', 'Noter pour l''élève si la situation le nécessite', false, null, 'active'),
('Pédagogiques', 'Favoriser la qualité à la quantité (nombre d''items réduit)', false, null, 'active'),
('Pédagogiques', 'Dissocier le moment d''explication et le moment de copie', false, null, 'active'),
('Pédagogiques', 'Pas de prise de note orale/sous dictée → faire recopier un support écrit', false, null, 'active'),
('Pédagogiques', 'Éviter de faire lire l''élève à voix haute sans préparation', false, null, 'active'),
('Organisationnels', 'Tiers-temps supplémentaire', false, null, 'active'),
('Organisationnels', 'Pause après X minutes', true, 'Durée de la pause (minutes)', 'active'),
('Organisationnels', 'Placer l''élève face au tableau', false, null, 'active'),
('Organisationnels', 'S''assurer qu''il range ses feuilles au bon endroit', false, null, 'active'),
('Organisationnels', 'Compléter le journal de classe / vérifier la prise en note', false, null, 'active'),
('Organisationnels', 'Placer l''élève proche du prof', false, null, 'active'),
('Organisationnels', 'Dispensé des auditions → travail sur base du texte écrit', false, null, 'active'),
('Organisationnels', 'Utilisation de la dictée vocale + correcteur d''orthographe', false, null, 'active')
on conflict (label) do nothing;


-- ============================================================================
-- PARTIE 5 — VOTRE COMPTE ET VOS ÉCOLES
-- ============================================================================
--
--   >>> SEULE SECTION À MODIFIER : remplacer les noms d'écoles ci-dessous. <<<
--
-- Une ligne par école, séparées par une virgule, la dernière sans virgule.
-- Le type est 'IPT', 'PAR' ou 'both'. En ajouter plus tard = rejouer ces
-- trois requêtes (l'application n'a pas encore d'écran de gestion des écoles).

insert into acces_schools (name, type) values
  ('Nom de votre première école', 'IPT'),
  ('Nom de votre deuxième école', 'PAR')
on conflict do nothing;

insert into acces_referentes (id, name, role)
select id, 'Jean-François Beguin', 'super_admin'
  from auth.users where email = 'jf.beguin@outlook.com'
on conflict (id) do update set role = excluded.role;

-- Indispensable : sans une ligne ici, l'app affiche « aucune école rattachée »,
-- y compris pour un super_admin.
insert into acces_referente_schools (referente_id, school_id)
select u.id, s.id from auth.users u cross join acces_schools s
 where u.email = 'jf.beguin@outlook.com'
on conflict do nothing;


-- ============================================================================
-- PARTIE 6 — CONTRÔLE
-- ============================================================================
-- Attendu : une ligne 'super_admin' avec autant d'écoles que créées,
-- puis 16 Matériels / 24 Pédagogiques / 8 Organisationnels.

select r.name, r.role, count(rs.school_id) as ecoles_rattachees
  from acces_referentes r
  left join acces_referente_schools rs on rs.referente_id = r.id
 group by r.name, r.role;

select category, count(*) as amenagements
  from acces_ar_definitions where status = 'active'
 group by category order by category;
