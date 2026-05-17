# 👥 Utilisateurs depuis MEGA

## Le nouveau flux

**Avant** : Users en localStorage (créés manuellement)
**Maintenant** : Users = dossiers MEGA (source de vérité) ✅

---

## API Endpoint

```
GET /api/users

Response:
{
  "success": true,
  "users": [
    { "name": "Denis", "fileCount": 5 },
    { "name": "Li", "fileCount": 2 },
    { "name": "Sophie", "fileCount": 8 }
  ]
}
```

---

## Comment modifier ui.js

### Au démarrage (dans `initLoginPage`)

**Avant** :
```javascript
populateUserSelect() {
    const select = document.getElementById('userSelect');
    const users = DataManager.getAllUsers(); // ❌ localStorage
    // ...
}
```

**Après** :
```javascript
async initLoginPage() {
    this.populateUserSelect();
    
    // Charger les utilisateurs depuis MEGA
    const megaUsers = await MegaHelper.getUsers();
    
    if (megaUsers.length > 0) {
        // Mettre à jour le select avec les utilisateurs MEGA
        const select = document.getElementById('userSelect');
        select.innerHTML = '<option value="">-- Sélectionne toi --</option>';
        
        megaUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user.name; // Utiliser le nom comme ID
            option.textContent = `${user.name} (${user.fileCount} fichiers)`;
            select.appendChild(option);
        });
    }
    
    document.getElementById('loginBtn').addEventListener('click', () => this.login());
    document.getElementById('registerBtn').addEventListener('click', () => this.register());
}
```

---

## Modifier login()

```javascript
login() {
    const userName = document.getElementById('userSelect').value;

    if (!userName) {
        alert('Sélectionne un utilisateur');
        return;
    }

    // Au lieu de chercher par ID, utiliser le nom
    this.currentUserName = userName;
    
    // Charger les partitions de cet utilisateur depuis MEGA
    this.loadUserPartitions(userName);
    
    this.showAppPage({ name: userName });
}
```

---

## Nouveau : loadUserPartitions()

```javascript
async loadUserPartitions(userName) {
    console.log(`📁 Loading partitions for ${userName}...`);
    
    const files = await MegaHelper.listUserFiles(userName);
    
    // Créer une partition pour chaque fichier MEGA
    files.forEach(file => {
        DataManager.addPartition(
            file.name.split(' - ')[0] || file.name,
            'MEGA',
            file.name,
            file.size,
            null, // megaUrl (on peut le récupérer si besoin)
            file.nodeId
        );
    });
    
    console.log(`✅ Loaded ${files.length} partitions`);
}
```

---

## Modifier register()

```javascript
async register() {
    const name = document.getElementById('newUsername').value.trim();

    if (!name) {
        alert('Entre ton nom');
        return;
    }

    const instrumentCheckboxes = document.querySelectorAll(
        '.instruments-grid input[type="checkbox"]:checked'
    );
    const instruments = Array.from(instrumentCheckboxes).map(cb => cb.value);

    if (instruments.length === 0) {
        alert('Sélectionne au moins un instrument');
        return;
    }

    // Au lieu de créer en localStorage, créer sur MEGA
    // (Replit créera automatiquement le dossier à la première upload)
    console.log(`✅ Nouvel utilisateur: ${name}`);
    
    this.currentUserName = name;
    this.showAppPage({ name, instruments });
}
```

---

## Le flux complet maintenant

```
1. App démarre
   ↓
2. GET /api/users (depuis MEGA)
   ↓
3. Remplir le select avec les noms des dossiers
   ↓
4. User se connecte ou crée un compte
   ↓
5. GET /api/list/:userName (depuis MEGA)
   ↓
6. Charger les partitions du user
   ↓
7. Afficher la liste des partitions
   ↓
8. User clique "Télécharger" → POST /api/upload
   ↓
9. Fichier sauvegardé dans dossier user sur MEGA
   ↓
10. Partition apparaît immédiatement ✅
```

---

## Important

- **Plus de DataManager.getAllUsers()** ❌
- **Utiliser MegaHelper.getUsers()** ✅
- **Plus de localStorage pour users** ❌
- **MEGA = source de vérité** ✅

Le dossier est créé automatiquement sur MEGA à la première upload !

---

## Test

Ouvre la console :

```javascript
// Charger les utilisateurs depuis MEGA
const users = await MegaHelper.getUsers();
console.log('Users:', users);

// Devrait retourner quelque chose comme :
// Users: [
//   { name: "Denis", fileCount: 5 },
//   { name: "Li", fileCount: 2 }
// ]
```

C'est bon ? 🎵
