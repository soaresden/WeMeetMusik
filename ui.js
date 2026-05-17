/**
 * WeMeetMusik UI v3 - Main Object
 * Objet UI principal et initialisation
 */

const UI = {
    // User state
    currentUserId: null,
    currentUserName: null,
    currentUserEmoji: null,
    currentUserColorPrimary: null,
    currentUserColorSecondary: null,

    // Data
    newUserInstruments: [],
    availableInstruments: [],
    customizationInstruments: [],

    /**
     * Initialiser la page de login
     */
    async initLoginPage() {
        console.log('🚀 Initializing login...');

        // Charger les instruments
        this.availableInstruments = await SupabaseData.getAllAvailableInstruments();
        console.log('📋 Available instruments loaded:', this.availableInstruments);

        // Initialiser la page de login
        await UILogin.populateUserSelect();

        // Events
        document.getElementById('registerBtn').addEventListener('click', () => UILogin.registerNewUser());
        document.getElementById('newUsername').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') UILogin.registerNewUser();
        });
    }
};

console.log('🎵 UI module loaded');
