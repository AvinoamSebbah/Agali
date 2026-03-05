# עגלי (Agali) - Web Application

Application web moderne pour la comparaison de prix de produits dans les supermarchés israéliens.

## 🎯 Fonctionnalités

### 1. **Recherche de Produits** (`/search`)
- Recherche par nom de produit ou code-barres
- Affichage des prix dans différentes enseignes
- Affichage des promotions actives
- Images des produits (OpenFoodFacts + Pricez)
- Pagination des résultats

### 2. **Comparateur de Prix** (`/compare`)
- Saisie de plusieurs codes-barres
- Comparaison des prix totaux entre enseignes
- Identification de l'enseigne la moins chère
- Affichage des promotions actives

### 3. **Scanner de Reçus** (`/scan`)
- Scan de codes-barres via caméra
- Sauvegarde des produits dans le caddie utilisateur
- Sélection des produits à conserver
- Authentification requise pour la sauvegarde

### 4. **Authentification**
- Inscription avec email/mot de passe
- Connexion sécurisée (NextAuth)
- Gestion des préférences utilisateur
- Gestion des caddies

## 🚀 Installation

### 1. Installer les dépendances

```bash
cd web
npm install
```

### 2. Configuration

Créez un fichier `.env` dans le dossier `web` :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/agali_db?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="votre-clé-secrète-très-longue-et-aléatoire"
```

### 3. Migrer la base de données

```bash
cd ..
prisma generate
prisma db push
```

### 4. Lancer l'application

```bash
cd web
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## 📦 Technologies Utilisées

- **Next.js 14** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS** - Styling moderne
- **Prisma** - ORM pour PostgreSQL
- **NextAuth** - Authentification
- **React Query** - Gestion d'état et cache
- **Framer Motion** - Animations
- **html5-qrcode** - Scanner de codes-barres
- **React Hot Toast** - Notifications
- **Zustand** - State management (optionnel)

## 🎨 Design

- Interface en hébreu (RTL)
- Design moderne et épuré
- Animations fluides
- Responsive (mobile, tablette, desktop)
- Logo personnalisé (caddie avec des yeux)
- Palette de couleurs cohérente

## 📊 Structure de la Base de Données

### Tables Ajoutées

- **users** - Utilisateurs de l'application
- **user_preferences** - Préférences utilisateur (magasins favoris, allergènes, etc.)
- **shopping_carts** - Caddies d'achats
- **cart_items** - Articles dans les caddies
- **receipts** - Reçus scannés
- **receipt_items** - Articles dans les reçus

## 🔧 API Routes

- `GET /api/products/search?q={query}&page={page}&limit={limit}` - Recherche de produits
- `GET /api/products/image/{barcode}` - Image d'un produit
- `POST /api/products/compare` - Comparaison de prix
- `POST /api/auth/signup` - Inscription
- `POST /api/auth/[...nextauth]` - Authentification

## 📱 Pages

- `/` - Page d'accueil
- `/search` - Recherche de produits
- `/compare` - Comparateur de prix
- `/scan` - Scanner de reçus
- `/auth/signin` - Connexion
- `/auth/signup` - Inscription
- `/dashboard` - Tableau de bord utilisateur (à venir)

## 🔐 Sécurité

- Mots de passe hashés avec bcrypt
- Sessions JWT avec NextAuth
- Variables d'environnement pour les secrets
- Validation des données avec Zod

## 📝 Prochaines Étapes

- [ ] Page Dashboard utilisateur
- [ ] Gestion des caddies
- [ ] Alertes de prix
- [ ] Historique des achats
- [ ] Export de listes de courses
- [ ] Notifications push
- [ ] Mode hors-ligne (PWA)

## 👨‍💻 Développement

```bash
# Mode développement
npm run dev

# Build production
npm run build

# Lancer en production
npm start

# Linter
npm run lint
```

## 🌐 Déploiement

L'application peut être déployée sur :
- **Vercel** (recommandé pour Next.js)
- **Netlify**
- **AWS Amplify**
- **Docker** (Dockerfile fourni dans le projet parent)

## 📄 Licence

Voir LICENSE.txt dans le dossier racine
