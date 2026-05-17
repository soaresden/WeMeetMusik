# 🔐 Système de Permissions & Logs Détaillés

## ✅ Changements apportés

### 1. **Système de permissions**
- ✅ Chaque partition trackée avec `uploadedBy: userName`
- ✅ Seul l'auteur peut supprimer sa partition
- ✅ Message d'erreur si quelqu'un d'autre essaie de supprimer
- ✅ Logs détaillés dans la console

### 2. **Logs détaillés**
- ✅ **initLoginPage()** → logs de chargement
- ✅ **populateUserSelect()** → logs de chaque user
- ✅ **login()** → logs du flux de connexion
- ✅ **register()** → logs de chaque étape
- ✅ **loadUserPartitions()** → logs de chaque fichier
- ✅ **downloadPartition()** → logs complets d'upload
- ✅ **deletePartition()** → logs de permissions et suppression
- ✅ **showAppPage()** → logs d'initialisation

---

## 🧪 Procédure de test

### Étape 1: Ouvre la console (F12)

```
Appuie sur F12 ou Clic droit → Inspecter → Onglet Console
```

### Étape 2: Actualise la page

```
F5 ou Ctrl+R
```

### Étape 3: Regarde les logs de démarrage

Tu devrais voir:
```
🚀 Initializing login page...
📥 Loading users from MEGA...
   Retrieved 2 users from MEGA
   User 1: Denis (5 files)
   User 2: Li (2 files)
✅ Select populated with 2 users
🔗 Setting up event listeners...
✅ Login page initialized
```

---

## 👤 Test 1: Créer un compte

### Actions:
1. Entre ton nom : "TestUser"
2. Sélectionne des instruments (au moins 1)
3. Clique "Créer un compte"

### Logs attendus dans la console:

```
✍️  Register button clicked
📝 Starting registration...
   Username entered: "TestUser"
   Instruments selected: 3 items
   Instruments: Violon, Piano, Guitare Seche
✅ Registration valid for user: TestUser
   Folder will be created on MEGA on first upload
   currentUserName set to: TestUser
   Form reset
   Checkboxes reset
   Refreshing user select...
   Retrieved 2 users from MEGA
   User 1: Denis (5 files)
   User 2: Li (2 files)
✅ Select populated with 2 users
   User select refreshed
   Showing app page for user: TestUser
🎵 Showing app page...
   User: TestUser
   Instruments: Violon, Piano, Guitare Seche
   Login page hidden, app page shown
   User header updated
   User ID set to: user_TestUser
   User online status updated, login logged
   Initializing UI components...
   UI components initialized
✅ App page ready
✅ Registration complete - app page shown
```

---

## 🎵 Test 2: Créer deux comptes et tester les permissions

### Setup:
1. Crée compte "Alice"
2. Télécharge partition "Bohemian Rhapsody"
3. Déconnecte-toi (Logout)
4. Crée compte "Bob"
5. Essaie de supprimer la partition d'Alice

### Logs attendus:

**Upload par Alice:**
```
⬇️  Download started for: Bohemian Rhapsody - Queen
   Current user: Alice
   File created: Bohemian Rhapsody - Queen.mcsz (0 bytes)
   UI showing loading state
   Uploading to MEGA for user: Alice
   Upload successful!
   MEGA URL: https://mega.nz/...
   Node ID: xyz789
   Partition saved to localStorage
   Partition ID: part_1234567890
   Uploaded by: Alice
   Activity logged
   UI refreshed
✅ Download complete for: Bohemian Rhapsody
```

**Bob essaie de supprimer:**
```
❌ ACCES REFUSE: Bob essaie de supprimer une partition de Alice
```

**Et une alerte:**
```
❌ Tu ne peux supprimer que tes propres partitions !
Cette partition a été uploadée par Alice.
```

---

## 🔍 Test 3: Login d'un utilisateur existant

### Actions:
1. Actualise la page (F5)
2. Sélectionne "Denis" dans le dropdown
3. Clique "Se connecter"

### Logs attendus:

