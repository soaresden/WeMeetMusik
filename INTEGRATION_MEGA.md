# 🎵 Intégration MEGA - Guide Complet

Ton serveur Replit est maintenant **LIVE** ! 🚀

**URL API:** `https://sheet-uploader--soaresden.replit.app`

---

## ✅ Ce qui est prêt

- ✅ `megaHelper.js` - Utilise les endpoints Replit
- ✅ Serveur Replit avec 3 endpoints actifs
- ✅ Tout sans serveur complexe

---

## 🔗 Les 3 endpoints Replit

### 1. **POST /api/upload** - Upload un fichier

```javascript
const formData = new FormData();
formData.append('file', fileObject);
formData.append('folder', 'Denis'); // nom utilisateur

const response = await fetch('https://sheet-uploader--soaresden.replit.app/api/upload', {
    method: 'POST',
    body: formData
});

const data = await response.json();
// {
//   success: true,
//   name: "bach.pdf",
//   size: 204800,
//   megaUrl: "https://mega.nz/...",
//   nodeId: "abc123"
// }
```

### 2. **GET /api/list/:userName** - Lister les fichiers

```javascript
const response = await fetch('https://sheet-uploader--soaresden.replit.app/api/list/Denis');

const data = await response.json();
// {
//   success: true,
//   folder: "Denis",
//   files: [
//     { name: "bach.pdf", size: 204800, nodeId: "abc123", isDirectory: false }
//   ]
// }
```

### 3. **POST /api/delete** - Supprimer un fichier

```javascript
const response = await fetch('https://sheet-uploader--soaresden.replit.app/api/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeId: 'abc123' })
});

const data = await response.json();
// { success: true }
```

---

## 📝 Utiliser MegaHelper dans ui.js

### **Quand on clique "Télécharger" (recherche LibreScore)**

Trouve cette fonction dans ui.js et modifie-la :

```javascript
downloadPartition(partition) {
    const user = DataManager.getUserById(this.currentUserId);
    
    // 1. Créer un File object simulé
    const file = new File(
        [partition.fileName], 
        `${partition.title} - ${partition.artist}.mcsz`
    );
    
    // 2. Upload sur MEGA via Replit
    MegaHelper.uploadFile(file, user.name)
        .then(result => {
            // 3. Sauvegarder dans la base de données
            const newPartition = DataManager.addPartition(
                partition.title,
                partition.artist,
                result.name,
                result.size,
                result.megaUrl,
                result.nodeId
            );
            
            // 4. Log l'action
            DataManager.addLog(
                this.currentUserId,
                'Télécharge partition',
                `${partition.title} - ${partition.artist}`
            );
            
            // 5. Rafraîchir l'interface
            this.switchTab('my-partitions');
            this.renderPartitionsTree();
            
            alert(`✅ ${partition.title} téléchargé !`);
        })
        .catch(error => {
            alert(`❌ Erreur: ${error.message}`);
        });
}
```

### **Quand on clique "Supprimer"**

Trouve cette fonction et modifie-la :

```javascript
deletePartitionBtn.addEventListener('click', async () => {
    if (confirm('Supprimer cette partition pour tout le monde ?')) {
        const partition = DataManager.getPartitionById(partitionId);
        
        // 1. Supprimer de MEGA (best effort)
        if (partition.nodeId) {
            await MegaHelper.deleteFile(partition.nodeId);
        }
        
        // 2. Supprimer de la base
        DataManager.deletePartition(partitionId);
        
        // 3. Log l'action
        DataManager.addLog(
            this.currentUserId,
            'Supprime',
            partition.title
        );
        
        // 4. Rafraîchir
        document.getElementById('noSelection').style.display = 'flex';
        document.getElementById('partitionDisplay').style.display = 'none';
        this.renderPartitionsTree();
        this.updateActivityLog();
    }
});
```

---

## 🧪 Test rapide

Ouvre la Console (F12) et copie ça :

```javascript
// Tester l'upload
const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
MegaHelper.uploadFile(testFile, 'Denis')
    .then(result => console.log('✅ Upload OK:', result))
    .catch(err => console.error('❌ Upload FAILED:', err));
```

Tu devrais voir dans la console :
```
⬆️  Upload test.txt pour Denis...
✅ Fichier uploadé: test.txt
   MEGA URL: https://mega.nz/...
```

---

## 📊 Flux complet

```
User clique "Télécharger"
    ↓
MegaHelper.uploadFile(file, userName)
    ↓
POST /api/upload → Replit
    ↓
Replit upload sur MEGA
    ↓
Retourne { megaUrl, nodeId }
    ↓
DataManager.addPartition() sauvegarde en localStorage
    ↓
UI se met à jour
    ↓
DataManager.addLog() log l'action
    ↓
Tous voient l'activité en live ✅
```

---

## 🎯 Résumé

- **megaHelper.js** ← Prêt ✅
- **Replit server** ← Live ✅
- **ui.js** ← À mettre à jour (voir code ci-dessus)
- **userData.js** ← Modifier pour supporter `megaUrl` et `nodeId`

---

## ⚠️ Modifs à userData.js

Ajoute ces champs à la partition :

```javascript
{
    id: 'part_1',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    fileName: 'bohemian-rhapsody.mcsz',
    fileSize: '2.4 MB',
    megaUrl: 'https://mega.nz/...',    // ← NOUVEAU
    nodeId: 'abc123',                  // ← NOUVEAU
    userId: 'user_1',
    dateAdded: Date.now()
}
```

C'est tout ! 🎵
