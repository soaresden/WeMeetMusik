# Implémentation Emoji + Couleurs - WeMeetMusik

## ✅ Changements Effectués

### 1. **Nouvelle Page: Customization**
- Apparaît APRÈS avoir choisi un utilisateur (nouveau ou existant)
- Input emoji (texte, max 2 caractères)
- 2 Color pickers (roue chromatique HTML5)
- Preview en live des couleurs appliquées
- Bouton "Continuer" pour passer à la vérif des instruments

### 2. **Refactorisation UI Flow**

#### Avant:
```
Login → Register (avec emoji/couleurs) → Instruments → App
```

#### Après:
```
Login → Select User ──┐
                      └─→ Customization (emoji + couleurs) ──→ Instruments ──→ App
```

### 3. **Sauvegarde Supabase**
Les colonnes doivent être ajoutées à la table `users`:
- `emoji` (TEXT, default: '🎵')
- `color_primary` (TEXT, default: '#ff4758')
- `color_secondary` (TEXT, default: '#f8f9fa')

### 4. **Application des Couleurs**
Les couleurs s'appliquent quand l'utilisateur entre dans l'app:
- Couleur primaire: boutons, accents, bordures
- Couleur secondaire: fond, en-têtes

## 📝 Flux Détaillé

### Nouvel Utilisateur:
1. Page Login
2. Saisis nom + instruments
3. Clique "Valider"
4. → Customization (emoji + couleurs par défaut)
5. Modifie si souhaite
6. Clique "Continuer"
7. → Vérification instruments
8. → App avec couleurs appliquées

### Utilisateur Existant:
1. Page Login avec tuiles (👤 name)
2. Clique sur sa tuile
3. → Customization (charge ses couleurs actuelles)
4. Peut modifier
5. Clique "Continuer"
6. → Vérification instruments
7. → App avec couleurs appliquées

## 🎨 Customization Preview

Le preview montre:
- Header avec couleur secondaire
- Tile utilisateur avec couleur primaire
- Bouton "Déconnexion" avec couleur primaire
- Mise à jour en temps réel

## 📦 Fichiers Modifiés

- `index.html` - Nouvelle page `customizationPage`
- `ui.js` - Functions: `showCustomizationPage()`, `saveCustomization()`, `updateCustomizationPreview()`
- `styles.css` - Styles pour `.verification-modal` (réutilisé)

## ⚙️ Installation

1. Créer colonnes dans Supabase (voir SUPABASE_MIGRATION_COLORS.sql)
2. Recharger l'app
3. Tester: nouvel user → doit afficher page customization

## 🐛 Dépannage

### "column users.emoji does not exist"
→ Exécute le SQL migration dans Supabase

### Couleurs ne s'appliquent pas
→ Vérifie que `applyUserColors()` est appelé dans `enterApp()`
→ Vérifie que les variables CSS `--primary` et `--bg-light` sont définies

### Preview ne s'affiche pas
→ Vérifie que `customizationPage` est dans le DOM
→ Vérifie que les event listeners sont bien attachés