```
👤 Login started
   Username selected: "Denis"
   currentUserName set to: Denis
   Loading partitions from MEGA...
📁 Loading partitions for Denis...
   Retrieved 5 files from MEGA
   File 1: bach.pdf (204800)
   File 2: mozart.pdf (156320)
   ...
✅ Loaded 5 partitions for Denis
   Showing app page for user: Denis
🎵 Showing app page...
   User: Denis
   Instruments: Violon, Piano
✅ Login complete
```

---

## 🗑️ Test 4: Supprimer sa propre partition

### Actions:
1. Connecté en tant que "Alice"
2. Sélectionne une partition qu'Alice a uploadée
3. Clique "Supprimer"
4. Confirme la suppression

### Logs:

```
🗑️  Alice supprime "Bohemian Rhapsody" (uploadée par Alice)
🗑️  Deleting xyz789...
✅ Fichier supprimé
✅ Partition supprimée de MEGA et localStorage
```

---

## 📋 Résumé des logs par fonction

| Fonction | Logs clés |
|----------|-----------|
| initLoginPage() | 🚀 Initializing, ✅ Login page initialized |
| populateUserSelect() | 📥 Populating, ✅ Select populated |
| login() | 👤 Login started, ✅ Login complete |
| register() | 📝 Starting, ✅ Registration complete |
| loadUserPartitions() | 📁 Loading, ✅ Loaded X partitions |
| downloadPartition() | ⬇️ Download started, ✅ Download complete |
| deletePartition() | 🗑️ Supprime, ✅ Partition supprimée |
| showAppPage() | 🎵 Showing, ✅ App page ready |

---

## 🔗 Vérification des données

### Dans la console, tu peux aussi taper:

```javascript
// Voir tous les utilisateurs
DataManager.getAllUsers()

// Voir toutes les partitions avec uploadedBy
DataManager.getAllPartitions()

// Voir les logs d'activité
DataManager.getLogs(20)

// Voir l'utilisateur actuel
UI.currentUserName
UI.currentUserId

// Voir les utilisateurs en ligne
DataManager.getOnlineUsers()
```

---

## ✨ Points clés de vérification

### Permission system ✅
- [ ] Un user ne peut pas supprimer les partitions des autres
- [ ] Message d'erreur clair si accès refusé
- [ ] Seul l'auteur peut supprimer
- [ ] Logs tracent qui essaie de supprimer quoi

### Logging ✅
- [ ] Logs à chaque étape majeure
- [ ] Console affiche les mouvements utilisateur
- [ ] Erreurs bien documentées
- [ ] Stack traces visibles si crash

### Registration ✅
- [ ] Formulaire accepte le nom
- [ ] Instruments stockés
- [ ] Logs détaillés du processus
- [ ] App page apparaît après

### Login ✅
- [ ] Users listés depuis MEGA
- [ ] Partitions chargées avec uploadedBy
- [ ] Permissions correctes

---

## 🐛 Si quelque chose ne marche pas

1. **Logs vides?**
   - Vérifie que tu as ouvert la bonne console (F12 → Console)
   - Rafraîchis la page (F5)
   - Vérifie qu'il n'y a pas d'erreur JavaScript (tab Console)

2. **Registration ne fonctionne pas?**
   - Regarde les logs dans la console
   - Vérifie que tu as sélectionné des instruments
   - Vérifie que le nom n'est pas vide

3. **Permissions ne marchent pas?**
   - Vérifiez que partition.uploadedBy est défini
   - Regardez le console.log avant de supprimer

4. **Erreur SyntaxError?**
   - J'ai corrigé la virgule manquante dans updateStatusButtons
   - Rafraîchis la page

---

## 📊 Architecture des permissions

```
Partition object:
{
    id: 'part_123',
    title: 'Song',
    artist: 'Artist',
    fileName: 'song.mcsz',
    fileSize: '2.5 MB',
    megaUrl: 'https://mega.nz/...',
    nodeId: 'abc123',
    uploadedBy: 'Alice',  ← KEY FIELD FOR PERMISSIONS
    dateAdded: 1234567890
}

Delete logic:
if (partition.uploadedBy !== currentUserName) {
    ❌ ACCESS DENIED
} else {
    ✅ DELETE ALLOWED
}
```

C'est bon maintenant ! 🎵
