-- BOOTSTRAP — premier démarrage, à exécuter APRÈS les migrations 001 à 009.
-- Ce n'est pas une migration : à jouer une seule fois, en adaptant les valeurs.
--
-- Prérequis : le compte doit déjà exister dans Supabase Auth.
-- Le créer dans Authentication > Users > Add user (email + mot de passe),
-- l'application ne gère pas l'inscription.

-- 1. Créer les écoles ---------------------------------------------------------
insert into acces_schools (name, type) values
  ('Athénée Royal de Liège 1', 'IPT'),
  ('École fondamentale de Bressoux', 'PAR')
on conflict do nothing;

-- 2. Rattacher le compte au rôle ----------------------------------------------
-- Remplacer l'email. Le rôle 'super_admin' donne accès à toutes les écoles
-- et permet de valider les aménagements proposés par les référentes.
insert into acces_referentes (id, name, role)
select id, 'Jean-François Beguin', 'super_admin'
  from auth.users
 where email = 'jeanfrancois.beguin@ens.ecl.be'
on conflict (id) do update set role = excluded.role;

-- 3. Rattacher aux écoles ------------------------------------------------------
-- Indispensable : sans au moins une ligne ici, l'application affiche
-- « aucune école rattachée à votre compte ».
-- Un super_admin voit toutes les écoles dans le sélecteur, mais a quand même
-- besoin d'un rattachement pour que les fonctions API l'autorisent.
insert into acces_referente_schools (referente_id, school_id)
select u.id, s.id
  from auth.users u
 cross join acces_schools s
 where u.email = 'jeanfrancois.beguin@ens.ecl.be'
on conflict do nothing;

-- 4. Vérifications -------------------------------------------------------------
select r.name, r.role, count(rs.school_id) as ecoles
  from acces_referentes r
  left join acces_referente_schools rs on rs.referente_id = r.id
 group by r.name, r.role;

select category, count(*) as amenagements
  from acces_ar_definitions
 where status = 'active'
 group by category;
-- Attendu : 16 Matériels, 24 Pédagogiques, 8 Organisationnels.
