/**
 * Gestion des instruments via Supabase
 * Les instruments sont stockés dans la base de données
 * et peuvent être personnalisés par les utilisateurs
 */

const InstrumentsManager = {
    standardInstruments: [],
    customInstruments: [],

    /**
     * Charger les instruments standards depuis Supabase
     */
    async loadStandardInstruments() {
        try {
            console.log('📥 Loading standard instruments from Supabase...');

            const { data, error } = await supabase
                .from('instruments')
                .select('id, name')
                .eq('is_custom', false)
                .order('name', { ascending: true });

            if (error) throw error;

            this.standardInstruments = data || [];
            console.log(`✅ Loaded ${this.standardInstruments.length} standard instruments`);
            this.standardInstruments.forEach(inst => console.log(`   - ${inst.name}`));

            return this.standardInstruments;
        } catch (error) {
            console.error('❌ Error loading instruments:', error);
            console.warn('   Using fallback instruments list');
            // Fallback si Supabase ne marche pas
            this.standardInstruments = [
                { id: '1', name: 'Violon' },
                { id: '2', name: 'Piano' },
                { id: '3', name: 'Guitare Seche' },
                { id: '4', name: 'Guitare Elec' },
                { id: '5', name: 'Basse Seche' },
                { id: '6', name: 'Basse Elect' },
                { id: '7', name: 'Percu' },
                { id: '8', name: 'Batterie' },
                { id: '9', name: 'Flute' },
                { id: '10', name: 'Harmonica' }
            ];
            return this.standardInstruments;
        }
    },

    /**
     * Afficher les instruments dans le formulaire
     */
    async displayInstruments() {
        console.log('🎨 Displaying instruments in form...');
        const grid = document.getElementById('instrumentsGrid');

        if (!grid) {
            console.error('❌ instrumentsGrid not found');
            return;
        }

        await this.loadStandardInstruments();

        grid.innerHTML = '';
        this.standardInstruments.forEach(instrument => {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" value="${instrument.name}" data-instrument-id="${instrument.id}"> ${instrument.name}`;
            grid.appendChild(label);
        });

        console.log('✅ Instruments displayed');
    },

    /**
     * Ajouter un instrument custom temporairement (avant save)
     */
    addCustomInstrumentTemporary(name) {
        if (!name || name.trim() === '') {
            console.log('❌ Empty instrument name');
            alert('Entre le nom de l\'instrument');
            return false;
        }

        const trimmedName = name.trim();

        // Vérifier si déjà dans la liste
        if (this.customInstruments.some(i => i.name.toLowerCase() === trimmedName.toLowerCase())) {
            console.log(`⚠️  Instrument "${trimmedName}" déjà ajouté`);
            alert('Cet instrument est déjà dans la liste');
            return false;
        }

        const customInstr = {
            id: 'custom_' + Date.now(),
            name: trimmedName,
            isCustom: true
        };

        this.customInstruments.push(customInstr);
        console.log(`✅ Custom instrument added: ${trimmedName}`);
        this.displayCustomInstruments();

        return true;
    },

    /**
     * Afficher les instruments custom dans le formulaire
     */
    displayCustomInstruments() {
        console.log(`🎯 Displaying ${this.customInstruments.length} custom instruments`);
        const customList = document.getElementById('customInstrumentsList');

        if (!customList) return;

        customList.innerHTML = '';
        this.customInstruments.forEach(instrument => {
            const badge = document.createElement('div');
            badge.className = 'custom-instrument-badge';
            badge.innerHTML = `
                <span>${instrument.name}</span>
                <button type="button" class="btn-remove" onclick="InstrumentsManager.removeCustomInstrument('${instrument.id}')">✕</button>
            `;
            customList.appendChild(badge);
        });
    },

    /**
     * Retirer un instrument custom
     */
    removeCustomInstrument(id) {
        console.log(`🗑️  Removing custom instrument: ${id}`);
        this.customInstruments = this.customInstruments.filter(i => i.id !== id);
        this.displayCustomInstruments();
    },

    /**
     * Obtenir tous les instruments sélectionnés (standard + custom)
     */
    getSelectedInstruments() {
        const checked = document.querySelectorAll('.instruments-grid input[type="checkbox"]:checked');
        const standardSelected = Array.from(checked).map(cb => ({ name: cb.value, isCustom: false }));
        const allSelected = [...standardSelected, ...this.customInstruments];

        console.log(`📋 Selected ${allSelected.length} instruments:`);
        allSelected.forEach(i => console.log(`   - ${i.name}${i.isCustom ? ' (custom)' : ''}`));

        return allSelected;
    },

    /**
     * Sauvegarder les instruments d'un utilisateur dans Supabase
     */
    async saveUserInstruments(userName, instruments) {
        try {
            console.log(`💾 Saving ${instruments.length} instruments for user: ${userName}`);

            // 1. Créer l'utilisateur s'il n'existe pas (ou récupérer son ID)
            let userId;

            // Essayer d'insérer
            const { data: insertData, error: insertError } = await supabase
                .from('users')
                .insert([{ name: userName }])
                .select('id');

            if (insertError && insertError.code === '23505') {
                // Violation de contrainte unique (user existe déjà)
                console.log(`   User "${userName}" already exists, retrieving ID...`);
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('name', userName)
                    .single();
                userId = existingUser.id;
            } else if (insertError) {
                throw insertError;
            } else {
                userId = insertData[0].id;
            }

            console.log(`   User ID: ${userId}`);

            // 2. Pour chaque instrument
            for (const instrument of instruments) {
                if (instrument.isCustom) {
                    // Créer l'instrument custom en base de données
                    console.log(`   Creating custom instrument: ${instrument.name}`);
                    const { data: instData, error: instError } = await supabase
                        .from('instruments')
                        .insert([{ name: instrument.name, is_custom: true, created_by: userName }])
                        .select();

                    if (instError) {
                        console.warn(`   ⚠️  Could not create custom instrument: ${instError.message}`);
                        continue;
                    }

                    const instrumentId = instData[0].id;

                    // Lier l'utilisateur à cet instrument
                    const { error: linkError } = await supabase
                        .from('user_instruments')
                        .insert([{ user_id: userId, instrument_id: instrumentId }]);

                    if (linkError) {
                        console.warn(`   ⚠️  Could not link instrument: ${linkError.message}`);
                    } else {
                        console.log(`   ✅ Linked custom instrument: ${instrument.name}`);
                    }
                } else {
                    // Chercher l'instrument standard
                    const { data: instData, error: instError } = await supabase
                        .from('instruments')
                        .select('id')
                        .eq('name', instrument.name)
                        .eq('is_custom', false)
                        .single();

                    if (instError) {
                        console.warn(`   ⚠️  Standard instrument not found: ${instrument.name}`);
                        continue;
                    }

                    const instrumentId = instData.id;

                    // Lier l'utilisateur à cet instrument
                    const { error: linkError } = await supabase
                        .from('user_instruments')
                        .insert([{ user_id: userId, instrument_id: instrumentId }]);

                    if (linkError && !linkError.message.includes('duplicate')) {
                        console.warn(`   ⚠️  Could not link instrument: ${linkError.message}`);
                    } else {
                        console.log(`   ✅ Linked standard instrument: ${instrument.name}`);
                    }
                }
            }

            console.log(`✅ All instruments saved for user: ${userName}`);
            return true;
        } catch (error) {
            console.error('❌ Error saving instruments:', error);
            console.error('   Error details:', error.message);
            return false;
        }
    },

    /**
     * Charger les instruments d'un utilisateur depuis Supabase
     */
    async loadUserInstruments(userName) {
        try {
            console.log(`🎸 Loading instruments for user: ${userName}`);

            // 1. Récupérer l'ID de l'utilisateur
            const { data: userData } = await supabase
                .from('users')
                .select('id')
                .eq('name', userName)
                .single();

            if (!userData) {
                console.warn(`⚠️  User not found: ${userName}`);
                return [];
            }

            // 2. Récupérer les instruments de cet utilisateur
            const { data: userInstruments, error } = await supabase
                .from('user_instruments')
                .select(`
                    instruments:instrument_id (id, name, is_custom)
                `)
                .eq('user_id', userData.id);

            if (error) {
                console.warn('⚠️  Error loading user instruments:', error.message);
                return [];
            }

            const instruments = userInstruments
                .map(ui => ui.instruments)
                .filter(i => i !== null)
                .map(i => i.name);

            console.log(`✅ Loaded ${instruments.length} instruments for ${userName}`);
            instruments.forEach(i => console.log(`   - ${i}`));

            return instruments;
        } catch (error) {
            console.error('❌ Error:', error);
            return [];
        }
    },

    /**
     * Réinitialiser les instruments (après register)
     */
    reset() {
        console.log('🔄 Resetting instruments manager');
        this.customInstruments = [];
        const grid = document.getElementById('instrumentsGrid');
        if (grid) {
            grid.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        }
        const customInput = document.getElementById('customInstrument');
        if (customInput) customInput.value = '';
        this.displayCustomInstruments();
    }
};

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎵 Initializing InstrumentsManager...');

    // Charger les instruments standards
    await InstrumentsManager.displayInstruments();

    // Setup du bouton pour ajouter un instrument custom
    const addCustomBtn = document.getElementById('addCustomBtn');
    const customInput = document.getElementById('customInstrument');

    if (addCustomBtn && customInput) {
        addCustomBtn.addEventListener('click', () => {
            const name = customInput.value.trim();
            if (InstrumentsManager.addCustomInstrumentTemporary(name)) {
                customInput.value = '';
            }
        });

        customInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const name = customInput.value.trim();
                if (InstrumentsManager.addCustomInstrumentTemporary(name)) {
                    customInput.value = '';
                }
            }
        });
    }

    console.log('✅ InstrumentsManager ready');
});
