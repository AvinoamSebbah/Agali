# Intégration DB avec le Scraper

## Vue d'ensemble

Le scraper vérifie maintenant la base de données PostgreSQL **AVANT** de télécharger les fichiers depuis Internet. Cela évite de télécharger des fichiers déjà traités et économise:
- ✅ Bande passante
- ✅ Temps de téléchargement  
- ✅ Espace disque

## Comment ça fonctionne

### 1. Au démarrage du scraper

```python
# scrapper_runner.py - méthode run()
load_processed_files()  # Charge tous les fichiers de la table processed_files
```

Cette opération charge en mémoire tous les noms de fichiers depuis `processed_files` et les met dans un cache pour des vérifications ultra-rapides (O(1)).

### 2. Pendant le filtrage

```python
# scraper_status.py - méthode filter_already_downloaded()
```

Pour chaque fichier détecté sur le site web, le scraper vérifie dans cet ordre:

1. **PostgreSQL** (`processed_files` table) - NOUVEAU ✨
   - Vérifie si le fichier a été importé dans la DB
   - Si oui → SKIP le téléchargement
   - Si non → Continue au step suivant

2. **JSON Database** (ancien système)
   - Vérifie le fichier JSON de status
   - Pour compatibilité avec l'ancien système

3. **Disque local**
   - Vérifie si le fichier existe déjà dans dumps/
   - Fallback de sécurité

### 3. Logs

Quand des fichiers sont sautés, vous verrez:

```
Skipped 47 files already processed in database
```

## Architecture des fichiers

### Nouveau fichier: `db_checker.py`

```python
ProcessedFilesChecker.load_processed_files()  # Charge depuis DB
ProcessedFilesChecker.is_file_processed_sync(filename)  # Check si traité
ProcessedFilesChecker.filter_unprocessed_files(filelist)  # Filtre une liste
```

**Cache en mémoire:**
- Les fichiers sont chargés UNE FOIS au démarrage
- Cache valide pour 5 minutes
- Lookups ultra-rapides (set-based, O(1))

### Fichiers modifiés

1. **scrapper_runner.py**
   - Charge les fichiers traités au début de `run()`
   - Active seulement si `lookup_in_db=True` (défaut)

2. **scraper_status.py**  
   - `filter_already_downloaded()` vérifie PostgreSQL en premier
   - Compatibilité totale avec l'ancien système

3. **utils/__init__.py**
   - Export des nouvelles fonctions

## Workflow complet

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Démarrage Scraper                                         │
│    └─> load_processed_files() → charge 512 fichiers en cache│
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. Scan du site web (FTP/HTTP)                               │
│    └─> Trouve 600 fichiers disponibles                       │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. Filtrage (filter_already_downloaded)                      │
│    ├─> Check PostgreSQL: 512 fichiers déjà traités → SKIP   │
│    ├─> Check JSON: 0 fichiers                                │
│    └─> Check disk: 30 fichiers déjà dans dumps/ → SKIP      │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. Téléchargement                                             │
│    └─> Télécharge seulement 58 nouveaux fichiers (600-542)  │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. Import vers DB (import_xml_to_db.py)                      │
│    └─> Marque les 58 nouveaux fichiers comme processed       │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ 6. Prochain scrape                                            │
│    └─> Cache mis à jour, skip automatique des 58 fichiers   │
└──────────────────────────────────────────────────────────────┘
```

## Performance

### Avant (sans DB check)
- Télécharge TOUS les fichiers du site
- Re-télécharge même les fichiers déjà traités
- Imports échouent avec des duplicates
- Gaspillage de bande passante

### Après (avec DB check)  
- Télécharge SEULEMENT les nouveaux fichiers
- Skip automatique des fichiers traités
- Zero duplicates dans la DB
- ✅ Économie de bande passante
- ✅ Téléchargements 10-50x plus rapides selon le site

## Exemple réel

```bash
# Premier scrape (DB vide)
Loading processed files from database...
Processed files loaded successfully (0 files)
Found 600 files on website
Downloading 600 files...
[... download ...]
Import completed: 600 files

# Deuxième scrape (après import)
Loading processed files from database...
Processed files loaded successfully (600 files)
Found 600 files on website
Skipped 600 files already processed in database
Number of entry after filter already downloaded is 0
Done scraping - nothing to download!

# Troisième scrape (avec 50 nouveaux fichiers)
Loading processed files from database...
Processed files loaded successfully (600 files)  
Found 650 files on website
Skipped 600 files already processed in database
Number of entry after filter already downloaded is 50
Downloading 50 files...
```

## Configuration

Le système est activé par défaut via:

```python
runner = MainScrapperRunner(lookup_in_db=True)  # Défaut = True
```

Pour désactiver (tests uniquement):
```python
runner = MainScrapperRunner(lookup_in_db=False)
```

## Nettoyage

Après import, vous pouvez nettoyer les fichiers du dossier dumps/:

```bash
python clean_processed_dumps.py
```

Ou via le GUI: bouton "🧹 Nettoyer Dumps Traités"

Cela supprime les fichiers déjà importés dans la DB, économisant l'espace disque.

## Dépannage

### Le scraper télécharge encore des fichiers déjà traités

1. Vérifiez que la DB est accessible:
   ```bash
   python test_db_checker.py
   ```

2. Vérifiez les fichiers dans processed_files:
   ```bash
   python check_processed.py
   ```

3. Vérifiez les logs du scraper:
   ```
   Loading processed files from database... ✓
   Processed files loaded successfully (512 files) ✓
   ```

### Erreur "Could not load processed files from DB"

- PostgreSQL n'est pas démarré
- La table processed_files n'existe pas
- Problème de connexion réseau

**Solution:** Le scraper continuera avec le fallback (disk check)

## Compatibilité

✅ Compatible avec l'ancien système JSON  
✅ Compatible avec tous les scrapers existants  
✅ Pas de breaking changes  
✅ Fallback automatique si DB indisponible
