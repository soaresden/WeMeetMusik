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

            // Ajouter les instruments
            if (UI.newUserInstruments.length > 0) {
                // D'abord, ajouter à la table instruments (master list)
                for (const inst of UI.newUserInstruments) {
                    const { data: existing } = await supabase
                        .from('instruments')
                        .select('name')
                        .eq('name', inst);

                    if (!existing || existing.length === 0) {
                        const { error: instrumentError } = await supabase
                            .from('instruments')
                            .insert([{ name: inst }]);

                        if (instrumentError) {
                            console.warn(`⚠️ Could not add ${inst} to instruments table:`, instrumentError.message);
                            // Continuer quand même
                        }
                    }
                }

                // Ensuite, ajouter à user_instruments
                const instrumentsToInsert = UI.newUserInstruments.map(inst => ({
                    user_id: newUserId,
                    instrument: inst
                }));

                const { error: instError } = await supabase
                    .from('user_instruments')
                    .insert(instrumentsToInsert);

                if (instError) throw instError;
            }

            console.log(`✅ User registered: ${username}`);

            // Nettoyer
            UI.newUserInstruments = [];
            document.getElementById('newUsername').value = '';
            this.updateAvailableInstrumentsUI();

            // Recharger les utilisateurs
            await this.populateUserSelect();

            // Login automatiquement et afficher customization
            UI.currentUserId = newUserId;
            UI.currentUserName = username;
            UICustomization.showCustomizationPage();
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    }
};

console.log('🎵 UILogin module loaded');
