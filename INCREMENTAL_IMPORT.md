# Système d'Import Incrémental

## Vue d'ensemble

Le système d'import supporte maintenant l'import incrémental via une table `processed_files` qui garde une trace de tous les fichiers XML déjà importés avec leur hash MD5.

## Fonctionnalités

### Mode Incrémental (par défaut)
```bash
python import_xml_to_db.py promo --stores "Bareket" --workers 8
```

- ✅ Skip automatique des fichiers déjà traités
- ✅ Détection des modifications via MD5 hash
- ✅ Gain de temps énorme pour les mises à jour quotidiennes
- ✅ Affiche `[⊙] Skipping (already processed): fichier.xml`

### Mode Force (import complet)
```bash
python import_xml_to_db.py promo --stores "Bareket" --workers 8 --force
```

- ✅ Ignore la table `processed_files`
- ✅ Retraite tous les fichiers
- ✅ Utile après changements structurels dans la DB

## Table processed_files

### Structure
```sql
CREATE TABLE processed_files (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) UNIQUE NOT NULL,
    file_path TEXT NOT NULL,
    file_hash VARCHAR(64) NOT NULL,  -- MD5 hash
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL,  -- 'stores', 'promo', 'price'
    store_name VARCHAR(100),
    record_count INTEGER,
    processed_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes
```sql
CREATE INDEX idx_processed_files_name ON processed_files(file_name);
CREATE INDEX idx_processed_files_hash ON processed_files(file_hash);
CREATE INDEX idx_processed_files_store ON processed_files(store_name);
CREATE INDEX idx_processed_files_date ON processed_files(processed_at);
```

## Comment ça marche

### 1. Premier Import (554 fichiers)
```
[*] Incremental mode: Skipping already processed files
[>] Processing chain: Bareket
[>] Processing (1/554): StoresFull7290875100001-000-202512301022.aspx.xml
[>] Processing (2/554): StoresFull7290875100001-000-202601031022.aspx.xml
...
Time: ~2 minutes (with 8 workers)
Result: 554 files processed, 554 rows in processed_files
```

### 2. Deuxième Import (même fichiers)
```
[*] Incremental mode: Skipping already processed files
[>] Processing chain: Bareket
[⊙] Skipping (already processed): StoresFull7290875100001-000-202512301022.aspx.xml
[⊙] Skipping (already processed): StoresFull7290875100001-000-202601031022.aspx.xml
...
Time: ~5 seconds
Result: 554 files skipped, 0 files processed
```

### 3. Import avec fichiers modifiés
```
[*] Incremental mode: Skipping already processed files
[>] Processing chain: Bareket
[⊙] Skipping (already processed): file1.xml (hash matches)
[⊙] Skipping (already processed): file2.xml (hash matches)
[>] Processing (1/554): file3.xml (hash different - file modified!)
...
Time: Proportionnel au nombre de fichiers modifiés
Result: 553 skipped, 1 processed
```

## Utilisation Quotidienne

### Scénario: Mise à jour quotidienne automatique

**Jour 1** - Import initial
```bash
python import_xml_to_db.py promo --stores "Bareket" --workers 8
# 1000 fichiers → ~2 minutes
# processed_files: 1000 rows
```

**Jour 2** - Scraping + Import (10 nouveaux fichiers)
```bash
python scrapper.py                                                # Scraping quotidien
python import_xml_to_db.py promo --stores "Bareket" --workers 8 # Import incrémental
# 990 skipped + 10 processed → ~5-10 secondes!
# processed_files: 1010 rows
```

**Jour 3** - Scraping + Import (5 fichiers modifiés + 15 nouveaux)
```bash
python scrapper.py
python import_xml_to_db.py promo --stores "Bareket" --workers 8
# 980 skipped + 20 processed → ~15-20 secondes
# processed_files: 1025 rows
```

## Cas Spéciaux

### Vider la DB et recommencer
```bash
# Option 1: Vider toutes les tables (y compris processed_files)
DROP DATABASE agali_scrapper;
CREATE DATABASE agali_scrapper;
npx prisma db push

# Option 2: Garder la table processed_files mais forcer le reimport
python import_xml_to_db.py promo --stores "Bareket" --workers 8 --force
```

### Vérifier les fichiers processed
```bash
python check_processed.py
```

Output:
```
Total files in processed_files: 554

By type:
  promo: 541
  stores: 13

Last 5 processed:
  Promo7290875100001-002-202601041122.aspx.xml (promo) - 72 records
  Promo7290875100001-002-202601040922.aspx.xml (promo) - 71 records
  ...
```

## Avantages

✅ **Performance**: Gain de temps massif pour les updates quotidiennes
✅ **Intelligence**: Détecte automatiquement les modifications via MD5
✅ **Fiabilité**: Upsert partout = pas de duplicates même en mode force
✅ **Traçabilité**: Sait exactement quels fichiers ont été traités et quand
✅ **Flexibilité**: Mode force disponible quand nécessaire

## Statistiques

### Import Initial (First Run)
- **Fichiers**: 554 (13 stores + 541 promo)
- **Temps**: ~120 secondes (avec 8 workers)
- **Throughput**: ~4.6 fichiers/seconde

### Import Incrémental (No Changes)
- **Fichiers**: 554 (tous skipped)
- **Temps**: ~5 secondes
- **Throughput**: ~110 fichiers/seconde (skip = ultra rapide!)

### Import Incrémental (10% modifiés)
- **Fichiers**: 554 (500 skipped + 54 processed)
- **Temps**: ~15 secondes
- **Gain**: 8x plus rapide qu'un full import
