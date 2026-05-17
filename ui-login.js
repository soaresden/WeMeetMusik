/**
 * Gestion du Login et Registration
 */

const UILogin = {
    /**
     * Charger les utilisateurs existants
     */
    async populateUserSelect() {
        const container = document.getElementById('usersList');

        try {
            const { data: users, error } = await supabase
                .from('users')
                .select('id, name, emoji, color_primary, color_secondary');

            if (error) throw error;

            container.innerHTML = '';

            if (users && users.length > 0) {
                for (const user of users) {
                    const tile = document.createElement('div');
                    tile.className = 'user-tile';

                    const emoji = user.emoji || '🎵';
                    const colorPrimary = user.color_primary || '#ff4758';
                    const colorSecondary = user.color_secondary || '#f8f9fa';

                    // Charger les instruments de l'utilisateur
                    const instruments = await SupabaseData.getUserInstruments(user.id);
                    const instrumentsText = instruments.length > 0 ? `(${instruments.join(', ')})` : '';

                    tile.innerHTML = `
                        <div class="user-tile-icon">${emoji}</div>
                        <div class="user-tile-name">${user.name}</div>
                        ${instrumentsText ? `<div class="user-tile-instruments">${instrumentsText}</div>` : ''}
                    `;

                    // Appliquer les couleurs de l'utilisateur
                    tile.style.borderColor = colorPrimary;
                    tile.style.color = colorPrimary;
                    tile.style.background = colorSecondary;

                    tile.addEventListener('click', () => {
                        UI.currentUserId = user.id;
                        UI.currentUserName = user.name;
                        UI.currentUserEmoji = emoji;
                        UI.currentUserColorPrimary = colorPrimary;
                        UI.currentUserColorSecondary = colorSecondary;
                        document.getElementById('customizationOverlay').classList.add('active');
                        UICustomization.showCustomizationPage();
                    });

                    container.appendChild(tile);
                }
            }
        } catch (error) {
            console.error('❌ Error loading users:', error);
        }
    },

    /**
     * Afficher les instruments disponibles (registration)
     */
    populateAvailableInstruments() {
        const container = document.getElementById('availableInstrumentsGrid');

        if (!container) return;

        container.innerHTML = UI.availableInstruments
            .map(instrument => `
                <button class="instrument-btn" onclick="UILogin.toggleInstrument('${instrument}')" data-instrument="${instrument}">
                    ${instrument}
                </button>
            `)
            .join('');

        this.updateAvailableInstrumentsUI();
    },

    /**
     * Basculer la sélection d'un instrument (registration)
     */
    toggleInstrument(instrument) {
        if (UI.newUserInstruments.includes(instrument)) {
            UI.newUserInstruments = UI.newUserInstruments.filter(i => i !== instrument);
        } else {
            UI.newUserInstruments.push(instrument);
        }

        this.updateAvailableInstrumentsUI();
    },

    /**
     * Mettre à jour l'UI des instruments (registration)
     */
    updateAvailableInstrumentsUI() {
        const buttons = document.querySelectorAll('.instrument-btn');
        buttons.forEach(btn => {
            const instrument = btn.getAttribute('data-instrument');
            if (UI.newUserInstruments.includes(instrument)) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    },

    /**
     * Enregistrer un nouvel utilisateur
     */
    async registerNewUser() {
        const username = document.getElementById('newUsername').value.trim();

        if (!username) {
            alert('Saisis ton nom');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('users')
                .insert([{ name: username }])
                .select();

            if (error) throw error;

            const newUserId = data[0].id;


            // Nettoyer l'état
            UI.newUserInstruments = [];
            document.getElementById('newUsername').value = '';
            this.updateAvailableInstrumentsUI();

            // Recharger les utilisateurs
            await this.populateUserSelect();

            // Configurer le nouvel utilisateur comme utilisateur courant
            UI.currentUserId = newUserId;
            UI.currentUserName = username;
            UI.currentUserEmoji = '🎵';
            UI.currentUserColorPrimary = '#ff4758';
            UI.currentUserColorSecondary = '#f8f9fa';

            // Afficher l'overlay de customization (MÊME overlay que pour les utilisateurs existants)
            document.getElementById('loginPage').classList.remove('active');
            document.getElementById('customizationOverlay').classList.add('active');

            // Initialiser avec l'overlay de customization
            await UICustomization.showCustomizationPage();
            console.log('🎨 Showing customization overlay for new user');
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    },

    /**
     * Afficher et initialiser la page de vérification des instruments
     */
    async showInstrumentsVerificationPage() {
        console.log('📋 Initializing instruments verification page');

        // Initialiser la liste des instruments sélectionnés
        this.verificationSelectedInstruments = [];

        // Afficher les instruments sélectionnés (vide pour nouvel utilisateur)
        this.updateVerificationDisplay();

        // Charger et afficher les instruments disponibles
        const availableInstruments = UI.availableInstruments;
        const verificationGrid = document.getElementById('verificationAvailableInstrumentsGrid');

        if (!verificationGrid) {
            console.error('❌ Verification grid not found in DOM');
            return;
        }

        if (availableInstruments.length === 0) {
            console.warn('⚠️ No available instruments found');
            verificationGrid.innerHTML = '<p style="color: #999;">Aucun instrument disponible</p>';
        } else {
            verificationGrid.innerHTML = availableInstruments
                .map(instrument => `
                    <button class="instrument-btn" onclick="UILogin.toggleVerificationInstrument('${instrument}')" data-instrument="${instrument}">
                        ${instrument}
                    </button>
                `)
                .join('');
        }

        // Event listeners
        const continueBtn = document.getElementById('continueBtn');
        if (continueBtn) {
            continueBtn.onclick = async () => {
                console.log('✅ Continue button clicked');
                // Sauvegarder les instruments sélectionnés
                if (this.verificationSelectedInstruments.length > 0) {
                    try {
                        const instrumentsToInsert = this.verificationSelectedInstruments.map(inst => ({
                            user_id: UI.currentUserId,
                            instrument: inst
                        }));

                        const { error } = await supabase
                            .from('user_instruments')
                            .insert(instrumentsToInsert);

                        if (error) throw error;
                    } catch (error) {
                        console.error('❌ Error saving instruments:', error);
                        alert('Erreur: ' + error.message);
                        return;
                    }
                } else {
                }

                // Fermer la page de vérification
                document.getElementById('instrumentsVerificationPage').classList.remove('active');

                // Montrer la page de customization pour customiser emoji et couleurs
                document.getElementById('customizationOverlay').classList.add('active');
                await UICustomization.showCustomizationPage();
            };
        } else {
            console.error('❌ Continue button not found');
        }

        const closeBtn = document.getElementById('closeVerificationBtn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                document.getElementById('instrumentsVerificationPage').classList.remove('active');
                document.getElementById('loginPage').classList.add('active');
                // Reload user list to show newly created user
                UILogin.populateUserSelect();
            };
        } else {
            console.error('❌ Close button not found');
        }
    },

    /**
     * Mettre à jour l'affichage des instruments sélectionnés
     */
    updateVerificationDisplay() {
        const userInstrumentsDisplay = document.getElementById('userInstrumentsDisplay');

        if (!this.verificationSelectedInstruments || this.verificationSelectedInstruments.length === 0) {
            userInstrumentsDisplay.innerHTML = '<p style="color: #999; font-size: 0.9em;">Aucun instrument sélectionné</p>';
        } else {
            userInstrumentsDisplay.innerHTML = this.verificationSelectedInstruments
                .map(inst => `<div class="instrument-badge">${inst}</div>`)
                .join('');
        }
    },

    /**
     * Basculer instrument dans la page de vérification
     */
    toggleVerificationInstrument(instrument) {
        const btn = document.querySelector(`[data-instrument="${instrument}"]`);

        if (this.verificationSelectedInstruments.includes(instrument)) {
            this.verificationSelectedInstruments = this.verificationSelectedInstruments.filter(i => i !== instrument);
            btn?.classList.remove('selected');
        } else {
            this.verificationSelectedInstruments.push(instrument);
            btn?.classList.add('selected');
        }

        this.updateVerificationDisplay();
    }
};

console.log('🎵 UILogin module loaded');
