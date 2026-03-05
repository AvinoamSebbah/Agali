@echo off
echo 🛒 Installation de עגלי (Agali) Web Application
echo.

REM Install dependencies
echo 📦 Installation des dépendances...
cd web
call npm install

REM Create .env if it doesn't exist
if not exist .env (
    echo 📝 Création du fichier .env...
    copy .env.example .env
    echo ⚠️  N'oubliez pas de configurer DATABASE_URL et NEXTAUTH_SECRET dans web\.env
)

REM Generate Prisma Client
echo 🔧 Génération du client Prisma...
cd ..
call npx prisma generate

REM Push database schema
echo 🗄️  Mise à jour du schéma de base de données...
call npx prisma db push

echo.
echo ✅ Installation terminée!
echo.
echo Pour lancer l'application:
echo   cd web
echo   npm run dev
echo.
echo L'application sera accessible sur http://localhost:3000
pause
