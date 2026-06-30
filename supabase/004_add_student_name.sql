-- Ajout du champ name à acces_students
alter table acces_students add column if not exists name text;
