-- Correctif B2 : un super_admin ne pouvait pas insérer un AU.
-- L'unique policy INSERT (ar_def_propose) impose status = 'proposed',
-- alors que ARDefinitionsPage insère status = 'active' pour un super_admin.

drop policy if exists "ar_def_propose" on acces_ar_definitions;

create policy "ar_def_insert" on acces_ar_definitions for insert
  with check (
    -- toute référente peut proposer, et seulement proposer
    (auth.uid() is not null and status = 'proposed' and created_by = auth.uid())
    -- un super_admin peut créer directement un AU actif
    or acces_my_role() = 'super_admin'
  );
