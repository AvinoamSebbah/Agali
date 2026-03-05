# 🧪 Codes-barres de Test pour עגלי

Pour tester l'application, voici quelques codes-barres de produits israéliens populaires :

## 🥛 Produits Laitiers

- **7290000066028** - Tnuva Milk 3% 1L
- **7290000066011** - Tnuva Milk 1% 1L
- **7290000067001** - Tnuva Yogurt
- **7290000127019** - Tnuva Cottage Cheese

## 🍞 Pain et Boulangerie

- **7290008615556** - Berman Bread
- **7290111344206** - Angel Bakery White Bread

## 🍫 Snacks et Confiseries

- **7290002473115** - Bissli BBQ
- **7290002473139** - Bissli Pizza
- **7622300489434** - Nutella
- **8714100770283** - Oreo

## 🥫 Produits d'Épicerie

- **7290000066707** - Osem Soup Mix
- **7290000693989** - Osem Noodles
- **7296073340522** - Sugat Coffee

## 🧴 Produits Ménagers

- **7290011447359** - Fairy Dishwashing Liquid
- **8001841134093** - Pril

## 🍺 Boissons

- **5449000000996** - Coca Cola 1.5L
- **7290000066875** - Tempo Beer
- **7290104979910** - Tapuzina Orange Juice

## 📱 Comment Utiliser

### Dans la Recherche
1. Allez sur `/search`
2. Collez un code-barres dans la barre de recherche
3. Voyez les prix et promotions

### Dans le Comparateur
1. Allez sur `/compare`
2. Entrez plusieurs codes-barres
3. Comparez les prix totaux

### Dans le Scanner
1. Allez sur `/scan`
2. Lancez la caméra
3. Scannez les codes-barres imprimés
4. Ou entrez-les manuellement pour tester

## 🎯 Scénarios de Test

### Scénario 1 : Panier Petit-Déjeuner
```
7290000066028  # Lait
7290000067001  # Yaourt
7290008615556  # Pain
7622300489434  # Nutella
```

### Scénario 2 : Soirée Film
```
5449000000996  # Coca Cola
7290002473115  # Bissli BBQ
7290002473139  # Bissli Pizza
8714100770283  # Oreo
```

### Scénario 3 : Courses Basiques
```
7290000066028  # Lait
7290000127019  # Fromage Cottage
7290000066707  # Soupe
7290000693989  # Nouilles
```

## 🔍 Vérifier la Disponibilité

Avant de tester, vérifiez quels produits sont dans votre base de données :

```sql
-- Dans Prisma Studio ou psql
SELECT item_code, item_name, COUNT(*) as price_count
FROM products p
LEFT JOIN prices pr ON p.item_code = pr.item_code
WHERE p.item_code IN (
  '7290000066028',
  '7290000066011',
  '7290111344206'
)
GROUP BY p.item_code, p.item_name;
```

## 💡 Astuce

Si un code-barres ne retourne pas de résultats :
1. Vérifiez qu'il existe dans la table `products`
2. Vérifiez qu'il a des prix associés dans la table `prices`
3. Assurez-vous que les dumps XML ont été importés

## 📸 Scanner de Codes-Barres

Pour tester le scanner :
1. Imprimez quelques codes-barres sur papier
2. Utilisez un générateur en ligne : https://www.barcode-generator.org/
3. Choisissez le format **EAN-13**
4. Entrez le code-barres complet (13 chiffres)
5. Téléchargez et imprimez

## 🎨 Images de Produits

Sources d'images :
- **OpenFoodFacts** : https://world.openfoodfacts.org/product/{barcode}
- **Pricez** : https://m.pricez.co.il/ProductPictures/200x/{barcode}.jpg

Exemple :
- https://world.openfoodfacts.org/product/7290111344206
- https://m.pricez.co.il/ProductPictures/200x/7290111344206.jpg

---

**Bon test ! 🧪🛒**
