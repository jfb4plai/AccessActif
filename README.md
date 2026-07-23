# AccèsActif — PLAI

Centralisation et diffusion des aménagements raisonnables, du Pôle Liégeois
d'Accompagnement vers une École Inclusive vers les enseignants concernés.

Une référente encode ses élèves, coche leurs aménagements dans une liste
normalisée partagée par toutes les écoles du Pôle, assigne chaque élève aux
enseignants qui l'ont en classe, puis leur envoie un lien personnel. Les
enseignants n'ont pas de compte : ils cliquent, ils lisent, ils impriment.

## Modèle de confidentialité

Le cloisonnement repose sur **la donnée transmise**, pas sur un identifiant
masqué.

- Un enseignant ne voit que les élèves qui lui sont explicitement assignés.
- Il voit leur **nom et leurs aménagements**, jamais de diagnostic.
- L'application **ne stocke aucune donnée de santé** (le champ « troubles »
  a été supprimé en migration 006). Le diagnostic vit dans le dossier de
  l'élève, pas ici.
- Le journal d'accès ne conserve ni adresse IP ni token en clair.
- Tout est cloisonné par année scolaire, et purgé au-delà de deux ans.

## Rôles

| Rôle | Portée |
|---|---|
| `super_admin` | Toutes les écoles ; valide ou rejette les aménagements proposés |
| `referente_pole` / `referente_par` | Les écoles auxquelles le compte est rattaché (`acces_referente_schools`) |
| Enseignant | Lecture seule, par lien personnel, sans compte |

Un membre du PLAI a **un seul compte** et peut intervenir dans plusieurs
écoles — cas courant dans le fondamental. Le rattachement passe par la table
de jonction, jamais par un `school_id` sur le profil.

## Stack

React 18 + Vite · Supabase (auth + PostgreSQL + RLS) · Vercel Serverless
Functions · Resend (envoi des liens).

## Installation

```bash
npm install
cp .env.local.example .env.local
```

Base vierge : coller **`supabase/INSTALL.sql`** dans l'éditeur SQL Supabase
(un seul copier-coller, rejouable sans risque). Adapter la PARTIE 5 — email et
noms d'écoles — avant de lancer. Le compte doit exister au préalable dans
Authentication > Users : l'application ne gère pas l'inscription.

Sans ligne dans `acces_referente_schools`, l'application affiche « aucune
école rattachée », y compris pour un super_admin.

Les fichiers numérotés `001` à `009` retracent l'historique des migrations et
ne servent qu'à faire évoluer une base déjà installée.

Production : https://access-actif.vercel.app

## Développement

```bash
vercel dev
```

`vite dev` seul ne sert **pas** les fonctions `/api/*` : le lien magique, le
PDF et l'envoi d'email ne fonctionnent pas sans `vercel dev`.

## Vérifications avant push

```bash
npm run lint && npm test && npx vite build
```

`npm test` exécute les handlers Vercel réels contre un Supabase stubbé et
vérifie l'échappement HTML, l'exclusion des aménagements inactifs et des
élèves archivés, le seuil des aménagements communs, la typographie du PDF
et le calcul de l'année scolaire. Il écrit `tests/pdf-preview.html`, qui
s'ouvre dans un navigateur pour un contrôle visuel du document imprimé.

## Variables d'environnement

| Variable | Portée |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Frontend (exposées dans le bundle) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Serveur uniquement |
| `RESEND_API_KEY` | Serveur uniquement |
| `APP_URL` | Base des liens envoyés par email |

La clé service role ne doit jamais apparaître dans un fichier `src/`.

## Maintenance annuelle

À la rentrée, la référente bascule le sélecteur d'année et peut reprendre la
liste de l'an dernier — élèves et aménagements sont recopiés, à elle de
valider et d'élaguer. Rien ne bascule automatiquement : un aménagement
reconduit sans relecture est exactement ce qu'un dossier d'aménagements ne
doit pas produire.

Purge des données au-delà de deux ans :

```sql
select acces_purge_old_data();
```

## Ce que l'outil ne fait pas

- Il ne décide rien : la liste des aménagements est cochée par un humain.
- Il ne recueille pas encore le retour des enseignants sur ce qui fonctionne
  en classe. L'enseignant est aujourd'hui destinataire, pas contributeur.
- Il ne remplace pas le PIA ni le dossier de l'élève.
