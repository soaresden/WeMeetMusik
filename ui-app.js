/**
 * Gestion de l'Interface Principale (App)
 */

const UIApp = {
    /**
     * Entrer dans l'app
     */
    async enter() {
        console.log('📱 Entering app...');

        this.applyUserColors();

        document.getElementById('instrumentsVerificationPage').classList.remove('active');
        document.getElementById('appPage').classList.add('active');
        document.getElementById('currentUser').textContent = UI.currentUserName;

        // Afficher les instruments avec l'emoji de l'user
        const instruments = await SupabaseData.getUserInstruments(UI.currentUserId);
        const userEmoji = UI.currentUserEmoji || '🎵';
        document.getElementById('userInstruments').textContent = instruments.length > 0
            ? userEmoji + ' ' + instruments.join(', ')
            : '';
        console.log(`🎸 Instruments displayed: ${userEmoji} ${instruments.join(', ')}`);

        // Charger la table
        await this.loadAndRenderTable();

        // Restaurer l'état de lecture depuis le cache navigateur
        const cachedPlayback = localStorage.getItem('currentPlayingPartition');
        if (cachedPlayback) {
            try {
                const playbackInfo = JSON.parse(cachedPlayback);
                console.log(`🎵 État de lecture en cache trouvé:`, playbackInfo);
                // Note: le bouton sera marqué comme 'playing' mais la lecture ne reprendra pas
                // L'utilisateur devra cliquer de nouveau pour continuer
            } catch (e) {
                console.warn('⚠️ Impossible de restaurer l\'état de lecture:', e);
            }
        }

        // Events tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                await this.loadAndRenderTable(e.target.dataset.filter);
            });
        });

        // Events
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('addPartitionBtn').addEventListener('click', () => this.addPartition());
        document.getElementById('newTitle').addEventListener('input', (e) => this.showSuggestions(e.target.value));

        // Event recherche
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Events tri par header
        document.querySelectorAll('.partitions-table th.sortable').forEach(th => {
            th.addEventListener('click', (e) => this.handleSort(e.target.dataset.column));
        });
    },

    /**
     * Appliquer les couleurs
     */
    applyUserColors() {
        const colorPrimary = UI.currentUserColorPrimary || '#ff4758';
        const colorSecondary = UI.currentUserColorSecondary || '#f8f9fa';

        document.documentElement.style.setProperty('--primary', colorPrimary);
        document.documentElement.style.setProperty('--bg-light', colorSecondary);

        console.log(`🎨 Applied colors: primary=${colorPrimary}, secondary=${colorSecondary}`);
    },

    /**
     * Charger et afficher la table des partitions
     */
    async loadAndRenderTable(filter = 'all') {
        // Afficher le loading indicator
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) loadingIndicator.style.display = 'flex';

        const partitions = await SupabaseData.getAllPartitions();
        const tbody = document.getElementById('partitionsTableBody');

        tbody.innerHTML = '';

        // Stocker partitions pour le filtrage
        UIApp.allPartitions = partitions;
        UIApp.currentFilter = filter;

        // Trier par date d'ajout décroissante
        partitions.sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA;
        });

        // Filtrer les partitions selon le statut de l'user
        let filteredPartitions = partitions;

        if (filter !== 'all') {
            filteredPartitions = [];
            for (const partition of partitions) {
                const userStatus = await SupabaseData.getUserPartitionStatus(UI.currentUserId, partition.id);
                if (userStatus === filter) {
                    filteredPartitions.push(partition);
                }
            }
        }

        for (const partition of filteredPartitions) {
            const tr = document.createElement('tr');
            tr.setAttribute('data-partition-id', partition.id);

            const statuses = await SupabaseData.getPartitionStatuses(partition.id);
            const userStatus = await SupabaseData.getUserPartitionStatus(UI.currentUserId, partition.id);

            const workingCount = statuses.working.length;
            const todoCount = statuses.todo.length;
            const skilledCount = statuses.skilled.length;

            // Affichage des noms pour les statuts
            const workingNames = statuses.working.map(s => s.users?.name || '?').join(', ');
            const todoNames = statuses.todo.map(s => s.users?.name || '?').join(', ');
            const skilledNames = statuses.skilled.map(s => s.users?.name || '?').join(', ');

            const nomFichier = partition.nom_fichier || '';
            const uploadBtn = `<button class="btn-upload" data-partition-id="${partition.id}" title="Ajouter fichier MIDI">🎼</button>`;
            const youtubeLink = `<a href="#" class="btn-youtube" data-title="${partition.title}" data-artist="${partition.artist}" style="color: var(--primary); text-decoration: none; font-weight: 600; cursor: pointer;">Youtube</a>`;
            const fichierDisplay = `<div style="display: flex; gap: 6px; align-items: center; justify-content: flex-start;">${youtubeLink} ${uploadBtn} <input type="text" value="${nomFichier}" class="table-input" data-partition-id="${partition.id}" data-field="nom_fichier" placeholder="..." style="flex: 1; max-width: 100px;"></div>`;

            tr.innerHTML = `
                <td><strong>${partition.title}</strong></td>
                <td>${partition.artist}</td>
                <td>${partition.users?.name || 'Inconnu'}</td>
                <td>${partition.status}</td>
                <td>${fichierDisplay}</td>
                <td class="status-cell ${userStatus === 'working' ? 'active' : ''}" onclick="UIApp.setStatus(${partition.id}, 'working')" title="${workingNames || 'Personne'}">
                    🐫 ${workingNames || ''}
                </td>
                <td class="status-cell ${userStatus === 'todo' ? 'active' : ''}" onclick="UIApp.setStatus(${partition.id}, 'todo')" title="${todoNames || 'Personne'}">
                    🤔 ${todoNames || ''}
                </td>
                <td class="status-cell ${userStatus === 'skilled' ? 'active' : ''}" onclick="UIApp.setStatus(${partition.id}, 'skilled')" title="${skilledNames || 'Personne'}">
                    ✅ ${skilledNames || ''}
                </td>
                <td style="text-align: center;">
                    <button class="btn-delete-row" data-partition-id="${partition.id}" data-title="${partition.title}" style="background: none; border: none; cursor: pointer; font-size: 1.2em; color: #999; padding: 0;">✕</button>
                </td>
            `;

            tbody.appendChild(tr);
        }

        // Mettre à jour le compteur
        const counterElement = document.getElementById('partitionsCounter');
        if (counterElement) {
            counterElement.textContent = filteredPartitions.length;
        }

        // Masquer le loading indicator
        if (loadingIndicator) loadingIndicator.style.display = 'none';

        // Ajouter les event listeners pour les inputs de fichier
        document.querySelectorAll('.table-input').forEach(input => {
            input.addEventListener('blur', async (e) => {
                const partitionId = e.target.dataset.partitionId;
                const field = e.target.dataset.field;
                const value = e.target.value;

                if (value) {
                    try {
                        await SupabaseData.updatePartitionField(partitionId, field, value);
                        console.log(`✅ ${field} saved for partition ${partitionId}`);
                    } catch (error) {
                        alert(`Erreur: ${error.message}`);
                    }
                }
            });

            // Sauvegarder au Enter
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.target.blur();
                }
            });
        });

        // Event listeners pour les boutons upload
        document.querySelectorAll('.btn-upload').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const partitionId = e.target.dataset.partitionId;
                console.log(`📤 Upload MIDI for partition ${partitionId}`);
                alert('Feature upload MIDI - À venir!');
            });
        });

        // Event listeners pour les liens Youtube
        document.querySelectorAll('.btn-youtube').forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const title = e.target.dataset.title;
                const artist = e.target.dataset.artist;

                const query = `${title} ${artist}`;
                const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

                console.log(`🔍 Ouverture YouTube: "${query}"`);
                window.open(youtubeSearchUrl, '_blank', 'width=1200,height=800');
            });
        });

        // Events pour l'overlay de recherche MIDI
        document.getElementById('closeMidiSearchBtn').addEventListener('click', () => {
            document.getElementById('midiSearchOverlay').classList.remove('active');
        });

        document.getElementById('midiLoadBtn').addEventListener('click', () => {
            const url = document.getElementById('midiUrlInput').value.trim();
            if (!url) {
                alert('Veuillez entrer une URL');
                return;
            }
            document.getElementById('midiSearchOverlay').classList.remove('active');
            UIApp.startPlayback(url);
        });

        // Fermer l'overlay en cliquant en dehors
        document.getElementById('midiSearchOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'midiSearchOverlay') {
                document.getElementById('midiSearchOverlay').classList.remove('active');
            }
        });

        // Double-click pour éditer les cellules
        document.querySelectorAll('td').forEach(cell => {
            cell.addEventListener('dblclick', function(e) {
                if (e.target.tagName === 'STRONG' || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

                const text = this.innerText;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = text;
                input.className = 'table-edit-input';
                input.style.width = '100%';
                input.style.padding = '6px 8px';
                input.style.border = '1px solid var(--primary)';
                input.style.borderRadius = '4px';

                this.innerText = '';
                this.appendChild(input);
                input.focus();
                input.select();

                const save = async () => {
                    const newValue = input.value;
                    this.innerText = newValue || text;
                    console.log(`📝 Cell edited: ${text} → ${newValue}`);
                };

                input.addEventListener('blur', save);
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') input.blur();
                });
            });
        });

        // Event listeners pour les boutons supprimer
        document.querySelectorAll('.btn-delete-row').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const partitionId = e.target.dataset.partitionId;
                const title = e.target.dataset.title;

                // Afficher l'overlay de confirmation
                const overlay = document.getElementById('deleteConfirmOverlay');
                document.getElementById('deleteConfirmText').innerHTML = `Vous allez supprimer <strong>${title}</strong>`;

                overlay.classList.add('active');

                // Bouton confirmer
                document.getElementById('deleteConfirmBtn').onclick = async () => {
                    try {
                        await SupabaseData.deletePartition(partitionId);
                        overlay.classList.remove('active');
                        console.log(`🗑️ Partition deleted: ${title}`);
                        await UIApp.loadAndRenderTable(UIApp.currentFilter || 'all');
                    } catch (error) {
                        alert(`Erreur: ${error.message}`);
                        overlay.classList.remove('active');
                    }
                };

                // Bouton annuler
                document.getElementById('deleteCancelBtn').onclick = () => {
                    overlay.classList.remove('active');
                };
            });
        });

        console.log(`✅ Table rendered with ${partitions.length} partitions`);
    },

    /**
     * Ajouter une partition
     */
    async addPartition() {
        const title = document.getElementById('newTitle').value.trim();
        const artist = document.getElementById('newArtist').value.trim();

        if (!title || !artist) {
            alert('Remplis Titre et Artiste');
            return;
        }

        try {
            await SupabaseData.addPartition(title, artist, UI.currentUserId);

            document.getElementById('newTitle').value = '';
            document.getElementById('newArtist').value = '';
            document.getElementById('suggestions').innerHTML = '';

            await this.loadAndRenderTable();
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    },

    /**
     * Définir le statut d'une partition (sans recharger toute la table)
     * Toggle si même statut, sinon switch direct au nouveau statut
     */
    async setStatus(partitionId, status) {
        try {
            const currentStatus = await SupabaseData.getUserPartitionStatus(UI.currentUserId, partitionId);

            if (currentStatus === status) {
                // Même statut cliqué = désactiver le statut
                await SupabaseData.removeUserPartitionStatus(UI.currentUserId, partitionId);
                console.log(`🔄 Status removed for partition ${partitionId}`);
            } else {
                // Statut différent = forcer directement le nouveau statut
                // Si un ancien statut existe, il sera remplacé
                await SupabaseData.setUserPartitionStatus(UI.currentUserId, partitionId, status);
                console.log(`🔄 Status changed from ${currentStatus} to ${status} for partition ${partitionId}`);
            }

            // Mettre à jour uniquement la ligne concernée
            await this.updateStatusCells(partitionId);
        } catch (error) {
            console.error('❌ Error setting status:', error);
        }
    },

    /**
     * Mettre à jour uniquement les cellules de status pour une partition
     */
    async updateStatusCells(partitionId) {
        try {
            const statuses = await SupabaseData.getPartitionStatuses(partitionId);
            const userStatus = await SupabaseData.getUserPartitionStatus(UI.currentUserId, partitionId);

            const workingCount = statuses.working.length;
            const todoCount = statuses.todo.length;
            const skilledCount = statuses.skilled.length;

            // Affichage des noms pour les statuts
            const workingNames = statuses.working.map(s => s.users?.name || '?').join(', ');
            const todoNames = statuses.todo.map(s => s.users?.name || '?').join(', ');
            const skilledNames = statuses.skilled.map(s => s.users?.name || '?').join(', ');

            // Trouver la ligne dans la table
            const row = document.querySelector(`tr[data-partition-id="${partitionId}"]`);
            if (!row) return;

            // Mettre à jour les cellules de status
            const cells = row.querySelectorAll('.status-cell');

            if (cells[0]) {
                cells[0].className = `status-cell ${userStatus === 'working' ? 'active' : ''}`;
                cells[0].innerHTML = `🐫 ${workingNames || ''}`;
                cells[0].title = workingNames || 'Personne';
            }

            if (cells[1]) {
                cells[1].className = `status-cell ${userStatus === 'todo' ? 'active' : ''}`;
                cells[1].innerHTML = `🤔 ${todoNames || ''}`;
                cells[1].title = todoNames || 'Personne';
            }

            if (cells[2]) {
                cells[2].className = `status-cell ${userStatus === 'skilled' ? 'active' : ''}`;
                cells[2].innerHTML = `✅ ${skilledNames || ''}`;
                cells[2].title = skilledNames || 'Personne';
            }

            console.log(`✅ Statuts mis à jour pour partition ${partitionId}`);
        } catch (error) {
            console.error('❌ Error updating status cells:', error);
        }
    },

    /**
     * Afficher les suggestions
     */
    async showSuggestions(query) {
        const suggestionsDiv = document.getElementById('suggestions');

        if (!query || query.length < 2) {
            suggestionsDiv.innerHTML = '';
            return;
        }

        const suggestions = await SupabaseData.searchPartitions(query);

        if (suggestions.length === 0) {
            suggestionsDiv.innerHTML = '';
            return;
        }

        suggestionsDiv.innerHTML = suggestions
            .map(title => `<div class="suggestion-item" onclick="UIApp.selectSuggestion('${title}')">${title}</div>`)
            .join('');
    },

    /**
     * Sélectionner une suggestion
     */
    selectSuggestion(title) {
        document.getElementById('newTitle').value = title;
        document.getElementById('suggestions').innerHTML = '';
        document.getElementById('newArtist').focus();
    },

    /**
     * Chercher une chanson sur YouTube et créer un embed
     */
    async searchSpotifyPreview(title, artist) {
        const cleanTitleRaw = title.replace(/<[^>]*>/g, '').trim();
        const cleanArtistRaw = artist.replace(/<[^>]*>/g, '').trim();
        const query = `${cleanTitleRaw} ${cleanArtistRaw}`;

        console.log(`🎵 Cherchant sur YouTube: "${query}"`);

        try {
            // Construire une URL YouTube de recherche
            const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

            console.log(`✅ URL YouTube prête`);

            // Retourner un résultat "virtuel" qui servira pour l'embed
            return {
                type: 'youtube',
                title: cleanTitleRaw,
                artist: cleanArtistRaw,
                searchUrl: youtubeSearchUrl,
                query: encodeURIComponent(query),
                duration: 0
            };
        } catch (error) {
            console.error(`❌ Erreur: ${error.message}`);
            throw error;
        }
    },

    /**
     * Jouer un fichier audio (MP3 Spotify ou MIDI)
     */
    async playMidiFile(audioUrl) {
        // Si c'est le mode démo, jouer la démo
        if (audioUrl === 'DEMO_MIDI') {
            console.log('🎵 Mode démo - aucun fichier trouvé');
            const synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 }
            }).toDestination();
            window.currentMidiPlayer = synth;
            this.playDemoMelody(synth, Tone.now());
            return;
        }

        // Si c'est une URL Spotify (preview MP3)
        if (audioUrl.includes('spotify') || audioUrl.endsWith('.mp3')) {
            console.log(`🎵 Jouant preview Spotify: ${audioUrl}`);
            try {
                // Créer un lecteur audio HTML5
                const audio = new Audio();
                audio.crossOrigin = 'anonymous';
                audio.src = audioUrl;

                window.currentMidiPlayer = audio;

                // Écouter la fin de la lecture
                audio.addEventListener('ended', () => {
                    console.log('🎵 Preview terminé');
                });

                audio.addEventListener('error', (e) => {
                    console.error('❌ Erreur lecture audio:', e);
                    throw new Error('Impossible de jouer le preview');
                });

                // Jouer
                await audio.play();
                console.log('▶️ Preview en cours de lecture...');
            } catch (error) {
                console.warn(`⚠️ Impossible de jouer le preview: ${error.message}`);
                console.log('🎵 Fallback démo');
                const synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: 'triangle' },
                    envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 }
                }).toDestination();
                window.currentMidiPlayer = synth;
                this.playDemoMelody(synth, Tone.now());
            }
            return;
        }

        // Sinon, traiter comme MIDI
        console.log(`🎵 Jouant MIDI: ${audioUrl}`);
        try {
            const synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 }
            }).toDestination();

            window.currentMidiPlayer = synth;

            // Essayer de récupérer et parser le fichier MIDI réel
            try {
                const response = await fetch(audioUrl, { mode: 'cors' });
                if (!response.ok) throw new Error('Impossible de charger le fichier MIDI');

                const arrayBuffer = await response.arrayBuffer();

                // Parser le fichier MIDI avec midi-parser-js
                if (window.MidiParser) {
                    const midiData = window.MidiParser.parse(arrayBuffer);
                    console.log(`✅ MIDI parsé avec ${midiData.tracks.length} pistes`);

                    // Jouer les notes du fichier MIDI
                    let currentTime = Tone.now();
                    const notesPlayed = [];

                    // Récupérer les notes de la première piste (mélodie)
                    if (midiData.tracks && midiData.tracks.length > 0) {
                        const track = midiData.tracks[0];
                        let trackTime = 0;

                        for (const event of track) {
                            if (event.type === 'Note') {
                                const noteName = this.midiNoteToName(event.data.key);
                                const duration = (event.data.duration / 480) + 'n';

                                synth.triggerAttackRelease(noteName, duration, currentTime + trackTime);
                                notesPlayed.push(noteName);
                                trackTime += event.data.duration / 480;
                            }
                        }

                        console.log(`🎵 Joué ${notesPlayed.length} notes`);
                        await new Promise(r => setTimeout(r, trackTime * 1000 + 1000));
                    } else {
                        this.playDemoMelody(synth, Tone.now());
                    }
                } else {
                    console.warn('⚠️ midi-parser-js non chargé, lecture démo');
                    this.playDemoMelody(synth, Tone.now());
                }
            } catch (fetchError) {
                console.warn(`⚠️ Impossible de charger le fichier: ${fetchError.message}`);
                this.playDemoMelody(synth, Tone.now());
            }

        } catch (error) {
            console.error('Erreur lecture:', error);
            throw error;
        }
    },

    /**
     * Jouer une mélodie de démonstration
     */
    playDemoMelody(synth, startTime) {
        const now = startTime;
        synth.triggerAttackRelease('C4', '8n', now);
        synth.triggerAttackRelease('D4', '8n', now + 0.25);
        synth.triggerAttackRelease('E4', '8n', now + 0.5);
        synth.triggerAttackRelease('F4', '8n', now + 0.75);
        synth.triggerAttackRelease('G4', '4n', now + 1);
        console.log('🎵 Mélodie démo: Do-Ré-Mi-Fa-Sol');
    },

    /**
     * Convertir une note MIDI (0-127) en notation Tone.js (C4, D4, etc.)
     */
    midiNoteToName(midiNote) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteIndex = midiNote % 12;
        return notes[noteIndex] + octave;
    },

    /**
     * Ouvrir l'overlay de recherche MIDI
     */
    openMidiSearchOverlay(title, artist) {
        const overlay = document.getElementById('midiSearchOverlay');
        overlay.classList.add('active');

        // Nettoyer l'input
        document.getElementById('midiUrlInput').value = '';
        document.getElementById('midiUrlInput').focus();

        // Générer les liens de recherche
        const titleQuerySafe = title.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().replace(/\s+/g, '+');
        const artistQuerySafe = artist.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().replace(/\s+/g, '+');
        const searchQuery = `${titleQuerySafe}+${artistQuerySafe}`;

        const searchLinks = [
            {
                name: '🎵 BitMIDI',
                url: `https://bitmidi.com/search/${searchQuery}`
            },
            {
                name: '📚 FreeMIDI',
                url: `https://freemidi.org/search.php?q=${searchQuery}`
            },
            {
                name: '🎹 Musicca',
                url: `https://musicca.com/piano-midi?search=${searchQuery}`
            },
            {
                name: '🎼 MidiWorld',
                url: `https://midiworld.com/search.html?q=${searchQuery}`
            }
        ];

        // Remplir les liens
        const linksContainer = document.getElementById('midiSearchLinks');
        linksContainer.innerHTML = searchLinks
            .map(link => `
                <a href="${link.url}" target="_blank" class="midi-search-link">
                    ${link.name}
                </a>
            `)
            .join('');

        console.log(`🔍 Overlay ouvert pour: ${title} - ${artist}`);
    },

    /**
     * Jouer sur YouTube (embed ou popup)
     */
    async playSpotifyPreview(result, btn) {
        if (typeof result === 'string') {
            // C'est une démo ou DEMO_MIDI
            await this.playMidiFile(result);
            return;
        }

        if (!result || result.type !== 'youtube') {
            throw new Error('Résultat YouTube invalide');
        }

        console.log(`🎵 Ouverture YouTube: ${result.title} - ${result.artist}`);

        try {
            // Ouvrir YouTube dans une nouvelle fenêtre/tab
            const youtubeWindow = window.open(result.searchUrl, 'youtube_player', 'width=900,height=650');

            if (!youtubeWindow) {
                throw new Error('Impossible d\'ouvrir YouTube (popups bloquées?)');
            }

            // Garder référence
            window.currentYouTubePlayer = youtubeWindow;

            console.log(`✅ YouTube ouvert - cherche la chanson et clique play!`);

            // Auto-reset du bouton après 2 secondes (l'utilisateur doit cliquer play lui-même)
            setTimeout(() => {
                if (btn && btn.classList.contains('playing')) {
                    btn.classList.remove('playing');
                    btn.textContent = '▶️';
                }
            }, 2000);

        } catch (error) {
            console.error('Erreur YouTube:', error);
            throw error;
        }
    },

    /**
     * Démarrer la lecture d'une URL MIDI
     */
    async startPlayback(midiUrl) {
        console.log(`▶️ Démarrage playback: ${midiUrl}`);

        // Trouver le bouton play actuellement cliqué (on le marque comme playing)
        const allPlayBtns = document.querySelectorAll('.btn-play');
        const activeBtn = Array.from(allPlayBtns).find(btn => !btn.classList.contains('playing'));

        if (activeBtn) {
            activeBtn.classList.add('playing');
            activeBtn.textContent = '⏸️';
        }

        try {
            // Jouer le fichier MIDI
            await this.playMidiFile(midiUrl);
        } catch (error) {
            console.error('Erreur MIDI:', error);
            if (activeBtn) {
                activeBtn.classList.remove('playing');
                activeBtn.textContent = '▶️';
            }
            alert(`Impossible de jouer: ${error.message}`);
        }
    },

    /**
     * Logout
     */
    logout() {
        console.log('👋 Logout');
        document.getElementById('appPage').classList.remove('active');
        document.getElementById('instrumentsVerificationPage').classList.remove('active');
        document.getElementById('customizationOverlay').classList.remove('active');
        document.getElementById('midiSearchOverlay').classList.remove('active');
        document.getElementById('loginPage').classList.add('active');

        document.getElementById('newUsername').value = '';
        UI.newUserInstruments = [];
        UI.customizationInstruments = [];
        UILogin.updateAvailableInstrumentsUI();

        // Réinitialiser les couleurs
        document.documentElement.style.setProperty('--primary', '#ff4758');
        document.documentElement.style.setProperty('--bg-light', '#f8f9fa');

        UI.currentUserId = null;
        UI.currentUserName = null;
        UI.currentUserEmoji = null;
        UI.currentUserColorPrimary = null;
        UI.currentUserColorSecondary = null;
    },

    /**
     * Recherche dans la table
     */
    handleSearch(searchTerm) {
        const rows = document.querySelectorAll('#partitionsTableBody tr');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const title = row.querySelector('td:nth-child(1)')?.textContent.toLowerCase() || '';
            const artist = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
            const user = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';

            const matches = title.includes(term) || artist.includes(term) || user.includes(term);
            row.style.display = matches ? '' : 'none';
        });

        console.log(`🔍 Recherche: "${searchTerm}"`);
    },

    /**
     * Tri des colonnes
     */
    handleSort(columnName) {
        const table = document.getElementById('partitionsTable');
        const tbody = document.getElementById('partitionsTableBody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        // Déterminer l'index de la colonne
        let columnIndex = 0;
        if (columnName === 'title') columnIndex = 0;
        else if (columnName === 'artist') columnIndex = 1;
        else if (columnName === 'user') columnIndex = 2;
        else if (columnName === 'status') columnIndex = 3;

        // Déterminer la direction du tri
        const header = document.querySelector(`th[data-column="${columnName}"]`);
        let isAsc = !header.classList.contains('asc');

        // Réinitialiser tous les headers
        document.querySelectorAll('.partitions-table th.sortable').forEach(th => {
            th.classList.remove('asc', 'desc');
        });

        // Trier les lignes
        rows.sort((a, b) => {
            const textA = a.querySelector(`td:nth-child(${columnIndex + 1})`)?.textContent.trim() || '';
            const textB = b.querySelector(`td:nth-child(${columnIndex + 1})`)?.textContent.trim() || '';

            if (isAsc) {
                return textA.localeCompare(textB, 'fr');
            } else {
                return textB.localeCompare(textA, 'fr');
            }
        });

        // Appliquer le tri dans le DOM
        rows.forEach(row => tbody.appendChild(row));

        // Marquer le header avec la direction
        if (isAsc) {
            header.classList.add('asc');
        } else {
            header.classList.add('desc');
        }

        console.log(`📊 Tri: ${columnName} ${isAsc ? '↑' : '↓'}`);
    }
};

console.log('🎵 UIApp module loaded');
