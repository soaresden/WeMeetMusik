/**
 * WeMeetMusik v3 - Application Entry Point
 */

const App = {
    version: '3.0.0',

    async init() {
        console.log('🎵 WeMeetMusik v3.0.0 - Initializing...');
        console.log('📊 Using Supabase only');

        // Initialiser la page de login
        UI.initLoginPage();

        console.log('✅ WeMeetMusik ready!');
    }
};

// Démarrer
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

console.log('🎵 App loaded');
