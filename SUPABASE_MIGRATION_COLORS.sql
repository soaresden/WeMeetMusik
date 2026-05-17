-- Ajouter les colonnes emoji et couleurs à la table users
-- Exécute ceci dans le SQL Editor de Supabase

ALTER TABLE "users" ADD COLUMN "emoji" TEXT DEFAULT '🎵';
ALTER TABLE "users" ADD COLUMN "color_primary" TEXT DEFAULT '#ff4758';
ALTER TABLE "users" ADD COLUMN "color_secondary" TEXT DEFAULT '#f8f9fa';

-- Vérifier que les colonnes ont été créées
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users';
