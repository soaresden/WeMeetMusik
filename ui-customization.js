/**
 * Gestion de l'Overlay Customization (Emoji, Couleurs, Instruments)
 */

const UICustomization = {
    /**
     * Afficher l'overlay de customization
     */
    async showCustomizationPage() {
        // Charger les couleurs et instruments actuels
        const { data: userData, error } = await supabase
            .from('users')
            .select('emoji, color_primary, color_secondary')
            .eq('id', UI.currentUserId)
            .single();

        const emoji = userData?.emoji || '🎵';
        const colorPrimary = userData?.color_primary || '#ff4758';
        const colorSecondary = userData?.color_secondary || '#f8f9fa';

        // Charger les instruments actuels de l'utilisateur
        const currentInstruments = await SupabaseData.getUserInstruments(UI.currentUserId);
        UI.customizationInstruments = [...currentInstruments];
        console.log(`📋 Loaded instruments for user ${UI.currentUserId}:`, UI.customizationInstruments);

        // Pré-remplir les inputs
        document.getElementById('customizationEmoji').value = emoji;
        document.getElementById('customizationColorPrimary').value = colorPrimary;
        document.getElementById('customizationColorSecondary').value = colorSecondary;
        document.getElementById('customColorPrimaryLabel').textContent = colorPrimary;
        document.getElementById('customColorSecondaryLabel').textContent = colorSecondary;

        // Afficher les instruments
        this.populateMyInstruments();
        this.populateAvailableInstruments();

        // Events couleurs
        document.getElementById('customizationColorPrimary').addEventListener('input', (e) => {
            document.getElementById('customColorPrimaryLabel').textContent = e.target.value;
            this.previewColors();
        });
        document.getElementById('customizationColorSecondary').addEventListener('input', (e) => {
            document.getElementById('customColorSecondaryLabel').textContent = e.target.value;
            this.previewColors();
        });

        // Events instruments
        document.getElementById('addNewInstrumentBtn').addEventListener('click', () => this.addNewInstrument());
        document.getElementById('newInstrumentInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addNewInstrument();
        });

        // Events boutons
        document.getElementById('customSaveBtn').addEventListener('click', () => this.save());
        document.getElementById('customLoginBtn').addEventListener('click', () => this.login());
        document.getElementById('closeCustomizationBtn').addEventListener('click', () => this.closeOverlay());

        // Preview initial
        this.previewColors();

        // Masquer login et afficher overlay
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('customizationOverlay').classList.add('active');
    },

    /**
     * Afficher mes instruments sélectionnés
     */
    populateMyInstruments() {
        const container = document.getElementById('myInstrumentsDisplay');

        if (!container) return;

        console.log('🎸 populateMyInstruments - UI.customizationInstruments:', UI.customizationInstruments);

        container.innerHTML = UI.customizationInstruments.length === 0
            ? '<p style="color: #999; font-size: 0.9em;">Aucun instrument sélectionné</p>'
            : UI.customizationInstruments
                .map(inst => `
                    <div class="instrument-badge">
                        ${inst}
                        <button onclick="UICustomization.removeInstrument('${inst}')" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.2em; padding: 0; line-height: 1;">✕</button>
                    </div>
                `)
                .join('');
    },

    /**
     * Afficher les instruments disponibles
     */
    populateAvailableInstruments() {
        const container = document.getElementById('customizationInstrumentsGrid');

        if (!container) return;

        container.innerHTML = UI.availableInstruments
            .map(instrument => `
                <button class="instrument-btn ${UI.customizationInstruments.includes(instrument) ? 'selected' : ''}"
                        onclick="UICustomization.toggleInstrument('${instrument}')"
                        data-instrument="${instrument}">
                    ${instrument}
                </button>
            `)
            .join('');
    },

    /**
     * Basculer un instrument
     */
    toggleInstrument(instrument) {
        const btn = document.querySelector(`[data-instrument="${instrument}"]`);
        btn.classList.toggle('selected');

        if (UI.customizationInstruments.includes(instrument)) {
            UI.customizationInstruments = UI.customizationInstruments.filter(i => i !== instrument);
        } else {
            UI.customizationInstruments.push(instrument);
        }

        this.populateMyInstruments();
    },

    /**
     * Supprimer un instrument sélectionné
     */
    removeInstrument(instrument) {
        UI.customizationInstruments = UI.customizationInstruments.filter(i => i !== instrument);
        this.populateMyInstruments();
        this.populateAvailableInstruments();
    },

    /**
     * Ajouter un nouvel instrument
     */
    async addNewInstrument() {
        const input = document.getElementById('newInstrumentInput');
        const instrument = input.value.trim();

        if (!instrument) {
            alert('Saisis un instrument');
            return;
        }

        if (UI.customizationInstruments.includes(instrument)) {
            alert('Cet instrument est déjà ajouté');
            return;
        }

        try {
            // Vérifier si l'instrument existe déjà (sans .single() pour éviter les erreurs)
            const { data: existing } = await supabase
                .from('instruments')
                .select('name')
                .eq('name', instrument);

            if (!existing || existing.length === 0) {
                // Ajouter à la table instruments
                const { error: insertError } = await supabase
                    .from('instruments')
                    .insert([{ name: instrument }]);

                // Ignorer les erreurs de duplicate et d'authorization pour maintenant
                if (insertError) {
                    console.warn(`⚠️ Could not add to instruments table: ${insertError.message}`);
                    // Continuer quand même - on ajoute à user_instruments
                }
            }

            // Ajouter à l'utilisateur
            await SupabaseData.addInstrument(UI.currentUserId, instrument);

            // Recharger la liste des instruments disponibles
            const updatedInstruments = await SupabaseData.getAllAvailableInstruments();
            UI.availableInstruments = updatedInstruments;

            // Ajouter à la sélection UI
            UI.customizationInstruments.push(instrument);

            input.value = '';
            this.populateMyInstruments();
            this.populateAvailableInstruments();

            console.log(`✅ Instrument added: ${instrument}`);
            alert(`✅ ${instrument} ajouté!`);
        } catch (error) {
            console.error('❌ Error adding instrument:', error);
            alert('Erreur: ' + error.message);
        }
    },

    /**
     * Aperçu en live des couleurs
     */
    previewColors() {
        const colorPrimary = document.getElementById('customizationColorPrimary').value;
        const colorSecondary = document.getElementById('customizationColorSecondary').value;

        document.documentElement.style.setProperty('--primary', colorPrimary);
        document.documentElement.style.setProperty('--bg-light', colorSecondary);

        console.log(`🎨 Preview: primary=${colorPrimary}, secondary=${colorSecondary}`);
    },

    /**
     * Sauvegarder customization (emoji, couleurs, instruments)
     */
    async save() {
        const emoji = document.getElementById('customizationEmoji').value || '🎵';
        const colorPrimary = document.getElementById('customizationColorPrimary').value;
        const colorSecondary = document.getElementById('customizationColorSecondary').value;

        console.log(`💾 SAVE BUTTON CLICKED - Saving to Supabase:`);
        console.log(`   User ID: ${UI.currentUserId}`);
        console.log(`   Emoji: ${emoji}, Primary: ${colorPrimary}, Secondary: ${colorSecondary}`);
        console.log(`   Instruments: ${UI.customizationInstruments.join(', ') || 'NONE'}`);

        try {
            console.log('🔄 Starting save transaction...');
            // Mettre à jour user (emoji et couleurs)
            const { error } = await supabase
                .from('users')
                .update({
                    emoji: emoji,
                    color_primary: colorPrimary,
                    color_secondary: colorSecondary
                })
                .eq('id', UI.currentUserId);

            if (error) throw error;
            console.log(`✅ User data updated in Supabase`);

            // Récupérer les instruments actuels
            const { data: currentInsts } = await supabase
                .from('user_instruments')
                .select('instrument')
                .eq('user_id', UI.currentUserId);

            const currentInstruments = currentInsts?.map(i => i.instrument) || [];
            console.log(`📋 Current instruments in DB: ${currentInstruments.join(', ')}`);

            // Supprimer les désélectionnés
            for (const inst of currentInstruments) {
                if (!UI.customizationInstruments.includes(inst)) {
                    console.log(`❌ Removing instrument: ${inst}`);
                    await SupabaseData.removeInstrument(UI.currentUserId, inst);
                }
            }

            // Ajouter les nouveaux
            for (const inst of UI.customizationInstruments) {
                if (!currentInstruments.includes(inst)) {
                    console.log(`➕ Adding instrument: ${inst}`);
                    await SupabaseData.addInstrument(UI.currentUserId, inst);
                }
            }

            console.log('✅ CUSTOMIZATION FULLY SAVED TO SUPABASE (emoji, couleurs, instruments)');
            UI.currentUserEmoji = emoji;
            UI.currentUserColorPrimary = colorPrimary;
            UI.currentUserColorSecondary = colorSecondary;

            console.log('✅ All UI state updated');
            alert('✅ Tout sauvegardé sur Supabase!');
        } catch (error) {
            console.error('❌❌❌ CRITICAL ERROR IN SAVE:', error.message, error.stack);
            alert('❌ Erreur lors de la sauvegarde: ' + error.message);
        }
    },

    /**
     * Login depuis customization
     */
    async login() {
        const emoji = document.getElementById('customizationEmoji').value || '🎵';
        const colorPrimary = document.getElementById('customizationColorPrimary').value;
        const colorSecondary = document.getElementById('customizationColorSecondary').value;

        try {
            // Mettre à jour couleurs et emoji
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    emoji: emoji,
                    color_primary: colorPrimary,
                    color_secondary: colorSecondary
                })
                .eq('id', UI.currentUserId);

            if (updateError) throw updateError;

            // Récupérer les instruments actuels
            const { data: currentInsts } = await supabase
                .from('user_instruments')
                .select('instrument')
                .eq('user_id', UI.currentUserId);

            const currentInstruments = currentInsts?.map(i => i.instrument) || [];

            // Supprimer les désélectionnés
            for (const inst of currentInstruments) {
                if (!UI.customizationInstruments.includes(inst)) {
                    await SupabaseData.removeInstrument(UI.currentUserId, inst);
                }
            }

            // Ajouter les nouveaux
            for (const inst of UI.customizationInstruments) {
                if (!currentInstruments.includes(inst)) {
                    await SupabaseData.addInstrument(UI.currentUserId, inst);
                }
            }

            console.log('✅ Login with customization');

            UI.currentUserEmoji = emoji;
            UI.currentUserColorPrimary = colorPrimary;
            UI.currentUserColorSecondary = colorSecondary;

            console.log('✅ Closing overlay and entering app...');

            // Fermer l'overlay
            const overlay = document.getElementById('customizationOverlay');
            if (overlay) {
                overlay.classList.remove('active');
                overlay.style.display = 'none';
            }

            // Entrer dans l'app
            await UIApp.enter();

            // Petit délai pour assurer le rendu
            await new Promise(r => setTimeout(r, 100));

            console.log('✅ App ready!');
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    },

    /**
     * Fermer l'overlay et revenir à la page de login
     */
    closeOverlay() {
        console.log('👈 Closing customization overlay...');

        const overlay = document.getElementById('customizationOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }

        // Réinitialiser l'état de l'utilisateur
        UI.currentUserId = null;
        UI.currentUserName = null;
        UI.customizationInstruments = [];

        // Revenir à la page de login
        document.getElementById('loginPage').classList.add('active');
        document.getElementById('appPage').classList.remove('active');
        document.getElementById('instrumentsVerificationPage').classList.remove('active');

        console.log('✅ Returned to login page');
    }
};

console.log('🎵 UICustomization module loaded');
