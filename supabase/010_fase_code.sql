-- Numéro FASE d'implantation sur les écoles.
-- Clé officielle FWB : sert de clé d'import et de déduplication lors du
-- chargement des écoles depuis le fichier des intervenants du Pôle.
-- Nullable : les écoles de test n'en ont pas.

alter table acces_schools add column if not exists fase_code text;

create unique index if not exists acces_schools_fase_uniq
  on acces_schools (fase_code) where fase_code is not null;
