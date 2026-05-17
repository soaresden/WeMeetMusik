# 🧪 Guide de Test - Architecture MEGA

## ✅ Modifications effectuées

### ui.js
- ✅ `initLoginPage()` → async, charge les users depuis MEGA
- ✅ `populateUserSelect()` → async, appelle MegaHelper.getUsers()
- ✅ `login()` → async, charge les partitions de l'utilisateur depuis MEGA
- ✅ `loadUserPartitions()` → nouvelle fonction async
- ✅ `register()` → ne crée plus d'utilisateur en localStorage
- ✅ `downloadPartition()` → async, upload sur MEGA et sauvegarde megaUrl + nodeId
- ✅ Suppression → async, supprime de MEGA avant localStorage

### userData.js
- ✅ `addPartition()` → accepte megaUrl et nodeId
- ✅ `deletePartition()` → async, supprime de MEGA aussi

---

## 🚀 Scénarios de test

### 1. Démarrage de l'app

```
1. Ouvre index.html
2. Regarde la console (F12)
3. Tu devrais voir :
   ✅ MegaHelper prêt
   📍 API: https://sheet-uploader--soaresden.replit.app
   👥 Loading users from MEGA...
   ✅ Loaded X users from MEGA
```

### 2. Sélection d'un utilisateur

```
1. Le select devrait être rempli avec les noms des dossiers MEGA
   Format: "Denis (5 fichiers)", "Li (2 fichiers)", etc.
2. Sélectionne un utilisateur
3. Clique "Se connecter"
4. Console devrait afficher :
   📁 Loading partitions for [USERNAME]...
   ✅ Loaded Y partitions
```

### 3. Création d'un nouvel utilisateur

```
1. Remplis le formulaire :
   - Nom d'utilisateur
   - Sélectionne des instruments
2. Clique "Créer un compte"
3. Console devrait afficher :
   ✅ Nouvel utilisateur: [NAME]
4. Tu dois être connecté
5. Le dossier sera créé sur MEGA à la première upload
```

### 4. Télécharger une partition depuis LibreScore

```
1. Va dans l'onglet "🔍 Recherche"
2. Cherche "Bohemian" (ou n'importe quel titre)
3. Clique "⬇️ Télécharger"
4. Console devrait afficher :
   ⏳ Upload en cours...
   ⬆️  Upload [FILENAME] pour [USERNAME]...
   ✅ Fichier uploadé: [FILENAME]
      MEGA URL: https://mega.nz/...
5. La partition doit apparaître dans "Mes partitions"
```

### 5. Supprimer une partition

```
1. Sélectionne une partition
2. Clique "Supprimer"
3. Confirme la suppression
4. Console devrait afficher :
   🗑️  Deleting [NODEID]...
   ✅ Fichier supprimé
5. La partition doit disparaître de la liste
```

### 6. Changer le statut d'une partition

```
1. Sélectionne une partition
2. Clique "Je travaille dessus"
3. La partition devrait se déplacer en haut (priorité)
4. Badge "🎵 [TonNom]" devrait apparaître
5. Console du log devrait montrer l'action
```

---

## 🔍 Points de contrôle clés

### Architecture correcte ?
- [ ] Users viennent de MEGA (pas localStorage)
- [ ] Partitions chargées depuis dossier user sur MEGA
- [ ] Upload crée le dossier user automatiquement
- [ ] megaUrl et nodeId sont stockés pour chaque partition
- [ ] Suppression enlève de MEGA ET localStorage

### Logs dans la console
```javascript
// Test dans la console :

// 1. Vérifier les users
const users = await MegaHelper.getUsers();
console.log('Users:', users);

// 2. Vérifier les fichiers d'un user
const files = await MegaHelper.listUserFiles('Denis');
console.log('Files:', files);

// 3. Vérifier un upload test
const testFile = new File(['test'], 'test.mcsz');
const result = await MegaHelper.uploadFile(testFile, 'Denis');
console.log('Upload result:', result);
```

---

## ⚠️ Problèmes courants

### Les users ne chargent pas
- Vérifie que le serveur Replit est en ligne
- Vérifie l'URL dans megaHelper.js
- Regarde la console pour les erreurs CORS

### Les partitions n'apparaissent pas après upload
- Vérifie que `loadUserPartitions()` a été appelée
- Vérifie que la partition a un `megaUrl` et `nodeId`
- Check localStorage: `DataManager.getAllPartitions()`

### Les uploads échouent
- Vérifie que tu as accès au dossier MEGA
- Vérifie que le nom d'utilisateur existe sur MEGA
- Regarde l'erreur dans la console

---

## 📊 Flux complet

```
App démarre
    ↓
GET /api/users (depuis MEGA)
    ↓
Remplir le select avec [nom] (fileCount fichiers)
    ↓
User clique "Se connecter"
    ↓
GET /api/list/:userName (depuis MEGA)
    ↓
Charger les partitions du user
    ↓
Afficher "Mes partitions" + "🔍 Recherche"
    ↓
User clique "Télécharger" (depuis LibreScore)
    ↓
POST /api/upload → Replit → MEGA
    ↓
Retourne { megaUrl, nodeId }
    ↓
DataManager.addPartition() sauvegarde + megaUrl + nodeId
    ↓
UI se met à jour
    ↓
Tous voient la partition dans l'arborescence ✅
```

---

## ✨ Résumé des changements

| Fonction | Avant | Après |
|----------|-------|-------|
| Users | localStorage | MEGA directories |
| Partitions | localStorage (manuelles) | MEGA files |
| Upload | Pas d'upload réel | Upload sur MEGA via Replit |
| Partitions chargement | Au démarrage | Après login |
| Suppression | localStorage seulement | localStorage + MEGA |

---

## 🎯 Prochaines étapes optionnelles

1. Afficher les liens MEGA pour télécharger directement
2. Synchroniser les statuts aussi sur MEGA
3. Real-time updates quand quelqu'un upload
4. Limite de taille de fichier
5. Compression des fichiers MCSZ

C'est bon ! 🎵
