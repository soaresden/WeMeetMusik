# ✨ Version SIMPLIFIÉE - Pas de Mail, Vignettes

## 🎯 Ce qui change

### ❌ Avant (Compliqué)
- Combobox `<select>` pour choisir l'utilisateur
- Table `auth.users` avec mail (complexe)
- Instruments en dur dans le HTML

### ✅ Après (Simple)
- **Vignettes cliquables** avec le nom de l'utilisateur
- **Table `users` simple** avec juste le nom
- **Instruments depuis Supabase** (pas de mail)

---

## 🗄️ SQL SIMPLIFIÉ

C'est maintenant **ultra simple**:

```sql
-- Table users - juste le nom!
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table instruments (100% pareil)
CREATE TABLE IF NOT EXISTS instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_custom BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison (100% pareil)
CREATE TABLE IF NOT EXISTS user_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, instrument_id)
);

-- Insérer les 10 instruments
INSERT INTO instruments (name, is_custom) VALUES
  ('Violon', FALSE),
  ('Piano', FALSE),
  ('Guitare Seche', FALSE),
  ('Guitare Elec', FALSE),
  ('Basse Seche', FALSE),
  ('Basse Elect', FALSE),
  ('Percu', FALSE),
  ('Batterie', FALSE),
  ('Flute', FALSE),
  ('Harmonica', FALSE)
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_instruments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_access" ON users FOR ALL USING (true);
CREATE POLICY "all_access" ON instruments FOR ALL USING (true);
CREATE POLICY "all_access" ON user_instruments FOR ALL USING (true);
```

---

## 🎨 Interface - Vignettes au lieu de combobox

### Avant
```html
<select id="userSelect">
  <option>-- Sélectionne toi --</option>
  <option>Denis (5 fichiers)</option>
  <option>Li (2 fichiers)</option>
</select>
<button id="loginBtn">Se connecter</button>
```

### Après
```html
<div id="usersList" class="users-tiles">
  <!-- Vignettes cliquables -->
  <div class="user-tile">
    <div class="user-tile-icon">👤</div>
    <div class="user-tile-name">Denis</div>
    <div class="user-tile-count">5 fichiers</div>
  </div>
  <div class="user-tile">
    <div class="user-tile-icon">👤</div>
    <div class="user-tile-name">Li</div>
    <div class="user-tile-count">2 fichiers</div>
  </div>
</div>
```

**Les vignettes sont cliquables** - pas besoin de bouton "Se connecter"!

---

## 💻 Changements du code

### `index.html`
```diff
- <select id="userSelect">
-   <option value="">-- Sélectionne toi --</option>
- </select>
- <button id="loginBtn" class="btn-primary">Se connecter</button>

+ <div id="usersList" class="users-tiles">
+   <!-- Rempli dynamiquement -->
+ </div>
```

### `ui.js` - `populateUserSelect()`
```javascript
// Avant: Créait des <option>
// Après: Crée des vignettes cliquables

const tile = document.createElement('div');
tile.className = 'user-tile';
tile.innerHTML = `
    <div class="user-tile-icon">👤</div>
    <div class="user-tile-name">${user.name}</div>
    <div class="user-tile-count">${user.fileCount} fichiers</div>
`;

tile.addEventListener('click', () => {
    this.currentUserName = user.name;
    this.login();
});
```

### `ui.js` - `login()`
```javascript
// Avant: Lisait la value du select
const userName = document.getElementById('userSelect').value;

// Après: Utilise this.currentUserName (défini par le click)
const userName = this.currentUserName;
```

### `styles.css` - Nouvelles classes
```css
.users-tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
}

.user-tile {
    padding: 20px;
    background: rgba(255, 51, 51, 0.1);
    border: 2px solid rgba(255, 51, 51, 0.2);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s;
}

.user-tile:hover {
    background: rgba(255, 51, 51, 0.2);
    border-color: #ff3333;
    transform: translateY(-4px);
}
```

### `supabaseInstruments.js`
```javascript
// Avant: Référence à auth.users
.from('users')
.insert([{ name: userName }])
.select();

// Après: Exactement pareil! (la table users est simple)
// Pas de changement! On utilise juste la table users
```

---

## 🚀 Utilisation

1. **Exécute le SQL simplifié** dans Supabase
2. **Rafraîchis la page** (F5)
3. **Tu vois les vignettes** avec les noms des users
4. **Clique sur une vignette** = Login automatique
5. **Les partitions chargent** depuis MEGA

---

## ✨ Avantages

| Aspect | Avant | Après |
|--------|-------|-------|
| Interface | Combobox + bouton | Vignettes cliquables |
| Table users | Avec mail, complexe | Juste le nom |
| SQL | Complicé | Ultra simple |
| UX | 2 clics | 1 clic |
| Persistance | Variables | Supabase |

---

## 📝 Résumé des fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| **index.html** | Select → div#usersList |
| **ui.js** | populateUserSelect() crée des tiles |
| **styles.css** | + CSS pour .users-tiles |
| **supabaseInstruments.js** | Gère la table `users` simple |

---

## 🎯 C'est bon!

- ❌ Plus de combobox
- ❌ Plus de mail dans la BDD
- ✅ Vignettes cliquables
- ✅ Juste un prénom (name)
- ✅ SQL simple
- ✅ Instruments depuis Supabase

Parfait! 🎵
