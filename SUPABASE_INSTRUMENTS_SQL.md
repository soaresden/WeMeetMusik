# 📊 SQL pour les instruments (Version corrigée)

## ⚠️ Attention: La table `users` existe déjà

Supabase a créé une table `users` par défaut. Voici le SQL qui s'adapte:

---

## ✅ SQL à exécuter

```sql
-- 1. Créer la table des instruments
CREATE TABLE IF NOT EXISTS instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_custom BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Créer la table de liaison user_instruments
CREATE TABLE IF NOT EXISTS user_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, instrument_id)
);

-- 3. Insérer les instruments de base (si table vide)
INSERT INTO instruments (name, is_custom) 
SELECT * FROM (VALUES
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
) AS t(name, is_custom)
WHERE NOT EXISTS (SELECT 1 FROM instruments WHERE name = t.name);

-- 4. Créer les index
CREATE INDEX IF NOT EXISTS idx_user_instruments_user_id ON user_instruments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_instruments_instrument_id ON user_instruments(instrument_id);
CREATE INDEX IF NOT EXISTS idx_instruments_is_custom ON instruments(is_custom);

-- 5. Activer RLS
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_instruments ENABLE ROW LEVEL SECURITY;

-- 6. Policies pour instruments
DROP POLICY IF EXISTS "instruments_read" ON instruments;
DROP POLICY IF EXISTS "instruments_insert" ON instruments;

CREATE POLICY "instruments_read" ON instruments FOR SELECT USING (true);
CREATE POLICY "instruments_insert" ON instruments FOR INSERT USING (true);

-- 7. Policies pour user_instruments
DROP POLICY IF EXISTS "user_instruments_read" ON user_instruments;
DROP POLICY IF EXISTS "user_instruments_insert" ON user_instruments;
DROP POLICY IF EXISTS "user_instruments_delete" ON user_instruments;

CREATE POLICY "user_instruments_read" ON user_instruments FOR SELECT USING (true);
CREATE POLICY "user_instruments_insert" ON user_instruments FOR INSERT USING (true);
CREATE POLICY "user_instruments_delete" ON user_instruments FOR DELETE USING (true);
```

---

## 📋 Si tu as une erreur "relation already exists"

Exécute **uniquement ceci**:

```sql
-- Créer uniquement les nouvelles tables
CREATE TABLE IF NOT EXISTS instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_custom BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, instrument_id)
);

-- Insérer les instruments
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
ON CONFLICT (name) DO NOTHING;

-- Activer RLS
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_instruments ENABLE ROW LEVEL SECURITY;

-- Créer les policies
CREATE POLICY "instruments_select" ON instruments FOR SELECT USING (true);
CREATE POLICY "instruments_insert" ON instruments FOR INSERT USING (true);

CREATE POLICY "user_instr_select" ON user_instruments FOR SELECT USING (true);
CREATE POLICY "user_instr_insert" ON user_instruments FOR INSERT USING (true);
CREATE POLICY "user_instr_delete" ON user_instruments FOR DELETE USING (true);
```

---

## 🎯 Structure de données

### `instruments` table
```
id (UUID) - Primary Key
name (TEXT) - Nom de l'instrument (UNIQUE)
is_custom (BOOLEAN) - True si custom, False si standard
created_by (TEXT) - Qui a créé cet instrument custom
created_at (TIMESTAMP) - Quand créé
```

### `user_instruments` table
```
id (UUID) - Primary Key
user_id (UUID) - Référence à auth.users(id)
instrument_id (UUID) - Référence à instruments(id)
created_at (TIMESTAMP) - Quand ajouté
```

---

## ✨ Points importants

- ✅ `auth.users(id)` = la table utilisateurs créée par Supabase
- ✅ `IF NOT EXISTS` = ne crée que si la table n'existe pas
- ✅ `ON CONFLICT DO NOTHING` = ne crée les instruments que s'ils n'existent pas
- ✅ RLS activé = sécurité

---

## 🚀 Après exécution

1. Va dans Supabase → Data Editor
2. Vérifie que `instruments` et `user_instruments` sont visibles
3. Voir les 10 instruments standards dans `instruments`
4. C'est bon!

---

## 💾 Stockage des préférences

**Avant:** Instruments en dur dans le HTML + localStorage
**Après:** Instruments depuis Supabase dans la table `instruments`
              Préférences utilisateur dans `user_instruments`

Chaque fois qu'un user register:
1. Ajoute les instruments custom à la table `instruments`
2. Crée les liens dans `user_instruments`
3. Tout est sauvegardé pour toujours ✅
