-- LOT 3 — Révocation des liens, journal d'accès exploitable et minimisé.

-- 1. Révocation --------------------------------------------------------------
-- Jusqu'ici un token valide était réutilisé jusqu'à expiration : une
-- référente n'avait aucun moyen de couper l'accès d'un enseignant parti
-- de l'école avant 30 jours.
alter table acces_tokens add column if not exists revoked_at timestamptz;

create index if not exists acces_tokens_teacher_idx
  on acces_tokens (teacher_id, expires_at desc);

-- 2. Journal d'accès : minimisation ------------------------------------------
-- L'IP était collectée et jamais exploitée — le pire des deux mondes RGPD.
-- Le token en clair n'a rien à faire dans une table de journal.
alter table acces_access_log add column if not exists teacher_id uuid
  references acces_teachers(id) on delete cascade;

-- Rattachement des lignes existantes avant de perdre la colonne token.
update acces_access_log l
   set teacher_id = t.teacher_id
  from acces_tokens t
 where t.token = l.token and l.teacher_id is null;

alter table acces_access_log drop column if exists ip_address;
alter table acces_access_log drop column if exists token;

create index if not exists acces_access_log_teacher_idx
  on acces_access_log (teacher_id, accessed_at desc);

-- 3. Le journal devient lisible par la référente concernée -------------------
-- L'écriture reste réservée au service_role (API Vercel), qui contourne RLS.
drop policy if exists "log_service_only" on acces_access_log;

create policy "log_read_own_schools" on acces_access_log for select
  using (
    exists (
      select 1 from acces_teachers t
       where t.id = teacher_id
         and (t.school_id in (select acces_my_school_ids()) or acces_my_role() = 'super_admin')
    )
  );
