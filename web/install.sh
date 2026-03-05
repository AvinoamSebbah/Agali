#!/bin/bash

echo "🛒 Installation de עגלי (Agali) Web Application"
echo ""

# Install dependencies
echo "📦 Installation des dépendances..."
cd web
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Création du fichier .env..."
    cp .env.example .env
    echo "⚠️  N'oubliez pas de configurer DATABASE_URL et NEXTAUTH_SECRET dans web/.env"
fi

# Generate Prisma Client
echo "🔧 Génération du client Prisma..."
cd ..
npx prisma generate

# Push database schema
echo "🗄️  Mise à jour du schéma de base de données..."
npx prisma db push

echo ""
echo "✅ Installation terminée!"
echo ""
echo "Pour lancer l'application:"
echo "  cd web"
echo "  npm run dev"
echo ""
echo "L'application sera accessible sur http://localhost:3000"
