@echo off
echo Demarrage de Prisma Studio...
cd web
set NODE_TLS_REJECT_UNAUTHORIZED=0
npx prisma studio
