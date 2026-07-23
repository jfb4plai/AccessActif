-- LOT 1 — Passage au nominatif, année scolaire, rétention.
--
-- Décision PO : l'anonymat des codes était une protection de façade
-- (ré-identification triviale via class_code). Le cloisonnement repose
-- désormais sur la donnée transmise : un enseignant ne reçoit que les
-- aménagements des élèves qui lui sont assignés, jamais le diagnostic.
-- En contrepartie, l'app ne stocke plus aucune donnée de santé.

-- 1. Identité nominative -----------------------------------------------------
alter table acces_students add column if not exists first_name text;
alter table acces_students add column if not exists last_name text;

-- Reprise de l'existant : la colonne `name` (migration 004) n'a jamais été
-- écrite par l'interface ; on retombe sur anonymous_code si elle est vide.
update acces_students
   set first_name = coalesce(nullif(trim(name), ''), anonymous_code, 'À compléter')
 where first_name is null;
update acces_students set last_name = '' where last_name is null;

alter table acces_students alter column first_name set not null;
alter table acces_students alter column last_name  set not null;
alter table acces_students drop column if exists name;

-- 2. Suppression de la donnée de santé ---------------------------------------
-- Texte libre de catégorie particulière (RGPD art. 9), sans base légale
-- documentée ni durée de conservation. Le diagnostic vit dans le dossier
-- de l'élève, pas ici : les aménagements se suffisent à eux-mêmes.
alter table acces_students drop column if exists disorders;

-- 3. Le code anonyme devient facultatif --------------------------------------
alter table acces_students alter column anonymous_code drop not null;
alter table acces_students drop constraint if exists acces_students_anonymous_code_key;

-- 4. Année scolaire ----------------------------------------------------------
alter table acces_students
  add column if not exists school_year text not null default '2026-2027';

-- Suppression logique : un ✕ malheureux ne doit pas effacer un historique
-- d'aménagements.
alter table acces_students add column if not exists archived_at timestamptz;

-- Traçabilité de la reprise d'une année sur l'autre.
alter table acces_students
  add column if not exists carried_from uuid references acces_students(id) on delete set null;

-- Le code anonyme, s'il est utilisé, n'est unique que dans son école et
-- son année — sinon la reprise annuelle serait impossible.
create unique index if not exists acces_students_code_uniq
  on acces_students (school_id, school_year, anonymous_code)
  where anonymous_code is not null;

create index if not exists acces_students_year_idx
  on acces_students (school_id, school_year) where archived_at is null;

-- 5. Reprise d'une année sur l'autre -----------------------------------------
-- Volontairement en security invoker : la fonction s'exécute sous les droits
-- de la référente, donc les policies RLS s'appliquent et elle ne peut
-- dupliquer que les élèves des écoles où elle intervient.
-- Rien ne bascule sans un geste explicite de sa part.
create or replace function acces_carry_over_year(
  p_school_id uuid,
  p_from      text,
  p_to        text
) returns integer
language plpgsql
as $$
declare
  r        record;
  v_new_id uuid;
  v_count  integer := 0;
begin
  if p_from = p_to then
    raise exception 'Année source et cible identiques (%)', p_from;
  end if;

  for r in
    select * from acces_students
     where school_id = p_school_id
       and school_year = p_from
       and archived_at is null
     order by first_name, last_name
  loop
    -- idempotent : relancer la reprise ne crée pas de doublon
    if exists (
      select 1 from acces_students s
       where s.school_id  = p_school_id
         and s.school_year = p_to
         and s.carried_from = r.id
    ) then
      continue;
    end if;

    insert into acces_students
      (school_id, anonymous_code, first_name, last_name, class_code, school_year, carried_from)
    values
      (p_school_id, r.anonymous_code, r.first_name, r.last_name, r.class_code, p_to, r.id)
    returning id into v_new_id;

    insert into acces_student_ars (student_id, ar_definition_id, is_active, precision_value)
    select v_new_id, ar_definition_id, is_active, precision_value
      from acces_student_ars
     where student_id = r.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- 6. Rétention ---------------------------------------------------------------
-- À appeler une fois par an (pg_cron ou manuellement à la rentrée).
create or replace function acces_purge_old_data(p_keep_years integer default 2)
returns text
language plpgsql
security definer
as $$
declare
  v_cutoff   text;
  v_students integer;
  v_logs     integer;
begin
  -- '2026-2027' → on garde les p_keep_years dernières années scolaires
  v_cutoff := (extract(year from now())::int - p_keep_years)::text;

  delete from acces_students where left(school_year, 4) < v_cutoff;
  get diagnostics v_students = row_count;

  delete from acces_access_log where accessed_at < now() - interval '12 months';
  get diagnostics v_logs = row_count;

  return format('%s élève(s) purgé(s), %s ligne(s) de journal purgée(s)', v_students, v_logs);
end;
$$;
