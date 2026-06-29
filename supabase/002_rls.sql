-- Activer RLS sur toutes les tables
alter table acces_schools enable row level security;
alter table acces_referentes enable row level security;
alter table acces_ar_definitions enable row level security;
alter table acces_students enable row level security;
alter table acces_student_ars enable row level security;
alter table acces_teachers enable row level security;
alter table acces_teacher_students enable row level security;
alter table acces_versions enable row level security;
alter table acces_tokens enable row level security;
alter table acces_access_log enable row level security;

-- Helpers
create or replace function acces_my_school_id()
returns uuid language sql security definer stable as $$
  select school_id from acces_referentes where id = auth.uid()
$$;

create or replace function acces_my_role()
returns text language sql security definer stable as $$
  select role from acces_referentes where id = auth.uid()
$$;

-- acces_schools : lecture pour tout utilisateur authentifié
create policy "schools_read" on acces_schools for select
  using (auth.uid() is not null);

-- acces_referentes : lecture de son propre profil ou super_admin
create policy "referentes_self" on acces_referentes for select
  using (id = auth.uid() or acces_my_role() = 'super_admin');

-- acces_ar_definitions : lecture pour tout authentifié, ajout si 'proposed', update si super_admin
create policy "ar_def_read" on acces_ar_definitions for select
  using (auth.uid() is not null);
create policy "ar_def_propose" on acces_ar_definitions for insert
  with check (auth.uid() is not null and status = 'proposed');
create policy "ar_def_admin" on acces_ar_definitions for update
  using (acces_my_role() = 'super_admin');

-- acces_students : référente voit son école, super_admin voit tout
create policy "students_own_school" on acces_students for all
  using (
    school_id = acces_my_school_id()
    or acces_my_role() = 'super_admin'
  );

-- acces_student_ars : suit les droits sur acces_students
create policy "student_ars_own_school" on acces_student_ars for all
  using (
    exists (
      select 1 from acces_students s
      where s.id = student_id
      and (s.school_id = acces_my_school_id() or acces_my_role() = 'super_admin')
    )
  );

-- acces_teachers : référente voit son école
create policy "teachers_own_school" on acces_teachers for all
  using (
    school_id = acces_my_school_id()
    or acces_my_role() = 'super_admin'
  );

-- acces_teacher_students : suit les droits sur acces_teachers
create policy "teacher_students_own_school" on acces_teacher_students for all
  using (
    exists (
      select 1 from acces_teachers t
      where t.id = teacher_id
      and (t.school_id = acces_my_school_id() or acces_my_role() = 'super_admin')
    )
  );

-- acces_versions : suit les droits sur acces_students
create policy "versions_own_school" on acces_versions for all
  using (
    exists (
      select 1 from acces_students s
      where s.id = student_id
      and (s.school_id = acces_my_school_id() or acces_my_role() = 'super_admin')
    )
  );

-- acces_tokens et acces_access_log : service_role uniquement (API Vercel)
create policy "tokens_service_only" on acces_tokens for all using (false);
create policy "log_service_only" on acces_access_log for all using (false);
