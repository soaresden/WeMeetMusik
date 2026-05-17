/**
 * WeMeetMusik - Gestion collaborative des partitions musicales
 * Nouvelle version: Dossier MEGA partagé, pas de credentials
 */

const App = {
    version: '2.0.0',

    async init() {
        console.log('🎵 WeMeetMusik v2.0.0 - Initializing...');

        // Initialiser les données
        DataManager.init();
        console.log('✅ DataManager initialized');

        // Initialiser la page de login
        UI.initLoginPage();
        console.log('✅ Login page initialized');

        // Vérifier l'accès au dossier MEGA partagé
        const hasAccess = await MegaPublicHelper.checkFolderAccess();
        if (hasAccess) {
            console.log('✅ MEGA shared folder accessible');
        } else {
            console.warn('⚠️  MEGA shared folder not accessible');
            alert('⚠️  Attention: Le dossier MEGA partagé n\'est pas accessible. Vérifiez la connexion.');
        }

        console.log('✅ WeMeetMusik ready!');
    }
};

// Démarrer l'application
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

console.log('🎵 WeMeetMusik App loaded');
