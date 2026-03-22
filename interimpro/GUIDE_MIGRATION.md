# 🏥 InterimPro — Guide de migration vers Supabase + Next.js + Vercel

## Stack technique
- **Frontend** : Next.js 14 (App Router) + Tailwind CSS
- **Backend** : Supabase (PostgreSQL + Auth + RLS)
- **Hébergement** : Vercel (gratuit)
- **Google OAuth** : Supabase Auth (Google provider)
- **Google Calendar** : Google Calendar API v3

---

## Étape 1 — Prérequis à installer

1. **Node.js** : https://nodejs.org (version 18+)
2. **Git** : https://git-scm.com
3. Compte **GitHub** : https://github.com
4. Compte **Supabase** : https://supabase.com (gratuit)
5. Compte **Vercel** : https://vercel.com (gratuit, connecté à GitHub)
6. Compte **Google Cloud** : https://console.cloud.google.com (gratuit)

---

## Étape 2 — Créer le projet Supabase

1. Va sur https://supabase.com → "New project"
2. Nom : `interimpro`, mot de passe fort, région : Europe West
3. Une fois créé, va dans **Settings > API** et note :
   - `Project URL` (ex: https://xxxx.supabase.co)
   - `anon public key`
4. Va dans **Authentication > Providers > Google** et active-le
   (Tu auras besoin des clés Google Cloud — voir Étape 4)

---

## Étape 3 — Créer la base de données (SQL à exécuter dans Supabase)

Va dans **SQL Editor** de Supabase et exécute ce script :

```sql
-- Activer les extensions
create extension if not exists "uuid-ossp";

-- Table UserProfile
create table user_profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text,
  last_name text,
  telephone text,
  specialite text,
  numero_rpps text,
  photo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table UserPreferences
create table user_preferences (
  id uuid references auth.users on delete cascade primary key,
  objectif_heures_mensuel numeric default 151.67,
  couleur_theme text default 'teal',
  mode_sombre boolean default true,
  langue text default 'fr',
  updated_at timestamptz default now()
);

-- Table Etablissements
create table etablissements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  nom text not null,
  groupe text,
  type text check (type in ('EHPAD','Clinique','Hôpital','Laboratoire','Rééducation','Psychiatrie','Maison de Santé','Autre')),
  type_personnalise text,
  taux_horaire numeric not null default 14.00,
  telephone text,
  email text,
  notes text,
  creneaux jsonb default '[]',
  archived boolean default false,
  date_archive timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table Missions
create table missions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  etablissement_id uuid references etablissements on delete set null,
  titre text not null,
  date_debut timestamptz,
  date_fin timestamptz,
  pause_heures numeric default 1,
  heures numeric,
  statut text default 'a_venir' check (statut in ('a_venir','passee','archive')),
  contrat_signe boolean default false,
  fiche_paie_recue boolean default false,
  salaire_recu boolean default false,
  date_contrat_signe timestamptz,
  date_fiche_paie_recue timestamptz,
  date_salaire_recu timestamptz,
  majoration_nuit boolean default false,
  majoration_dimanche boolean default false,
  majoration_ferie boolean default false,
  taux_majoration numeric default 0,
  salaire_estime numeric,
  notes text,
  date_archive timestamptz,
  source text default 'manual' check (source in ('manual','google_calendar')),
  google_calendar_event_id text,
  google_calendar_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table GoogleCalendarSync
create table google_calendar_sync (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  calendar_id text,
  calendar_name text,
  google_account_email text,
  google_access_token text,
  google_refresh_token text,
  last_sync_at timestamptz,
  auto_sync_enabled boolean default false,
  events_processed integer default 0,
  sync_from_date date,
  sync_history jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS (Row Level Security) - chaque user ne voit que ses données
alter table user_profiles enable row level security;
alter table user_preferences enable row level security;
alter table etablissements enable row level security;
alter table missions enable row level security;
alter table google_calendar_sync enable row level security;

create policy "Users see own profile" on user_profiles for all using (auth.uid() = id);
create policy "Users see own prefs" on user_preferences for all using (auth.uid() = id);
create policy "Users see own etablissements" on etablissements for all using (auth.uid() = user_id);
create policy "Users see own missions" on missions for all using (auth.uid() = user_id);
create policy "Users see own gcal sync" on google_calendar_sync for all using (auth.uid() = user_id);

-- Trigger pour créer automatiquement le profil et prefs lors de l'inscription
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into user_profiles (id) values (new.id);
  insert into user_preferences (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

---

## Étape 4 — Google Cloud Console

1. Va sur https://console.cloud.google.com
2. Crée un nouveau projet "InterimPro"
3. Active les APIs suivantes :
   - **Google Calendar API**
   - **Google OAuth2 API**
4. Va dans **Credentials > Create Credentials > OAuth Client ID**
   - Type : Web application
   - Authorized redirect URIs : 
     - `https://xxxx.supabase.co/auth/v1/callback` (ton URL Supabase)
     - `http://localhost:3000/auth/callback` (pour le dev local)
5. Note le **Client ID** et **Client Secret**
6. Dans Supabase > Auth > Google : colle ces deux clés

---

## Étape 5 — Installer et lancer le projet

```bash
# Clone le projet (après avoir mis le code sur GitHub)
git clone https://github.com/TON_USERNAME/interimpro.git
cd interimpro

# Installer les dépendances
npm install

# Créer le fichier .env.local
cp .env.example .env.local
# Remplis les variables dans .env.local

# Lancer en développement
npm run dev
```

Ouvre http://localhost:3000

---

## Étape 6 — Déployer sur Vercel

1. Push ton code sur GitHub
2. Va sur https://vercel.com > "New Project"
3. Importe ton repo GitHub
4. Ajoute les variables d'environnement (mêmes que .env.local)
5. Deploy !

Ton app sera disponible sur `https://interimpro.vercel.app` (ou ton domaine custom)

---

## Variables d'environnement (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ta_cle_anon
SUPABASE_SERVICE_ROLE_KEY=ta_cle_service_role
GOOGLE_CLIENT_ID=ton_client_id_google
GOOGLE_CLIENT_SECRET=ton_client_secret_google
NEXTAUTH_SECRET=une_chaine_aleatoire_longue
NEXTAUTH_URL=http://localhost:3000
```
