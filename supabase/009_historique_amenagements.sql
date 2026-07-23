-- LOT 4 — Historique des décisions d'aménagement.
--
-- Un aménagement raisonnable est un acte : qui l'a décidé, quand, jusqu'à
-- quand, et quand a-t-il été révisé. Jusqu'ici seul un updated_at écrasé à
-- chaque coche subsistait — rien d'opposable en cas de contestation.

create table if not exists acces_ar_history (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references acces_students(id) on delete cascade,
  ar_definition_id  uuid not null references acces_ar_definitions(id),
  action            text not null check (action in ('accorde','retire','modifie')),
  precision_value   text,
  decided_by        uuid references acces_referentes(id),
  decided_at        timestamptz not null default now(),
  note              text
);

create index if not exists acces_ar_history_student_idx
  on acces_ar_history (student_id, decided_at desc);

alter table acces_ar_history enable row level security;

create policy "ar_history_own_schools" on acces_ar_history for all
  using (
    exists (
      select 1 from acces_students s
       where s.id = student_id
         and (s.school_id in (select acces_my_school_ids()) or acces_my_role() = 'super_admin')
    )
  );

-- Date de révision prévue, portée par l'aménagement lui-même.
alter table acces_student_ars add column if not exists review_due_on date;

-- L'historique est alimenté par trigger : impossible de modifier un
-- aménagement sans laisser de trace, même via un accès direct à la base.
create or replace function acces_log_ar_change()
returns trigger language plpgsql security definer as $$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := case when new.is_active then 'accorde' else 'retire' end;
  elsif old.is_active is distinct from new.is_active then
    v_action := case when new.is_active then 'accorde' else 'retire' end;
  elsif old.precision_value is distinct from new.precision_value then
    v_action := 'modifie';
  else
    return new;  -- rien de substantiel n'a changé
  end if;

  -- decided_by via un select : si le compte courant n'est pas une référente
  -- (service_role, compte orphelin), on enregistre null plutôt que de violer
  -- la clé étrangère — l'historique ne doit jamais bloquer l'aménagement.
  insert into acces_ar_history
    (student_id, ar_definition_id, action, precision_value, decided_by)
  values
    (new.student_id, new.ar_definition_id, v_action, new.precision_value,
     (select id from acces_referentes where id = auth.uid()));

  return new;
end;
$$;

drop trigger if exists acces_ar_history_trg on acces_student_ars;
create trigger acces_ar_history_trg
  after insert or update on acces_student_ars
  for each row execute function acces_log_ar_change();
