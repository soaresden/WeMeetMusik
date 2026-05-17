# Setup Couleurs et Emoji pour WeMeetMusik

## 1. Ajouter les colonnes à Supabase

Va dans **Supabase Dashboard** → **SQL Editor** et exécute ceci:

```sql
ALTER TABLE "users" ADD COLUMN "emoji" TEXT DEFAULT '🎵';
ALTER TABLE "users" ADD COLUMN "color_primary" TEXT DEFAULT '#ff4758';
ALTER TABLE "users" ADD COLUMN "color_secondary" TEXT DEFAULT '#f8f9fa';
```

## 2. Nouvelle UI Flow

### Pour un nouvel utilisateur:
1. Saisis ton nom
2. Choisis tes instruments
3. Clique "Valider"
4. **Apparaît**: Page de customization (emoji + 2 couleurs)
5. Choisis ton emoji et tes couleurs avec preview en live
6. Clique "Continuer"
7. Vérification des instruments
8. Entre dans l'app (couleurs appliquées)

### Pour un utilisateur existant:
1. Clique sur sa tuile
2. **Apparaît**: Page de customization avec ses couleurs actuelles
3. Peut modifier emoji et couleurs
4. Clique "Continuer"
5. Vérification des instruments
6. Entre dans l'app (couleurs appliquées)

## 3. Caractéristiques

✅ Color picker avec roue chromatique (HTML5 native)
✅ Preview en live des couleurs sur l'interface
✅ Les couleurs s'appliquent dans l'app en temps réel
✅ Sauvegarde dans Supabase
✅ Réinitialisation au logout

## 4. Personnalisation

Les utilisateurs peuvent changer leurs couleurs et emoji à tout moment:
- Les nouvelles couleurs s'appliquent immédiatement après "Continuer"
- Pas besoin de re-login
