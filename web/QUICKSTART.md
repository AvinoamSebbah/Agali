# 🛒 עגלי (Agali) - Guide de Démarrage Rapide

## 🎯 Vue d'ensemble

**עגלי (Agali)** est une application web moderne qui permet de :
- 🔍 Rechercher des produits et comparer les prix entre magasins
- 💰 Comparer le prix total d'un panier entre différentes enseignes
- 📸 Scanner des reçus avec la caméra et sauvegarder les produits

## 🚀 Installation Rapide (Windows)

### Prérequis
- Node.js 18+ installé
- PostgreSQL avec la base de données configurée
- Git

### Étapes

1. **Configurer la base de données**
   ```bash
   # Depuis le dossier racine du projet
   npx prisma generate
   npx prisma db push
   ```

2. **Installer l'application web**
   ```bash
   cd web
   npm install
   ```

3. **Configurer les variables d'environnement**
   
   Créez le fichier `web/.env` :
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/agali_db?schema=public"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="générez-une-clé-aléatoire-très-longue-ici"
   ```

   **Pour générer NEXTAUTH_SECRET** :
   ```bash
   openssl rand -base64 32
   ```

4. **Lancer l'application**
   ```bash
   npm run dev
   ```

5. **Ouvrir dans le navigateur**
   ```
   http://localhost:3000
   ```

## 📱 Utilisation

### 1️⃣ Inscription / Connexion

- Cliquez sur **"הרשמה"** (Inscription) en haut à droite
- Remplissez le formulaire
- Après inscription, connectez-vous avec vos identifiants

### 2️⃣ Recherche de Produits

1. Cliquez sur **"חיפוש מוצרים"** sur la page d'accueil
2. Tapez le nom du produit ou le code-barres
3. Consultez les prix dans différents magasins
4. Voyez les promotions actives

**Exemple** : Tapez "חלב" (lait) pour voir tous les produits laitiers

### 3️⃣ Comparateur de Prix

1. Cliquez sur **"השוואת סל קניות"**
2. Entrez les codes-barres des produits (un par ligne)
3. Cliquez sur **"השווה מחירים"**
4. Voyez quel magasin est le moins cher pour votre panier

**Astuce** : Utilisez les boutons **"הוסף ברקוד"** pour ajouter plus de produits

### 4️⃣ Scanner de Reçu

1. Cliquez sur **"סריקת קבלה"**
2. Cliquez sur **"התחל סריקה"**
3. Autorisez l'accès à la caméra
4. Pointez vers les codes-barres sur votre reçu
5. Les produits s'ajoutent automatiquement à la liste
6. Sélectionnez ceux à garder
7. Cliquez sur **"שמור בעגלה"** (nécessite connexion)

## 🎨 Fonctionnalités Clés

### Images de Produits
L'application récupère automatiquement les images depuis :
- **OpenFoodFacts** (base de données mondiale)
- **Pricez** (fallback pour produits israéliens)

### Promotions
- Affichage des promotions actives
- Prix barrés avec prix promo en rouge
- Badge "במבצע" (En promotion)

### Design
- Interface en hébreu (RTL)
- Logo personnalisé (caddie avec des yeux 👀🛒)
- Animations fluides
- Responsive (mobile + desktop)

## 🗄️ Base de Données

### Nouvelles Tables Ajoutées

- **users** : Comptes utilisateurs
- **user_preferences** : Préférences (magasins favoris, allergènes, etc.)
- **shopping_carts** : Caddies d'achats sauvegardés
- **cart_items** : Produits dans les caddies
- **receipts** : Reçus scannés
- **receipt_items** : Produits dans les reçus

## 🔧 Commandes Utiles

```bash
# Lancer en développement
npm run dev

# Build production
npm run build

# Lancer en production
npm start

# Vérifier les erreurs
npm run lint

# Regénérer Prisma Client
npx prisma generate

# Voir la base de données (Prisma Studio)
npx prisma studio
```

## 🐛 Dépannage

### Erreur : "Cannot connect to database"
- Vérifiez que PostgreSQL est lancé
- Vérifiez `DATABASE_URL` dans `.env`

### Erreur : "NextAuth configuration error"
- Vérifiez que `NEXTAUTH_SECRET` est défini dans `.env`
- Vérifiez que `NEXTAUTH_URL` correspond à votre URL

### Les images ne s'affichent pas
- Vérifiez la connexion internet
- Les images peuvent prendre quelques secondes à charger
- Certains produits n'ont pas d'images disponibles

### Le scanner ne fonctionne pas
- Autorisez l'accès à la caméra dans votre navigateur
- Utilisez HTTPS ou localhost (requis pour l'API caméra)
- Assurez-vous d'avoir une bonne luminosité

## 📊 Structure du Projet

```
web/
├── src/
│   ├── app/                    # Pages Next.js (App Router)
│   │   ├── page.tsx           # Page d'accueil
│   │   ├── search/            # Recherche produits
│   │   ├── compare/           # Comparateur
│   │   ├── scan/              # Scanner
│   │   ├── auth/              # Authentification
│   │   └── api/               # API Routes
│   ├── components/            # Composants réutilisables
│   │   ├── Logo.tsx          # Logo עגלי
│   │   └── Providers.tsx     # Providers React
│   ├── lib/                   # Utilitaires
│   │   └── prisma.ts         # Client Prisma
│   └── types/                 # Types TypeScript
├── prisma/
│   └── schema.prisma         # Schéma de base de données
├── public/                    # Assets statiques
├── .env                       # Variables d'environnement
├── package.json              # Dépendances
└── README.md                 # Documentation
```

## 🌟 Prochaines Fonctionnalités

- [ ] Dashboard utilisateur personnalisé
- [ ] Gestion avancée des caddies
- [ ] Alertes de prix par email
- [ ] Comparaison historique des prix
- [ ] Mode hors-ligne (PWA)
- [ ] Export PDF de listes de courses
- [ ] Intégration avec plus de sources d'images

## 💡 Conseils d'Utilisation

1. **Créez un compte** pour sauvegarder vos caddies
2. **Ajoutez vos magasins favoris** dans les préférences
3. **Scannez vos reçus** régulièrement pour suivre vos dépenses
4. **Utilisez le comparateur** avant de faire vos courses

## 📞 Support

Pour toute question ou problème :
- Consultez le README.md détaillé
- Vérifiez les logs dans la console (F12)
- Consultez les issues GitHub du projet

---

**Bon shopping avec עגלי ! 🛒💰**
