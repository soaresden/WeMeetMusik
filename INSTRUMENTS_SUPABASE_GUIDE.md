# 🎸 Système d'instruments via Supabase

## 📋 Vue d'ensemble

Les instruments ne sont plus en dur dans le HTML. Ils sont maintenant:
- ✅ Chargés depuis **Supabase** (table `instruments`)
- ✅ Modifiables par les utilisateurs (ajout d'instruments custom)
- ✅ Sauvegardés **définitivement** (table `user_instruments`)

---

## 🗄️ Structure Supabase

### Table `instruments`
```
id (UUID) - Primary Key
name (TEXT) - Nom de l'instrument (UNIQUE)
is_custom (BOOLEAN) - True = custom, False = standard
created_by (TEXT) - Qui a créé (null si standard)
created_at (TIMESTAMP) - Quand créé
```

**10 instruments standard:**
- Violon, Piano, Guitare Seche, Guitare Elec
- Basse Seche, Basse Elect, Percu, Batterie
- Flute, Harmonica

### Table `user_instruments`
```
id (UUID) - Primary Key
user_id (UUID) - Référence à auth.users
instrument_id (UUID) - Référence à instruments
created_at (TIMESTAMP)
UNIQUE(user_id, instrument_id) - Pas de doublons
```

---

## ⚙️ Installation

### Étape 1: Exécute le SQL dans Supabase

Copie le SQL de **SUPABASE_INSTRUMENTS_SQL.md** dans:
- Supabase → SQL Editor
- Clique "Run"

**Erreur possible:** `relation "users" already exists`
- C'est normal! La table `users` existe déjà
- Utilise la version SQL avec `CREATE TABLE IF NOT EXISTS`

### Étape 2: Vérifie les tables

- Va dans Supabase → Data Editor
- Tu dois voir:
  - ✅ `instruments` (10 rows)
  - ✅ `user_instruments` (empty)

### Étape 3: Rafraîchis l'app

- F5 pour rafraîchir
- Regarde la console (F12)

Tu devrais voir:
```
🎵 Initializing InstrumentsManager...
📥 Loading standard instruments from Supabase...
✅ Loaded 10 standard instruments
   - Batterie
   - Flute
   ...
✅ InstrumentsManager ready
```

---

## 🎵 Fonctionnement

### Création d'un compte

1. **Instruments standards**
   - Chargés depuis Supabase
   - Affichés comme checkboxes
   - L'utilisateur en sélectionne plusieurs

2. **Instruments custom**
   - Champ libre "Instrument custom:"
   - Bouton "+ Ajouter"
   - Les instruments custom sont affichés sous forme de badges avec ✕ pour supprimer

3. **Sauvegarde**
   - Clique "Créer compte"
   - Les instruments sont sauvegardés dans Supabase:
     - Les instruments custom sont ajoutés à la table `instruments`
     - Les liens utilisateur sont créés dans `user_instruments`

### Workflow complet

```
User entre le nom et les instruments

InstrumentsManager.getSelectedInstruments()
├─ Instruments standards cochés
└─ Instruments custom ajoutés

InstrumentsManager.saveUserInstruments(name, instruments)
├─ Crée l'utilisateur dans auth.users
├─ Pour chaque instrument custom:
│  ├─ INSERT INTO instruments (custom)
│  └─ INSERT INTO user_instruments (link)
└─ Pour chaque instrument standard:
   └─ INSERT INTO user_instruments (link)

✅ Tout sauvegardé dans Supabase
```

---

## 📝 Code JavaScript

### `supabaseInstruments.js`

**Fonctions principales:**

```javascript
// Charger les instruments standards
await InstrumentsManager.loadStandardInstruments()
// → Retourne array d'instruments depuis Supabase

// Afficher dans le formulaire
await InstrumentsManager.displayInstruments()
// → Crée les checkboxes

// Ajouter un instrument custom
InstrumentsManager.addCustomInstrumentTemporary(name)
// → Ajoute temporairement (avant save)

// Obtenir la sélection complète
InstrumentsManager.getSelectedInstruments()
// → Retourne [{name, isCustom}, ...]

// Sauvegarder dans Supabase
await InstrumentsManager.saveUserInstruments(userName, instruments)
// → Crée les rows dans Supabase

// Réinitialiser après enregistrement
InstrumentsManager.reset()
// → Vide les customs, déselectionne tout
```

### Modifications dans `ui.js`

```javascript
// Dans register():
const selectedInstruments = InstrumentsManager.getSelectedInstruments();
await InstrumentsManager.saveUserInstruments(name, selectedInstruments);
InstrumentsManager.reset();
```

---

## 🎯 Exemple d'utilisation

### User 1: Alice (instruments standard + custom)

1. Crée compte "Alice"
2. Sélectionne: Violon, Piano
3. Ajoute custom: "Saxophone"
4. Clique "Créer compte"

**Supabase après:**

`instruments` table:
```
id | name | is_custom | created_by
---+------+-----------+----------
1  | Violon | false
2  | Piano | false
...
11 | Saxophone | true | Alice
```

`user_instruments` table:
```
user_id | instrument_id
--------+---------------
alice_id | 1 (Violon)
alice_id | 2 (Piano)
alice_id | 11 (Saxophone)
```

### User 2: Bob (instruments standard uniquement)

1. Crée compte "Bob"
2. Sélectionne: Guitare Elec, Batterie
3. Aucun custom
4. Clique "Créer compte"

**Supabase après:**

`user_instruments` table:
```
user_id | instrument_id
--------+---------------
bob_id  | 4 (Guitare Elec)
bob_id  | 8 (Batterie)
```

---

## 📊 Console Logs (pour déboguer)

Ouvre F12 → Console

**Au démarrage:**
```
🎵 Initializing InstrumentsManager...
📥 Loading standard instruments from Supabase...
✅ Loaded 10 standard instruments
   - Batterie
   - Flute
   - Guitare Elec
   ...
🎨 Displaying instruments in form...
✅ Instruments displayed
✅ InstrumentsManager ready
```

**Lors de l'ajout d'un custom:**
```
✅ Custom instrument added: Saxophone
🎯 Displaying 1 custom instruments
```

**Lors du register:**
```
📝 Starting registration...
📋 Selected 3 instruments:
   - Violon
   - Piano
   - Saxophone (custom)
💾 Saving 3 instruments for user: Alice
   Creating custom instrument: Saxophone
   ✅ Linked custom instrument: Saxophone
   ✅ Linked standard instrument: Violon
   ✅ Linked standard instrument: Piano
✅ All instruments saved for user: Alice
```

---

## ⚠️ Troubleshooting

### Les instruments ne chargent pas

**Symptôme:** Grille vide, pas de checkboxes

**Solutions:**
1. Ouvre F12 → Console
2. Cherche `❌ Error loading instruments:`
3. Si tu vois un erreur Supabase:
   - Vérifie que la table `instruments` existe
   - Vérifie que RLS est correctement configuré
   - Exécute le SQL à nouveau

### Erreur "relation already exists"

**Cause:** La table `instruments` existe déjà

**Fix:** Utilise la version SQL corrigée avec `CREATE TABLE IF NOT EXISTS`

### Custom instruments ne sauvegardent pas

**Symptôme:** Tu ajoutes "Saxophone", tu crées le compte, mais rien dans Supabase

**Solutions:**
1. Ouvre F12 → Console
2. Cherche les logs de `saveUserInstruments`
3. Vérifie que Supabase est correctement configuré dans `supabaseConfig.js`

### Le formulaire freeze lors du save

**Cause:** Appel Supabase en cours

**Normal:** C'est juste un peu lent (1-2 sec)

---

## ✨ Avantages

| Avant | Après |
|-------|-------|
| Instruments en dur (HTML) | Instruments dynamiques (Supabase) |
| Pas de custom | Instruments custom possibles |
| Pas de persistance | Sauvegardés pour toujours |
| Modification = changement code | Modification = changement BDD |

---

## 🚀 Prochaines étapes optionnelles

1. **Afficher les instruments de l'utilisateur après login**
   ```javascript
   const userInstruments = await InstrumentsManager.loadUserInstruments(userName);
   // Afficher dans le header
   ```

2. **Supprimer un instrument custom**
   ```javascript
   // Ajouter un bouton "Gestion des instruments"
   // Permettre de supprimer ses instruments custom
   ```

3. **Éditer les instruments après enregistrement**
   - Créer un formulaire de modification
   - Ajouter/retirer des instruments après la création du compte

4. **Analytics**
   - Quels instruments sont les plus populaires?
   - Combien de users ont des instruments custom?

---

## 📚 Fichiers concernés

| Fichier | Changement |
|---------|-----------|
| **index.html** | Form modifié + supabaseInstruments.js ajouté |
| **supabaseInstruments.js** | **NOUVEAU** - Gestion des instruments |
| **ui.js** | register() modifié pour sauvegarder |
| **styles.css** | CSS pour custom instruments section |
| **SUPABASE_INSTRUMENTS_SQL.md** | **NOUVEAU** - SQL à exécuter |

---

C'est bon! 🎵
