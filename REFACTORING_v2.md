# WeMeetMusik v2.0 - Refactoring

## 📋 Résumé des changements

### Architecture simplifiée:

**Avant:** 
- Utilisateurs uploadent directement sur MEGA avec credentials
- Code complexe pour gérer les dossiers utilisateurs
- LibreScore API intégration compliquée (bloquée par CORS)

**Maintenant:**
- Pas de credentials dans le code (plus sécurisé!)
- Lire les fichiers depuis un **dossier MEGA partagé public**
- Les utilisateurs font des "souhaits" (Artiste + Titre)
- Denis télécharge manuellement et upload sur MEGA
- Les autres voient "Disponible" et téléchargent

---

## 🔄 Flux utilisateur

### Utilisateur normal (ex: Li):
1. **Login** → Sélectionne son nom
2. **Ajoute partition souhaitée** → Form: Titre + Artiste (+ status optionnel)
3. **Voit sa partition** → Status: "⏳ À télécharger"
4. **Partition disponible** → Denis a téléchargé, Status: "✅ Disponible"
5. **Télécharge** → Clique sur la partition, voir le lien MEGA

### Denis (administrateur):
1. **Voit les souhaits** → List de partitions à télécharger
2. **Télécharge** → Va sur https://msdl.librescore.org/
   - Entre le nom ou l'ID MuseScore
   - Télécharge le MSCZ
3. **Upload sur MEGA** → Drag-drop dans le dossier partagé
   - Lien: https://mega.nz/folder/Zgx2WAIC#b_pZhR6hNun_h3JkSZRmGA
4. **App se met à jour** → Status passe à "✅ Disponible"

---

## 🗂️ Fichiers modifiés/créés

### Créés:
- **megaPublicHelper.js** - Lire le dossier MEGA partagé
  - `listAvailablePartitions()` - Liste les MSCZ disponibles
  - `checkFolderAccess()` - Vérifier l'accès au dossier

### Modifiés:
- **userData.js**
  - `addPartition()` - Accepte fileName=null pour les "souhaits"
  - `downloadStatus` - Nouveau champ: 'à_télécharger' | 'disponible'
  - `updatePartitionDownloadStatus()` - Mettre à jour le status

- **ui.js** - Refactorisé complètement
  - Suppression de `ensureUserFolderExists()` (plus besoin)
  - Nouveau: Formulaire "Ajouter partition souhaitée"
  - Colonne "Status" dans la table
  - `loadPartitions()` - Charge depuis localStorage + MEGA
  - `addNewPartition()` - Crée un souhait sans fichier

- **index.html**
  - Suppression colonne "User" et "Fichier"
  - Ajout colonne "Status"
  - Nouveau formulaire: "➕ Ajouter une partition souhaitée"
    - Titre, Artiste, Checkboxes (Je travaille/Todo/Je sais la faire)

- **styles.css**
  - `.new-partition-form` - Style du formulaire
  - `.form-input` - Champs de saisie
  - `.form-status-option` - Checkboxes
  - `.status-badge-available` - Badge vert "✅ Disponible"
  - `.status-badge-pending` - Badge orange "⏳ À télécharger"

- **app.js**
  - Vérification de l'accès au dossier MEGA
  - Pas d'upload/credentials

### Supprimés:
- ~~megaConfig.js~~ - Plus besoin (pas de credentials)
- ~~megaHelper.js~~ - Remplacé par megaPublicHelper.js
- Toutes les références upload/delete MEGA côté client

---

## 🔐 Sécurité

### Avant:
```javascript
const MEGA_CONFIG = {
    email: 'soaresden+wemeet@gmail.com',
    password: 'lamusique1980!'  // ⚠️ En clair dans le code!
};
```

### Maintenant:
```javascript
const MegaPublicHelper = {
    SHARED_FOLDER_URL: 'https://mega.nz/folder/Zgx2WAIC#...',
    // Pas de credentials - juste lire un dossier public
};
```

✅ **Plus d'email/password dans le code!**

---

## 📊 Nouvelle structure de partition

### Avant:
```javascript
{
    id: 'part_123',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    fileName: 'Bohemian Rhapsody - Queen.mscz',
    fileSize: 524288,
    megaUrl: '...',
    nodeId: '...',
    uploadedBy: 'user_123',
    dateAdded: 1234567890
}
```

### Maintenant (souhait):
```javascript
{
    id: 'part_123',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    fileName: null,           // ⭐ Pas de fichier
    fileSize: null,           // ⭐ Pas encore dispo
    megaUrl: null,
    nodeId: null,
    uploadedBy: 'user_li',    // Qui a fait le souhait
    downloadStatus: 'à_télécharger', // ⭐ Nouveau
    dateAdded: 1234567890
}
```

### Après que Denis upload:
```javascript
{
    // ... (même objet)
    fileName: 'Bohemian Rhapsody - Queen.mscz',
    fileSize: 524288,
    downloadStatus: 'disponible'  // ⭐ Mis à jour
}
```

---

## 🔧 Prochaines étapes

### Pour Denis:
1. ✅ Installer l'app
2. Test: Ajouter un souhait depuis l'app
3. Télécharger manuellement via https://msdl.librescore.org/
4. Upload sur MEGA: https://mega.nz/folder/Zgx2WAIC#b_pZhR6hNun_h3JkSZRmGA
5. Vérifier que l'app détecte le nouveau fichier (status "Disponible")

### Améliorations futures:
- [ ] Upload direct dans l'app vers MEGA (si dossier privé + credentials)
- [ ] Notifications quand une partition devient disponible
- [ ] Lier aux partitions réelles sur MuseScore (afficher la portée)
- [ ] Recherche avancée (genre, difficulté, tonalité)

---

## 🎵 Dossier MEGA

**Lien partagé:** https://mega.nz/folder/Zgx2WAIC#b_pZhR6hNun_h3JkSZRmGA

Mets les fichiers MSCZ directement à la racine du dossier.

Format de nom recommandé: `Titre - Artiste.mscz`
(Exemple: `Bohemian Rhapsody - Queen.mscz`)

