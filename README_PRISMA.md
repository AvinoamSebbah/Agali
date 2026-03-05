# Ouvrir Prisma Studio

## Depuis Windows

Double-cliquez sur : **`start_prisma_studio.bat`**

Ou depuis le terminal :
```bash
.\start_prisma_studio.bat
```

Prisma Studio s'ouvrira sur http://localhost:5555

## Depuis le dossier web

```bash
cd web
npx prisma studio
```

## Note

Le Prisma du projet web est déjà configuré et partagé avec le scraper Python.
Les deux utilisent la même base de données PostgreSQL.
