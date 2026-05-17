# ⚡ Setup rapide - Instruments Supabase

## 🎯 Ce qui change

✅ **Avant:** Instruments en dur dans le HTML
✅ **Après:** Instruments depuis Supabase + instruments custom

---

## 🚀 Étapes rapides

### 1️⃣ Exécute le SQL

**Fichier:** `SUPABASE_INSTRUMENTS_SQL.md`

```
1. Va sur Supabase
2. Clique SQL Editor
3. Clique "+ New Query"
4. Copie le SQL complet de SUPABASE_INSTRUMENTS_SQL.md
5. Clique "Run"
```

**Si tu vois une erreur "relation users already exists":**
- C'est normal! Utilise le SQL avec `CREATE TABLE IF NOT EXISTS`

### 2️⃣ Vérifie dans Supabase

```
Data Editor → instruments
Tu devrais voir 10 instruments:
- Violon
- Piano
- Guitare Seche
- etc.
```

### 3️⃣ Rafraîchis l'app

```
Appuie sur F5 dans le navigateur
```

### 4️⃣ Regarde la console

```
F12 → Console
Tu devrais voir:
✅ Loaded 10 standard instruments
✅ InstrumentsManager ready
```

### 5️⃣ Teste le formulaire

```
1. Nouvelle section "Instrument custom:" en bas du formulaire
2. Champ texte + bouton "+ Ajouter"
3. Les instruments custom s'affichent en badges rouges
4. Clique ✕ pour retirer
```

### 6️⃣ Crée un compte test

```
1. Entre un nom
2. Sélectionne des instruments
3. Ajoute un custom (ex: "Saxophone")
4. Clique "Créer compte"
5. Dans la console, tu devrais voir:
   💾 Saving 3 instruments for user...
   ✅ All instruments saved for user:
```

---

## 📝 SQL rapide

Si tu veux juste le SQL minimal:

```sql
-- 1. Créer la table des instruments
CREATE TABLE IF NOT EXISTS instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_custom BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Créer la table de liaison
CREATE TABLE IF NOT EXISTS user_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, instrument_id)
);

-- 3. Insérer les instruments
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

-- 4. Activer RLS et policies
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_instruments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "instruments_all" ON instruments FOR ALL USING (true);
CREATE POLICY "user_instr_all" ON user_instruments FOR ALL USING (true);
```

---

## 📂 Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| ✅ **index.html** | Formulaire modifié + script ajouté |
| ✨ **supabaseInstruments.js** | NOUVEAU - Gestion instruments |
| ✅ **ui.js** | register() modifié |
| ✅ **styles.css** | CSS pour custom instruments |

---

## ✨ Fonctionnalités

- ✅ Instruments standards chargés depuis Supabase
- ✅ Ajout d'instruments custom libre
- ✅ Sauvegarde dans Supabase (table user_instruments)
- ✅ Logs détaillés dans la console
- ✅ Gestion des erreurs Supabase

---

## 🎯 Résultat final

**Au démarrage:**
- Instruments standards affichés depuis Supabase ✅
- Champ pour ajouter des instruments custom ✅

**Lors de l'enregistrement:**
- Instruments standards ET custom sauvegardés ✅
- Liens créés dans `user_instruments` ✅
- Instruments custom ajoutés à la table `instruments` ✅

---

## 🔧 Si quelque chose ne marche pas

1. **Ouvre la console (F12)**
2. **Cherche les erreurs**
3. **Vérifie que Supabase est en ligne**
4. **Lis les logs de InstrumentsManager**

Tout est loggé dans la console! 🎯

---

C'est bon ! 🚀
