-- LOT 2 — Un compte par membre du PLAI, rattaché à N écoles.
--
-- Réalité de terrain : une référente du secondaire n'intervient que dans
-- une école, une référente du fondamental en couvre plusieurs. Le
-- school_id unique sur acces_referentes imposait un compte par école.

-- 1. Table de jonction -------------------------------------------------------
create table if not exists acces_referente_schools (
  referente_id uuid not null references acces_referentes(id) on delete cascade,
  school_id    uuid not null references acces_schools(id)    on delete cascade,
  created_at   timestamptz default now(),
  primary key (referente_id, school_id)
);

-- Reprise de l'existant avant de supprimer la colonne.
insert into acces_referente_schools (referente_id, school_id)
select id, school_id from acces_referentes where school_id is not null
on conflict do nothing;

alter table acces_referente_schools enable row level security;

create policy "referente_schools_read" on acces_referente_schools for select
  using (referente_id = auth.uid() or acces_my_role() = 'super_admin');

create policy "referente_schools_admin" on acces_referente_schools for all
  using (acces_my_role() = 'super_admin');

-- 2. Nouveau helper ----------------------------------------------------------
create or replace function acces_my_school_ids()
returns setof uuid language sql security definer stable as $$
  select school_id from acces_referente_schools where referente_id = auth.uid()
$$;

-- 3. Réécriture des policies -------------------------------------------------
-- Toutes les policies passent de « = mon école » à « parmi mes écoles ».
drop policy if exists "students_own_school"         on acces_students;
drop policy if exists "student_ars_own_school"      on acces_student_ars;
drop policy if exists "teachers_own_school"         on acces_teachers;
drop policy if exists "teacher_students_own_school" on acces_teacher_students;
drop policy if exists "versions_own_school"         on acces_versions;

create policy "students_own_schools" on acces_students for all
  using (
    school_id in (select acces_my_school_ids())
    or acces_my_role() = 'super_admin'
  );

create policy "student_ars_own_schools" on acces_student_ars for all
  using (
    exists (
      select 1 from acces_students s
       where s.id = student_id
         and (s.school_id in (select acces_my_school_ids()) or acces_my_role() = 'super_admin')
    )
  );

create policy "teachers_own_schools" on acces_teachers for all
  using (
    school_id in (select acces_my_school_ids())
    or acces_my_role() = 'super_admin'
  );

create policy "teacher_students_own_schools" on acces_teacher_students for all
  using (
    exists (
      select 1 from acces_teachers t
       where t.id = teacher_id
         and (t.school_id in (select acces_my_school_ids()) or acces_my_role() = 'super_admin')
    )
  );

create policy "versions_own_schools" on acces_versions for all
  using (
    school_id in (select acces_my_school_ids())
    or acces_my_role() = 'super_admin'
  );

-- 4. Suppression de l'ancienne source de vérité ------------------------------
-- Deux sources concurrentes pour le rattachement = bug garanti.
drop function if exists acces_my_school_id();
alter table acces_referentes drop column if exists school_id;
