# 🚀 Guide de Déploiement Gratuit - Agali Scrapper

## Architecture finale

```
GitHub (code) 
    │
    ├──→ GitHub Actions (cron jobs - GRATUIT)
    │         ├── Scraping toutes les 12h  → Supabase DB
    │         └── Cleanup toutes les 24h  → Supabase DB
    │
    ├──→ Render.com (Backend Node.js - GRATUIT)
    │         └── Lit/écrit dans Supabase DB
    │
    └──→ Vercel (Frontend React - GRATUIT)
              └── Appelle le Backend sur Render
              
Supabase (PostgreSQL - GRATUIT) ← partagé par tout
```

---

## ÉTAPE 1 : Créer la Base de Données sur Supabase

### 1.1 - Créer un compte
1. Va sur **https://supabase.com**
2. Clique **"Start your project"**
3. Connecte-toi avec GitHub (bouton vert "Continue with GitHub")

### 1.2 - Créer un projet
1. Clique **"New project"**
2. Remplis :
   - **Name** : `agali-scrapper`
   - **Database Password** : génère un mot de passe fort (copie-le !)
   - **Region** : `West EU (Ireland)` (le plus proche d'Israël)
3. Clique **"Create new project"**
4. Attends ~2 minutes que le projet soit prêt

### 1.3 - Récupérer l'URL de connexion
1. Dans le dashboard Supabase → **Project Settings** (roue dentée en bas)
2. → **Database** → section **Connection string**
3. Sélectionne **"URI"** et copie l'URL qui ressemble à :
   ```
   postgresql://postgres:[MOT_DE_PASSE]@db.[PROJET_ID].supabase.co:5432/postgres
   ```
4. **GARDE CETTE URL** - tu en auras besoin partout !

### 1.4 - Créer les tables (migration Prisma)
Dans ton terminal local :
```bash
# Dans le dossier racine du projet
DATABASE_URL="postgresql://postgres:[MOT_DE_PASSE]@db.[PROJET_ID].supabase.co:5432/postgres" python -m prisma migrate deploy
```
Ou si tu préfères :
```bash
set DATABASE_URL=postgresql://postgres:[TON_MOT_DE_PASSE]@db.[ID].supabase.co:5432/postgres
python -m prisma migrate deploy
```

---

## ÉTAPE 2 : Configurer GitHub Secrets

Les secrets GitHub permettent aux workflows de se connecter à la DB sans exposer les mots de passe.

1. Va sur **https://github.com/AvinoamSebbah/Agali/settings/secrets/actions**
2. Clique **"New repository secret"**

### ✅ Un seul secret requis :
| Nom | Valeur |
|-----|--------|
| `DATABASE_URL` | `postgresql://postgres.TON_PROJET_ID:TON_MOT_DE_PASSE@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |

> ℹ️ Les autres options (scrapers, nb processus) ont des valeurs par défaut dans le workflow — pas besoin de les configurer.



## ÉTAPE 3 : Déployer le Backend sur Render

### 3.1 - Créer un compte
1. Va sur **https://render.com**
2. Connecte-toi avec GitHub

### 3.2 - Créer le service
1. Clique **"New +"** → **"Web Service"**
2. Connecte ton repository GitHub
3. Remplis :
   - **Name** : `agali-backend`
   - **Root Directory** : `web-backend`
   - **Runtime** : `Node`
   - **Build Command** : `npm install && npm run build && npx prisma generate`
   - **Start Command** : `npm start`
   - **Plan** : `Free`

### 3.3 - Ajouter les variables d'environnement
Dans Render → ton service → **"Environment"** → **"Add Environment Variable"** :

| Clé | Valeur |
|-----|--------|
| `DATABASE_URL` | `postgresql://postgres:[MOT_DE_PASSE]@db.[ID].supabase.co:5432/postgres` |
| `NODE_ENV` | `production` |
| `NEXTAUTH_SECRET` | *(génère un string aléatoire de 32 chars)* |
| `GEMINI_API_KEY` | `REMPLACER_PAR_VOTRE_VRAIE_CLE_GEMINI` |
| `FRONTEND_URL` | *(à remplir après étape 4)* |
| `PORT` | `3001` |

### 3.4 - Récupérer l'URL du backend
Après le premier déploiement, Render te donne une URL comme :
```
https://agali-backend.onrender.com
```
**Copie cette URL** - tu en auras besoin pour le frontend.

### 3.5 - Récupérer le Deploy Hook (pour GitHub Actions)
1. Dans Render → ton service → **"Settings"**
2. Scroll jusqu'à **"Deploy Hook"**
3. Copie l'URL du hook
4. Va dans GitHub Secrets et ajoute :
   - `RENDER_DEPLOY_HOOK_URL` = l'URL copiée

---

## ÉTAPE 4 : Déployer le Frontend sur Vercel

### 4.1 - Créer un compte
1. Va sur **https://vercel.com**
2. Connecte-toi avec GitHub

### 4.2 - Importer le projet
1. Clique **"Add New..."** → **"Project"**
2. Importe ton repository GitHub
3. Configure :
   - **Framework Preset** : `Vite`
   - **Root Directory** : `web-frontend`
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`

### 4.3 - Variables d'environnement sur Vercel
Avant de déployer, ajoute dans **"Environment Variables"** :

| Clé | Valeur |
|-----|--------|
| `VITE_API_URL` | `https://agali-backend.onrender.com` |

### 4.4 - Déployer
1. Clique **"Deploy"**
2. Attends ~2 minutes
3. Vercel te donne une URL comme `https://agali-xxx.vercel.app`

### 4.5 - Mettre à jour le backend avec l'URL frontend
Retourne dans Render → Environment Variables :
- `FRONTEND_URL` = `https://agali-xxx.vercel.app`

---

## ÉTAPE 5 : Vérifier que tout marche

### 5.1 - Tester le backend
```
https://agali-backend.onrender.com/health
```
Doit répondre : `{"status": "ok"}`

### 5.2 - Tester le frontend
Va sur l'URL Vercel, l'app doit se charger et se connecter au backend.


### 5.3 - Déclencher un scraping manuellement
1. Va sur **GitHub** → ton repo → **"Actions"**
2. Sélectionne **"🕐 Scrape - Every 12h"**
3. Clique **"Run workflow"** → **"Run workflow"**
4. Regarde les logs en temps réel !

### 5.4 - Vérifier les données dans Supabase
1. Va sur **https://supabase.com** → ton projet
2. → **Table Editor** → tu verras tes tables remplies !

---

## 📅 Planning automatique

| Job | Fréquence | Heure Israël |
|-----|-----------|--------------|
| 🐍 Scraping | Toutes les 12h | 08h00 et 20h00 |
| 🧹 Cleanup DB | Toutes les 24h | 05h00 |

---

## 💰 Récapitulatif des coûts

| Service | Plan | Coût |
|---------|------|------|
| Supabase | Free | 0€ |
| GitHub Actions | Free (2000 min/mois) | 0€ |
| Render | Free | 0€ |
| Vercel | Free | 0€ |
| **TOTAL** | | **0€/mois** |

### ⚠️ Limites du plan gratuit
- **Render** : Le backend "dort" après 15 min d'inactivité → réveil en ~30 secondes au 1er appel
- **Supabase** : 500 MB de DB, 2 GB de bandwidth/mois
- **GitHub Actions** : 2000 minutes/mois (largement suffisant)
- **Vercel** : 100 GB bandwidth/mois

---

## 🔧 Commandes utiles en local

```bash
# Tester la connexion Supabase localement
DATABASE_URL="postgresql://..." python -c "from prisma import Prisma; import asyncio; db=Prisma(); asyncio.run(db.connect()); print('OK!')"

# Lancer le cleanup manuellement (dry-run = sans supprimer)
python safe_database_cleanup.py

# Lancer le cleanup manuellement (vraie suppression)
python safe_database_cleanup.py --execute

# Lancer le scraper manuellement
python main.py
```

---

## ❓ Problèmes courants

### "Database connection refused"
→ Vérifier que `DATABASE_URL` dans GitHub Secrets est correct

### "CORS error" dans le frontend
→ Vérifier que `FRONTEND_URL` dans Render est bien l'URL Vercel exacte

### Backend Render lent au démarrage
→ Normal ! Le service gratuit "dort". Utiliser Render Cron pour le réveiller toutes les 14 min si besoin.

### GitHub Actions ne se lancent pas
→ Les cron jobs GitHub Actions peuvent avoir 10-20 min de retard sur le plan gratuit. C'est normal.
