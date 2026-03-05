# Guide d'importation des données XML vers PostgreSQL

## 📋 Prérequis

1. Docker Desktop installé et démarré
2. Python 3.11+
3. Données XML dans le dossier `dumps/`

## 🚀 Installation

### 1. Démarrer PostgreSQL et pgAdmin

```powershell
# Démarrer les conteneurs Docker
docker-compose up -d

# Vérifier que les conteneurs sont lancés
docker ps
```

**Accès:**
- **PostgreSQL**: `localhost:5432`
- **pgAdmin**: http://localhost:5050
  - Email: `admin@agali.com`
  - Password: `admin123`

### 2. Installer les dépendances Python

```powershell
pip install --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org -r requirements.txt
```

### 3. Générer le client Prisma

```powershell
# Générer le client Python Prisma
prisma generate

# Créer les tables dans la base de données
prisma db push
```

## 📊 Importer les données

### Import complet de tous les fichiers XML

```powershell
python import_xml_to_db.py
```

Cette commande va :
1. Scanner le dossier `dumps/`
2. Pour chaque dossier de magasin (Osherad, Bareket, etc.)
3. Importer tous les fichiers XML dans l'ordre :
   - **Stores** (magasins) → Table `stores`
   - **Promo/PromoFull** (promotions) → Tables `promotions` + `promotion_items`
   - **Price/PriceFull** (prix) → Tables `prices` + `products`

### Gestion des doublons

Le script gère automatiquement les doublons :

- **Stores** : Unique par `(chainId, storeId)` → Met à jour si existe
- **Promotions** : Unique par `(chainId, storeId, promotionId)` → Compare `promotionUpdateDate` et garde le plus récent
- **Prices** : Unique par `(chainId, storeId, itemCode)` → Compare `priceUpdateDate` et garde le plus récent
- **Products** : Unique par `itemCode` (barcode) → Met à jour les infos si nouvelles

## 🗄️ Structure de la base de données

### Table `stores`
Informations sur les magasins de chaque chaîne
- `chainId`, `chainName`, `storeId`, `storeName`, `address`, `city`, `zipCode`, etc.

### Table `products`
Catalogue des produits (par barcode)
- `itemCode` (barcode unique), `itemName`, `manufacturerName`, etc.

### Table `promotions`
Promotions actives
- `chainId`, `storeId`, `promotionId`, `promotionDescription`, dates, etc.

### Table `promotion_items`
Produits inclus dans chaque promotion (Many-to-Many)
- Lien entre `promotions` et `products`

### Table `prices`
Prix des produits par magasin
- `chainId`, `storeId`, `itemCode`, `itemPrice`, `priceUpdateDate`, etc.

## 🔍 Requêtes utiles

### Via pgAdmin

Connecter un serveur dans pgAdmin :
- Host: `postgres` (ou `localhost` si hors Docker)
- Port: `5432`
- Database: `agali_scrapper`
- Username: `agali`
- Password: `agali123`

### Exemples de requêtes SQL

```sql
-- Compter les magasins par chaîne
SELECT chain_name, COUNT(*) as nb_stores
FROM stores
GROUP BY chain_name
ORDER BY nb_stores DESC;

-- Prix les plus récents pour un produit
SELECT s.store_name, p.item_price, p.price_update_date
FROM prices p
JOIN stores s ON p.chain_id = s.chain_id AND p.store_id = s.store_id
JOIN products pr ON p.item_code = pr.item_code
WHERE pr.item_name LIKE '%lait%'
ORDER BY p.price_update_date DESC;

-- Promotions actives aujourd'hui
SELECT p.promotion_description, s.store_name, p.promotion_start_date, p.promotion_end_date
FROM promotions p
JOIN stores s ON p.chain_id = s.chain_id AND p.store_id = s.store_id
WHERE CURRENT_DATE BETWEEN p.promotion_start_date AND p.promotion_end_date
ORDER BY p.promotion_start_date DESC;

-- Produits en promotion
SELECT DISTINCT pr.item_name, pr.manufacturer_name, p.promotion_description
FROM promotion_items pi
JOIN promotions p ON pi.promotion_id = p.id
JOIN products pr ON pi.item_code = pr.item_code
WHERE CURRENT_DATE BETWEEN p.promotion_start_date AND p.promotion_end_date
LIMIT 50;
```

## 🛠️ Commandes Prisma utiles

```powershell
# Regénérer le client après modification du schéma
prisma generate

# Synchroniser le schéma avec la DB (développement)
prisma db push

# Réinitialiser complètement la base de données
prisma db push --force-reset

# Ouvrir Prisma Studio (interface web pour explorer la DB)
prisma studio
```

## 🔄 Workflow complet

```powershell
# 1. Scraper les données
Remove-Item Env:\LIMIT -ErrorAction SilentlyContinue
Remove-Item Env:\ENABLED_FILE_TYPES -ErrorAction SilentlyContinue
$env:ENABLED_SCRAPERS="OSHER_AD"
python main.py

# 2. Importer dans la base de données
python import_xml_to_db.py

# 3. Explorer les données avec Prisma Studio
prisma studio
```

## 📝 Notes importantes

- Les fichiers XML peuvent être volumineux → l'import peut prendre du temps
- Le script affiche une barre de progression tous les 100 items
- Les statistiques d'import sont affichées à la fin
- En cas d'erreur, vérifiez que PostgreSQL est bien démarré

## 🐛 Dépannage

### PostgreSQL ne démarre pas
```powershell
# Vérifier les logs
docker logs agali-postgres

# Redémarrer le conteneur
docker-compose restart postgres
```

### Erreur "relation does not exist"
```powershell
# Recréer les tables
prisma db push --force-reset
```

### Connexion refusée à la base de données
Vérifiez que le port 5432 n'est pas déjà utilisé et que Docker est lancé.
