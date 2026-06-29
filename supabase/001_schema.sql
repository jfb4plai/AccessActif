-- ÉCOLES
create table if not exists acces_schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text check (type in ('IPT','PAR','both')) default 'IPT',
  created_at timestamptz default now()
);

-- RÉFÉRENTES (liées à auth.users)
create table if not exists acces_referentes (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references acces_schools(id),
  name text not null,
  role text check (role in ('super_admin','referente_pole','referente_par')) default 'referente_pole',
  created_at timestamptz default now()
);

-- DÉFINITIONS AR (liste normalisée partagée)
create table if not exists acces_ar_definitions (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  label text not null unique,
  has_precision boolean default false,
  precision_label text,
  status text check (status in ('active','proposed','rejected')) default 'active',
  proposed_by uuid references acces_referentes(id),
  created_at timestamptz default now()
);

-- ÉLÈVES
create table if not exists acces_students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references acces_schools(id) not null,
  code text not null unique,
  first_name text not null,
  class_code text not null,
  referente_id uuid references acces_referentes(id),
  notes text,
  created_at timestamptz default now()
);

-- ARs PAR ÉLÈVE
create table if not exists acces_student_ars (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references acces_students(id) on delete cascade,
  ar_definition_id uuid references acces_ar_definitions(id),
  is_active boolean default true,
  precision_value text,
  updated_at timestamptz default now(),
  unique(student_id, ar_definition_id)
);

-- ENSEIGNANTS
create table if not exists acces_teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references acces_schools(id),
  name text not null,
  email text not null,
  subject text not null,
  created_at timestamptz default now()
);

-- LIENS ENSEIGNANT ↔ ÉLÈVE
create table if not exists acces_teacher_students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references acces_teachers(id) on delete cascade,
  student_id uuid references acces_students(id) on delete cascade,
  date_start date default current_date,
  date_end date,
  unique(teacher_id, student_id)
);

-- VERSIONS PAR ÉLÈVE
create table if not exists acces_versions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references acces_students(id) on delete cascade,
  version_num integer not null,
  modified_by uuid references acces_referentes(id),
  created_at timestamptz default now()
);

-- TOKENS ENSEIGNANTS (accès service_role uniquement)
create table if not exists acces_tokens (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references acces_teachers(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked boolean default false,
  created_at timestamptz default now()
);

-- JOURNAL D'ACCÈS (accès service_role uniquement)
create table if not exists acces_access_log (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references acces_teachers(id),
  token_id uuid references acces_tokens(id),
  action text check (action in ('email_opened','link_clicked','pdf_downloaded','smartschool_copied')),
  version_seen integer,
  created_at timestamptz default now()
);
