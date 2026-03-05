# 🇮🇱 Agali - Comparateur de Supermarchés Israéliens

Agali est une plateforme complète pour scrapper, analyser et comparer les prix des supermarchés en Israël en temps réel.

---

## 🏗️ Architecture du Projet

Le projet est divisé en 4 parties principales :
1.  **Base de Données** : PostgreSQL via Docker.
2.  **Scrapers Python** : Collecte des données depuis les sites gouvernementaux.
3.  **Backend API** : Express/TypeScript pour servir les données.
4.  **Frontend Web** : React/Vite pour l'interface utilisateur.

---

## 🏁 Guide de Démarrage Rapide

### 1. Base de Données (Infrastructure)
Assurez-vous que Docker est installé et lancé.

```bash
# À la racine du projet
docker compose up -d
```
*Accès pgAdmin : http://localhost:5050 (Login: admin@agali.com / admin123)*

---

### 2. Collecte des Données (Python)
Le système de scraping récupère les fichiers XML et les importe dans PostgreSQL.

**Installation :**
```bash
pip install -r requirements.txt
```

**Utilisation :**
-   **GUI (Recommandé)** : `python gui_manager.py`
    -   Utilisez l'onglet "Dashboard" pour lancer le scraping.
    -   Cliquez sur "Importer XML vers DB" pour charger les données dans l'application.
-   **CLI** :
    ```bash
    python main.py             # Lance le scraping
    python import_xml_to_db.py # Importe les fichiers téléchargés dans la DB
    ```

---

### 3. Backend (API)
L'API fait le pont entre la base de données et l'interface.

```bash
cd web-backend
npm install
npx prisma generate  # Génère le client Prisma
npm run dev
```
*Note : Si la DB est vide, utilisez `npx prisma db push` pour créer les tables.*
*L'API tournera sur : http://localhost:3001*

---

### 4. Frontend (Interface Web)
L'interface utilisateur moderne pour rechercher et comparer.

```bash
cd web-frontend
npm install
npm run dev
```
*L'application sera accessible sur : http://localhost:5173*

---

## 🛠️ Maintenance & Utilitaires

### Nettoyage des données
Si vous manquez d'espace ou voulez repartir à zéro :
-   `python clean_processed_dumps.py` : Supprime les fichiers XML déjà importés.
-   `python safe_database_cleanup.py` : Nettoie les anciennes entrées de la DB.

### Vérification de l'état
-   `python check_db.py` : Vérifie la connexion et le nombre de produits.
-   `python check_chains.py` : Affiche les enseignes disponibles.

---

## 📝 Notes Importantes
-   **Fichiers de cookies** : Certains scrapers génèrent des fichiers `.txt` de cookies à la racine, c'est normal.
-   **Performance** : Le scraper vérifie automatiquement la base de données pour ne télécharger que les nouveaux fichiers.
-   **Hébreu** : L'encodage est géré automatiquement pour la recherche et l'affichage des noms de produits.
