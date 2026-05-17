# 🚀 SETUP REPLIT (Mini Backend Upload)

## 1️⃣ Créer le Replit

1. Va sur https://replit.com
2. Clique **"Create"** → **"New Replit"**
3. Choisis **"Node.js"**
4. Nomme-le : `wemeet-mega-upload`
5. Clique **"Create Replit"**

---

## 2️⃣ Copier le code serveur

Dans le fichier `index.js` de Replit, mets ça :

```javascript
const express = require('express');
const multer = require('multer');
const { Storage } = require('mega');
const cors = require('cors');

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

const MEGA_CONFIG = {
    email: 'soaresden+wemeet@gmail.com',
    password: 'lamusique1980'
};

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Pas de fichier' });
        }

        const userName = req.body.userName || 'unknown';
        
        console.log(`⬆️  Upload ${req.file.originalname} pour ${userName}...`);

        // Créer dossier utilisateur sur Mega
        const storage = new Storage(MEGA_CONFIG);
        
        await new Promise((resolve, reject) => {
            storage.login(MEGA_CONFIG, resolve, reject);
        });

        const root = storage.getRootFolder();
        let userFolder = root.children?.find(
            child => child.name === userName && child.isFolder
        );

        if (!userFolder) {
            userFolder = root.mkdir(userName);
        }

        // Upload le fichier
        await new Promise((resolve, reject) => {
            userFolder.upload({
                name: req.file.originalname,
                size: req.file.size
            }, req.file.buffer, resolve, reject);
        });

        console.log(`✅ Fichier uploadé: ${req.file.originalname}`);

        res.json({
            success: true,
            message: `${req.file.originalname} uploadé sur Mega`,
            fileName: req.file.originalname,
            userName: userName
        });

    } catch (error) {
        console.error('❌ Erreur upload:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🎵 Server lancé sur port ${PORT}`);
});
```

---

## 3️⃣ Installer les dépendances

Dans le shell Replit (à droite), tape :

```bash
npm install express multer mega cors
```

Attends que ça finisse.

---

## 4️⃣ Lancer le serveur

Clique **"Run"** en haut.

Tu devrais voir :
```
🎵 Server lancé sur port 3000
```

---

## 5️⃣ Copier l'URL

Replit te donne une URL comme :
```
https://wemeet-mega-upload.replit.dev
```

Copie-la ! On la met dans l'app.

---

## 6️⃣ Tester

Dans la Console (F12), tape :

```javascript
const formData = new FormData();
formData.append('file', new File(['test'], 'test.txt'));
formData.append('userName', 'Denis');

fetch('https://TON_URL_REPLIT/upload', {
    method: 'POST',
    body: formData
})
.then(r => r.json())
.then(data => console.log('✅', data))
.catch(e => console.error('❌', e));
```

Si tu vois `✅ { success: true }` → ça marche ! 🎉

---

## 7️⃣ Intégrer dans l'app

Une fois l'URL Replit copiée, ouvre `megaHelper.js` et remplace :

```javascript
const REPLIT_UPLOAD_URL = 'https://TON_URL_REPLIT/upload';
```

C'est tout ! 🚀

---

## ⚠️ Notes

- Replit gratuit s'endort après 1h d'inactivité
  - Solution : ajoute un "wake-up" toutes les 5 min
- L'upload est limité à ~100MB (bon pour les partitions)
- Les fichiers vont dans le Mega de soaresden+wemeet@gmail.com

---

C'est bon ? Dis-moi l'URL Replit et je termine l'intégration ! 🎵
