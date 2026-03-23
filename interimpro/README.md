# 🏥 InterimPro — Next.js + Supabase + Vercel

Application de gestion de missions d'intérim médical.

## Structure du projet

```
interimpro/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx          ← Page de connexion
│   │   └── callback/route.ts       ← Callback OAuth Google
│   ├── dashboard/
│   │   ├── layout.tsx              ← Layout avec sidebar
│   │   ├── page.tsx                ← Tableau de bord
│   │   ├── missions/page.tsx       ← Gestion des missions
│   │   ├── etablissements/page.tsx ← Gestion des établissements
│   │   ├── calendrier/page.tsx     ← Vue calendrier
│   │   ├── analyses/page.tsx       ← Statistiques
│   │   ├── import/page.tsx         ← Import Google Calendar
│   │   ├── parametres/page.tsx     ← Paramètres
│   │   └── mon-compte/page.tsx     ← Profil utilisateur
│   ├── api/
│   │   └── google-calendar/
│   │       ├── analyze/route.ts    ← Analyse événements GCal
│   │       └── import/route.ts     ← Import missions depuis GCal
│   ├── globals.css
│   └── layout.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ← Client Supabase (browser)
│   │   └── server.ts               ← Client Supabase (serveur)
│   ├── types.ts                    ← Types TypeScript
│   ├── utils.ts                    ← Utilitaires calculs
│   └── google-calendar.ts          ← Service Google Calendar
├── middleware.ts                   ← Protection des routes
├── .env.example                    ← Variables d'env exemple
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
└── GUIDE_MIGRATION.md              ← Guide complet étape par étape
```

## Installation rapide

```bash
# 1. Cloner et installer
git clone https://github.com/TON_USERNAME/interimpro.git
cd interimpro
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env.local
# Remplir .env.local avec tes clés Supabase et Google

# 3. Exécuter le SQL dans Supabase (voir GUIDE_MIGRATION.md)

# 4. Lancer en dev
npm run dev
```

## Déploiement Vercel

```bash
# Push sur GitHub, puis connecter à Vercel
# Ajouter les variables d'env dans Vercel Dashboard
# Deploy automatique !
```

## Fonctionnalités

- ✅ Auth Google + email/password
- ✅ Dashboard avec métriques et navigation par mois
- ✅ Gestion missions (CRUD + pointage admin)
- ✅ Passage auto en "passée" quand date_fin dépassée
- ✅ Archivage auto quand 3 pointages cochés
- ✅ Gestion établissements avec créneaux
- ✅ Calendrier mensuel avec missions
- ✅ Analyses avec graphiques Recharts
- ✅ Import Google Calendar avec matching intelligent
- ✅ Sync temps réel Google Calendar
- ✅ Système de notifications/alertes
- ✅ Thème personnalisable (16 couleurs)
- ✅ Mode sombre/clair
- ✅ Responsive mobile

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| NEXT_PUBLIC_SUPABASE_URL | URL de ton projet Supabase |

| NEXT_PUBLIC_SUPABASE_ANON_KEY | Clé publique Supabase |
| SUPABASE_SERVICE_ROLE_KEY | Clé service Supabase (privée) |
| GOOGLE_CLIENT_ID | Client ID Google Cloud |
| GOOGLE_CLIENT_SECRET | Client Secret Google Cloud |
