/**
 * Gestion de l'Interface Principale (App)
 */

const UIApp = {
    // Cache des partitions pour éviter de recharger à chaque changement d'onglet
    partitionsCache: null,
    userStatusesCache: null,  // Cache des statuts de l'utilisateur
    currentFilter: 'all',

    /**
     * Entrer dans l'app
     */
    async enter() {
        console.log('🚀 Entrée dans l\'app...');

        this.applyUserColors();

        // Masquer la customization et afficher l'app
        document.getElementById('customizationOverlay').classList.remove('active');
        document.getElementById('instrumentsVerificationPage').classList.remove('active');
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('appPage').classList.add('active');

        console.log('✅ Page app affichée');

        document.getElementById('currentUser').textContent = UI.currentUserName;

        // Afficher les instruments avec l'emoji de l'user
        const instruments = await SupabaseData.getUserInstruments(UI.currentUserId);
        const userEmoji = UI.currentUserEmoji || '🎵';
        document.getElementById('userInstruments').textContent = instruments.length > 0
            ? userEmoji + ' ' + instruments.join(', ')
            : '';

        console.log('📋 Chargement de la table...');
        // Charger la table
        await this.loadAndRenderTable();
        console.log('✅ UIApp.enter() terminé');

        // Cache de lecture supprimé - pas de logs inutiles

        // Events tabs - filtre rapide!
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.quickFilter(e.target.dataset.filter);  // Filtre super rapide!
            });
        });

        // Events
        document.getElementById('addPartitionBtn').addEventListener('click', () => this.addPartition());
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.partitionsCache = null; // Vider le cache
            this.userStatusesCache = null; // Vider le cache des statuts
            localStorage.removeItem('wemeetmusik_partitions_cache'); // Vider le localStorage
            this.loadAndRenderTable(this.currentFilter);
        });
        document.getElementById('newTitle').addEventListener('input', (e) => this.filterPartitions());
        document.getElementById('newArtist').addEventListener('input', (e) => this.filterPartitions());

        // Event recherche
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Events tri par header
        document.querySelectorAll('.partitions-table th.sortable').forEach(th => {
            th.addEventListener('click', (e) => this.handleSort(e.target.dataset.column));
        });

        // Implémenter le redimensionnement des colonnes
        this.initColumnResize();

        // Initialiser le sélecteur d'utilisateurs
        this.initUserSwitcher();
    },

    /**
     * Initialiser le sélecteur d'utilisateurs (vignettes)
     */
    async initUserSwitcher() {
        const tilesList = document.getElementById('userTilesList');
        if (!tilesList) return;

        // Charger TOUS les utilisateurs (y compris l'utilisateur actuel)
        try {
            const { data: users } = await supabase.from('users').select('*').order('name');
            if (!users) return;

            tilesList.innerHTML = '';

            for (const user of users) {
                // Compter les partitions assignées à cet utilisateur
                const { data: statuses } = await supabase
                    .from('user_partition_statuses')
                    .select('*')
                    .eq('user_id', user.id);

                const assignedCount = statuses ? statuses.length : 0;
                const totalCount = this.partitionsCache ? this.partitionsCache.length : 0;
                const percentage = totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0;

                // Créer la vignette utilisateur
                const tile = document.createElement('div');
                tile.className = `user-tile ${user.id === UI.currentUserId ? 'active' : ''}`;
                tile.style.borderColor = user.color_primary || '#666';
                tile.innerHTML = `
                    <div class="user-tile-emoji">${user.emoji || '🎵'}</div>
                    <div class="user-tile-name" style="color: ${user.color_primary || '#666'};">${user.name}</div>
                    <div class="user-tile-progress">${assignedCount}/${totalCount}</div>
                    <div class="user-tile-bar">
                        <div class="user-tile-bar-fill" style="width: ${percentage}%; background: ${user.color_primary || '#666'};"></div>
                    </div>
                `;

                tile.addEventListener('click', async () => {
                    // Si c'est le même utilisateur, ne rien faire
                    if (user.id === UI.currentUserId) return;

                    console.log(`🔄 Changement d'utilisateur vers ${user.name}...`);

                    // Changer l'utilisateur actuel
                    UI.currentUserId = user.id;
                    UI.currentUserName = user.name;
                    UI.currentUserEmoji = user.emoji || '🎵';
                    UI.currentUserColorPrimary = user.color_primary || '#ff4758';
                    UI.currentUserColorSecondary = user.color_secondary || '#f8f9fa';

                    // Appliquer les couleurs immédiatement
                    this.applyUserColors();

                    // Mettre à jour les vignettes (marquer celle-ci comme active)
                    document.querySelectorAll('.user-tile').forEach(t => t.classList.remove('active'));
                    tile.classList.add('active');

                    // Mettre à jour le header immédiatement
                    document.getElementById('currentUser').textContent = UI.currentUserName;

                    // Charger les instruments du nouvel utilisateur
                    const instruments = await SupabaseData.getUserInstruments(UI.currentUserId);
                    const userEmoji = UI.currentUserEmoji || '🎵';
                    document.getElementById('userInstruments').textContent = instruments.length > 0
                        ? userEmoji + ' ' + instruments.join(', ')
                        : '';

                    // Charger SEULEMENT les statuts du nouvel utilisateur (pas les partitions!)
                    console.log('📥 Chargement des statuts...');
                    this.userStatusesCache = {};
                    const { data: newStatuses } = await supabase
                        .from('user_partition_statuses')
                        .select('partition_id, status')
                        .eq('user_id', UI.currentUserId);

                    if (newStatuses) {
                        newStatuses.forEach(s => {
                            this.userStatusesCache[s.partition_id] = s.status;
                        });
                    }
                    console.log('✅ Statuts chargés');

                    // Réafficher la table avec les nouveaux statuts (très rapide - pas de reload réseau!)
                    console.log('🔄 Rafraîchissement de la table...');
                    await this.quickFilter(this.currentFilter);

                    // Mettre à jour les styles des boutons de statut pour le nouvel utilisateur
                    this.updateStatusButtonsUI();

                    // Recalculer les stats GLOBALES pour le nouvel utilisateur
                    let newTodoCount = 0, newWorkingCount = 0, newSkilledCount = 0;
                    this.partitionsCache?.forEach(p => {
                        const status = this.userStatusesCache?.[p.id];
                        if (status === 'todo') newTodoCount++;
                        else if (status === 'working') newWorkingCount++;
                        else if (status === 'skilled') newSkilledCount++;
                    });
                    this.globalStats = { todo: newTodoCount, working: newWorkingCount, skilled: newSkilledCount };

                    // Mettre à jour le affichage des stats
                    const rows = document.querySelectorAll('#partitionsTableBody tr');
                    let visibleCount = 0;
                    rows.forEach(row => {
                        if (row.style.display !== 'none') {
                            visibleCount++;
                        }
                    });
                    this.updateStats(visibleCount, this.globalStats.todo, this.globalStats.working, this.globalStats.skilled);

                    console.log('✅ Changement d\'utilisateur terminé');

                    this.showActivityToast(`✅ Connecté comme ${user.name}`);
                });

                tilesList.appendChild(tile);
            }
        } catch (error) {
            console.error('❌ Erreur chargement utilisateurs:', error);
        }
    },

    /**
     * Détecter si une couleur hex est foncée
     */
    isDarkColor(hex) {
        const rgb = parseInt(hex.substring(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        return luminance < 128;
    },

    /**
     * Afficher une notification d'activité (toast)
     */
    showActivityToast(message) {
        const toast = document.createElement('div');
        toast.className = 'activity-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Sauvegarder le cache en localStorage
     */
    saveCache() {
        if (this.partitionsCache) {
            try {
                localStorage.setItem('wemeetmusik_partitions_cache', JSON.stringify(this.partitionsCache));
            } catch (e) {
                console.warn('⚠️ Impossible de sauvegarder le cache:', e);
            }
        }
    },

    /**
     * Afficher/Mettre à jour un popup de progression en bas à droite
     */
    showProgressToast(current, total, title) {
        let progressToast = document.getElementById('progress-toast');

        // Si le toast n'existe pas, le créer
        if (!progressToast) {
            progressToast = document.createElement('div');
            progressToast.id = 'progress-toast';
            progressToast.className = 'progress-toast';
            document.body.appendChild(progressToast);
        }

        // Mettre à jour le contenu
        progressToast.innerHTML = `<strong>📥 Chargement ${current}/${total}</strong><br><small>${title}</small>`;
        progressToast.classList.remove('hide');
    },

    /**
     * Afficher/Mettre à jour un toast de statut (sans disparaître)
     */
    showStatusToast(message) {
        let statusToast = document.getElementById('status-toast');

        if (!statusToast) {
            statusToast = document.createElement('div');
            statusToast.id = 'status-toast';
            statusToast.className = 'status-toast';
            document.body.appendChild(statusToast);
        }

        statusToast.textContent = message;
        statusToast.classList.remove('hide');
    },

    /**
     * Masquer le popup de progression
     */
    hideProgressToast() {
        const progressToast = document.getElementById('progress-toast');
        const statusToast = document.getElementById('status-toast');

        if (progressToast) {
            progressToast.classList.add('hide');
            setTimeout(() => progressToast.remove(), 300);
        }
        if (statusToast) {
            statusToast.classList.add('hide');
            setTimeout(() => statusToast.remove(), 300);
        }
    },

    /**
     * Mettre en rouge la date du morceau le plus récent modifié
     */
    updateMostRecentHighlight() {
        document.querySelectorAll('.most-recent-title').forEach(el => {
            el.classList.remove('most-recent-title');
        });

        if (!this.partitionsCache || this.partitionsCache.length === 0) return;

        let mostRecent = this.partitionsCache[0];
        for (const p of this.partitionsCache) {
            const dateRecent = p.lastModifiedDate || new Date(p.created_at || 0);
            const dateCurrent = mostRecent.lastModifiedDate || new Date(mostRecent.created_at || 0);
            if (dateRecent > dateCurrent) {
                mostRecent = p;
            }
        }

        const row = document.querySelector(`tr[data-partition-id="${mostRecent.id}"]`);
        if (row) {
            const dateCell = row.querySelector('td:nth-child(5)');
            if (dateCell) {
                dateCell.classList.add('most-recent-title');
            }
        }
    },

    /**
     * Trier localement et remplacer la row modifiée en haut sans scroller
     */
    async movePartitionToTop(partitionId, message) {
        const partitionIndex = this.partitionsCache.findIndex(p => p.id === partitionId);
        if (partitionIndex === -1) return;

        const partition = this.partitionsCache[partitionIndex];
        partition.lastModifiedDate = new Date();

        this.partitionsCache.splice(partitionIndex, 1);
        this.partitionsCache.unshift(partition);

        const tableZone = document.querySelector('.table-zone');
        const scrollTop = tableZone.scrollTop;

        const oldRow = document.querySelector(`tr[data-partition-id="${partitionId}"]`);
        if (oldRow) {
            oldRow.remove();
        }

        const tbody = document.getElementById('partitionsTableBody');
        const userStatus = this.userStatusesCache?.[partitionId];
        const tr = this.createPartitionRow(partition, userStatus);

        const statuses = await SupabaseData.getPartitionStatuses(partitionId);
        const todoNames = statuses.todo.map(s => s.users?.name || '?').join(', ');
        const workingNames = statuses.working.map(s => s.users?.name || '?').join(', ');
        const skilledNames = statuses.skilled.map(s => s.users?.name || '?').join(', ');

        const trStatuses = tr.querySelectorAll('.status-cell');
        if (trStatuses[0]) {
            trStatuses[0].innerHTML = `🤔 ${todoNames || ''}`;
            trStatuses[0].title = todoNames || 'Personne';
        }
        if (trStatuses[1]) {
            trStatuses[1].innerHTML = `🐫 ${workingNames || ''}`;
            trStatuses[1].title = workingNames || 'Personne';
        }
        if (trStatuses[2]) {
            trStatuses[2].innerHTML = `✅ ${skilledNames || ''}`;
            trStatuses[2].title = skilledNames || 'Personne';
        }

        const now = new Date().toLocaleString('fr-FR');
        const modifiedCell = tr.querySelector('td:nth-child(5)');
        if (modifiedCell) {
            modifiedCell.innerText = now;
        }

        tbody.insertBefore(tr, tbody.firstChild);
        this.attachRowEventListeners(tr);

        tableZone.scrollTop = scrollTop;
        this.updateMostRecentHighlight();
        this.showActivityToast(message);
    },

    /**
     * Initialiser le redimensionnement des colonnes
     */
    initColumnResize() {
        const table = document.getElementById('partitionsTable');
        const thead = table.querySelector('thead');
        const ths = Array.from(thead.querySelectorAll('th'));

        ths.forEach((th, index) => {
            // Créer un séparateur redimensionnable
            const resizer = document.createElement('div');
            resizer.className = 'column-resizer';
            resizer.style.cssText = `
                position: absolute;
                top: 0;
                right: -5px;
                width: 10px;
                height: 100%;
                cursor: col-resize;
                user-select: none;
            `;

            th.style.position = 'relative';
            th.style.userSelect = 'none';
            th.appendChild(resizer);

            const handleResizeStart = (startX) => {
                const startWidth = th.offsetWidth;

                const onMove = (clientX) => {
                    const diff = clientX - startX;
                    const newWidth = Math.max(50, startWidth + diff);
                    th.style.width = newWidth + 'px';
                    th.style.minWidth = newWidth + 'px';
                    th.style.maxWidth = newWidth + 'px';

                    // Aussi mettre à jour les colonnes correspondantes dans le tbody
                    const tbody = table.querySelector('tbody');
                    const trs = tbody.querySelectorAll('tr');
                    trs.forEach(tr => {
                        const tds = Array.from(tr.querySelectorAll('td'));
                        if (tds[index]) {
                            tds[index].style.width = newWidth + 'px';
                            tds[index].style.minWidth = newWidth + 'px';
                            tds[index].style.maxWidth = newWidth + 'px';
                        }
                    });
                };

                const onEnd = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    document.removeEventListener('touchmove', onTouchMove);
                    document.removeEventListener('touchend', onTouchEnd);
                };

                const onMouseMove = (e) => onMove(e.clientX);
                const onMouseUp = () => onEnd();
                const onTouchMove = (e) => onMove(e.touches[0].clientX);
                const onTouchEnd = () => onEnd();

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                document.addEventListener('touchmove', onTouchMove, { passive: false });
                document.addEventListener('touchend', onTouchEnd);
            };

            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                handleResizeStart(e.clientX);
            });

            resizer.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handleResizeStart(e.touches[0].clientX);
            });
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

    },

    /**
     * Charger et afficher la table des partitions
     * Utilise un cache pour éviter de recharger à chaque changement d'onglet
     */
    async loadAndRenderTable(filter = 'all') {
        console.log('📋 Vérification du cache...');
        this.showStatusToast('📋 Vérification du cache...');

        // Si cache existe, afficher immédiatement SANS overlay
        let partitions;
        let fromCache = false;

        // Vérifier le cache en mémoire ET le localStorage
        if (this.partitionsCache) {
            console.log('✅ Cache en mémoire: OUI');
            console.log('📺 Affichage du cache');
            this.showStatusToast('✅ Cache trouvé - Affichage...');
            partitions = this.partitionsCache;
            fromCache = true;
        } else {
            // Essayer le localStorage
            const cachedPartitions = localStorage.getItem('wemeetmusik_partitions_cache');
            if (cachedPartitions) {
                try {
                    partitions = JSON.parse(cachedPartitions);
                    this.partitionsCache = partitions;
                    console.log('✅ Cache localStorage: OUI');
                    console.log('📺 Affichage du cache localStorage');
                    this.showStatusToast('✅ Cache localStorage trouvé - Affichage...');
                    fromCache = true;
                } catch (e) {
                    console.log('❌ Cache localStorage invalide');
                    cachedPartitions = null;
                }
            }

            if (!cachedPartitions) {
                console.log('❌ Aucun cache trouvé');
                this.showStatusToast('❌ Aucun cache - Connexion Supabase...');

                // Premier chargement: afficher l'overlay
                const loadingOverlay = document.getElementById('loadingOverlay');
                const loadingProgress = document.getElementById('loadingProgress');
                const loadingTitle = document.getElementById('loadingTitle');
                if (loadingOverlay) {
                    loadingOverlay.classList.add('active');
                    if (loadingProgress) loadingProgress.textContent = 'Chargement des données...';
                    if (loadingTitle) loadingTitle.textContent = '';
                }
                document.title = 'WeMeetMusik - Chargement...';

                console.log('🌐 Connexion Supabase...');
                this.showStatusToast('🌐 Connexion Supabase...');
                partitions = await SupabaseData.getAllPartitions();
                console.log('✅ Connexion OK');
                this.showStatusToast('✅ Connexion OK - Traitement des données...');
                this.partitionsCache = partitions;

                // Sauvegarder en localStorage
                try {
                    localStorage.setItem('wemeetmusik_partitions_cache', JSON.stringify(partitions));
                    console.log('💾 Cache sauvegardé en localStorage');
                    this.showStatusToast('💾 Cache sauvegardé...');
                } catch (e) {
                    console.warn('⚠️ Impossible de sauvegarder le cache:', e);
                }

                if (loadingOverlay) {
                    loadingOverlay.classList.remove('active');
                }
            }
        }
        const tbody = document.getElementById('partitionsTableBody');

        tbody.innerHTML = '';

        // Stocker partitions pour le filtrage
        UIApp.allPartitions = partitions;
        UIApp.currentFilter = filter;

        // Enrichir les partitions avec la date de dernière modification
        for (const partition of partitions) {
            const statuses = await SupabaseData.getPartitionStatuses(partition.id);
            const allStatuses = [...statuses.working, ...statuses.todo, ...statuses.skilled];

            if (allStatuses.length > 0) {
                try {
                    const dates = allStatuses
                        .map(s => s.updated_at ? new Date(s.updated_at) : null)
                        .filter(d => d && !isNaN(d));
                    if (dates.length > 0) {
                        partition.lastModifiedDate = new Date(Math.max(...dates));
                    } else {
                        partition.lastModifiedDate = new Date(partition.created_at || 0);
                    }
                } catch (e) {
                    partition.lastModifiedDate = new Date(partition.created_at || 0);
                }
            } else {
                partition.lastModifiedDate = new Date(partition.created_at || 0);
            }
        }

        // Trier par date de dernière modification décroissante (par défaut)
        partitions.sort((a, b) => {
            const dateA = a.lastModifiedDate || new Date(a.created_at || 0);
            const dateB = b.lastModifiedDate || new Date(b.created_at || 0);
            return dateB - dateA;
        });

        // Charger les statuts de l'utilisateur (une seule fois, puis en cache)
        if (!this.userStatusesCache) {
            this.userStatusesCache = {};
            const { data: statuses, error } = await supabase
                .from('user_partition_statuses')
                .select('partition_id, status')
                .eq('user_id', UI.currentUserId);

            if (!error && statuses) {
                statuses.forEach(s => {
                    this.userStatusesCache[s.partition_id] = s.status;
                });
            }
        }

        // Calculer les stats GLOBALES (tous les morceaux)
        let globalTodoCount = 0, globalWorkingCount = 0, globalSkilledCount = 0;
        partitions.forEach(p => {
            const status = this.userStatusesCache?.[p.id];
            if (status === 'todo') globalTodoCount++;
            else if (status === 'working') globalWorkingCount++;
            else if (status === 'skilled') globalSkilledCount++;
        });
        this.globalStats = { todo: globalTodoCount, working: globalWorkingCount, skilled: globalSkilledCount };

        // Filtrer les partitions selon le statut de l'user
        let filteredPartitions = partitions;

        if (filter !== 'all') {
            filteredPartitions = partitions.filter(partition =>
                this.userStatusesCache[partition.id] === filter
            );
        }

        // Masquer le status-toast
        const statusToast = document.getElementById('status-toast');
        if (statusToast) {
            statusToast.classList.add('hide');
            setTimeout(() => statusToast.remove(), 300);
        }

        // Si on vient du cache, afficher IMMÉDIATEMENT sans attendre les détails
        if (fromCache) {
            // Afficher le tableau TOUT DE SUITE
            for (const partition of filteredPartitions) {
                const userStatus = this.userStatusesCache?.[partition.id];
                const tr = this.createPartitionRow(partition, userStatus);
                tbody.appendChild(tr);
            }

            // Mettre à jour le compteur et les stats
            const counterElement = document.getElementById('partitionsCounter');
            if (counterElement) {
                counterElement.textContent = filteredPartitions.length;
            }
            this.updateStats(filteredPartitions.length, this.globalStats.todo, this.globalStats.working, this.globalStats.skilled);
            this.updateMostRecentHighlight();

            // Highlight tri par défaut
            const modifiedHeader = document.querySelector('th[data-column="modified"]');
            if (modifiedHeader && !modifiedHeader.classList.contains('desc')) {
                document.querySelectorAll('.partitions-table th.sortable').forEach(th => {
                    th.classList.remove('asc', 'desc');
                });
                modifiedHeader.classList.add('desc');
                document.querySelectorAll('tbody tr td:nth-child(5)').forEach(td => {
                    td.classList.add('sorted-column');
                });
            }

            // Events listeners
            console.log(`📊 Affichage de ${filteredPartitions.length} morceaux`);
            document.querySelectorAll('#partitionsTableBody tr').forEach(row => {
                this.attachRowEventListeners(row);
            });
            console.log('✅ App prête!');
            this.hideProgressToast();
            this.showActivityToast('✅ App chargée');

            document.title = 'WeMeetMusik';

            // Charger les détails EN ARRIÈRE-PLAN et mettre à jour le tableau
            (async () => {
                for (const partition of partitions) {
                    const statuses = await SupabaseData.getPartitionStatuses(partition.id);
                    const row = document.querySelector(`tr[data-partition-id="${partition.id}"]`);
                    if (row) {
                        // Mettre à jour les noms des personnes
                        const trStatuses = row.querySelectorAll('.status-cell');
                        if (trStatuses[0]) {
                            const todoNames = statuses.todo.map(s => s.users?.name || '?').join(', ');
                            trStatuses[0].innerHTML = `🤔 ${todoNames || ''}`;
                            trStatuses[0].title = todoNames || 'Personne';
                        }
                        if (trStatuses[1]) {
                            const workingNames = statuses.working.map(s => s.users?.name || '?').join(', ');
                            trStatuses[1].innerHTML = `🐫 ${workingNames || ''}`;
                            trStatuses[1].title = workingNames || 'Personne';
                        }
                        if (trStatuses[2]) {
                            const skilledNames = statuses.skilled.map(s => s.users?.name || '?').join(', ');
                            trStatuses[2].innerHTML = `✅ ${skilledNames || ''}`;
                            trStatuses[2].title = skilledNames || 'Personne';
                        }

                        // Mettre à jour la date de "Modifié le"
                        const allStatuses = [...statuses.working, ...statuses.todo, ...statuses.skilled];
                        let lastModified = '';
                        if (allStatuses.length > 0) {
                            try {
                                const dates = allStatuses
                                    .map(s => s.updated_at ? new Date(s.updated_at) : null)
                                    .filter(d => d && !isNaN(d));
                                if (dates.length > 0) {
                                    const maxDate = new Date(Math.max(...dates));
                                    lastModified = maxDate.toLocaleString('fr-FR', {
                                        year: 'numeric', month: '2-digit', day: '2-digit',
                                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                                    });
                                }
                            } catch (e) {
                                // Ignore errors
                            }
                        } else {
                            // Si pas de statuts, utiliser la date de création
                            if (partition.created_at) {
                                const createdDate = new Date(partition.created_at);
                                lastModified = createdDate.toLocaleString('fr-FR', {
                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                                });
                            }
                        }

                        if (lastModified) {
                            const modifiedCell = row.querySelector('td:nth-child(5)');
                            if (modifiedCell) {
                                modifiedCell.innerText = lastModified;
                            }
                        }
                    }
                }
            })();
            return; // Quitter - on charge les détails en arrière-plan mais l'UI est prête
        }

        // BOUCLE: Charger les détails pour TOUTES les partitions (si PAS de cache)
        const partitionDetailsCache = {};
        for (let i = 0; i < partitions.length; i++) {
            const partition = partitions[i];

            // Mettre à jour la progression
            const loadingProgress = document.getElementById('loadingProgress');
            const loadingTitle = document.getElementById('loadingTitle');
            if (loadingProgress) {
                loadingProgress.textContent = `Chargement: ${i + 1}/${partitions.length}`;
            }
            if (loadingTitle) {
                loadingTitle.textContent = `${partition.artist} - ${partition.title}`;
            }

            // Toast de progression
            this.showProgressToast(i + 1, partitions.length, `${partition.artist} - ${partition.title}`);

            const statuses = await SupabaseData.getPartitionStatuses(partition.id);
            const userStatus = await SupabaseData.getUserPartitionStatus(UI.currentUserId, partition.id);

            // Mettre en cache les détails
            partitionDetailsCache[partition.id] = {
                statuses,
                userStatus,
                todoNames: statuses.todo.map(s => s.users?.name || '?').join(', '),
                workingNames: statuses.working.map(s => s.users?.name || '?').join(', '),
                skilledNames: statuses.skilled.map(s => s.users?.name || '?').join(', ')
            };

            // Date de dernière modification
            const allStatuses = [...statuses.working, ...statuses.todo, ...statuses.skilled];
            let lastModified = '';
            if (allStatuses.length > 0) {
                try {
                    const dates = allStatuses
                        .map(s => s.updated_at ? new Date(s.updated_at) : null)
                        .filter(d => d && !isNaN(d));
                    if (dates.length > 0) {
                        const maxDate = new Date(Math.max(...dates));
                        lastModified = maxDate.toLocaleString('fr-FR', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                        });
                    }
                } catch (e) {
                    console.warn('⚠️ Could not parse updated_at dates:', e);
                    lastModified = '';
                }
            }
            partitionDetailsCache[partition.id].lastModified = lastModified;
        }

        // Afficher les partitions avec détails
        for (const partition of filteredPartitions) {
            const details = partitionDetailsCache[partition.id];
            const userStatus = details?.userStatus;

            const tr = this.createPartitionRow(partition, userStatus);

            if (details) {
                const trStatuses = tr.querySelectorAll('.status-cell');
                if (trStatuses[0]) {
                    trStatuses[0].innerHTML = `🤔 ${details.todoNames || ''}`;
                    trStatuses[0].title = details.todoNames || 'Personne';
                }
                if (trStatuses[1]) {
                    trStatuses[1].innerHTML = `🐫 ${details.workingNames || ''}`;
                    trStatuses[1].title = details.workingNames || 'Personne';
                }
                if (trStatuses[2]) {
                    trStatuses[2].innerHTML = `✅ ${details.skilledNames || ''}`;
                    trStatuses[2].title = details.skilledNames || 'Personne';
                }

                const modifiedCell = tr.querySelector('td:nth-child(5)');
                if (modifiedCell && details.lastModified) {
                    modifiedCell.innerText = details.lastModified;
                }
            }

            tbody.appendChild(tr);

            // Si on a trop attendu, afficher et continuer en arrière-plan
            if (shouldLoadDetailsAsync && displayedCount >= 50) {
                break;
            }
        }

        // Mettre à jour le compteur et les stats GLOBALES (pas filtrées)
        const counterElement = document.getElementById('partitionsCounter');
        if (counterElement) {
            counterElement.textContent = filteredPartitions.length;
        }

        // Afficher les stats GLOBALES peu importe le filtre actuel
        this.updateStats(filteredPartitions.length, this.globalStats.todo, this.globalStats.working, this.globalStats.skilled);

        // Mettre en rouge la date du morceau le plus récent modifié
        this.updateMostRecentHighlight();

        // Appliquer l'highlight de tri par défaut (Modifié le en décroissant)
        const modifiedHeader = document.querySelector('th[data-column="modified"]');
        if (modifiedHeader && !modifiedHeader.classList.contains('desc')) {
            document.querySelectorAll('.partitions-table th.sortable').forEach(th => {
                th.classList.remove('asc', 'desc');
            });
            modifiedHeader.classList.add('desc');
            // Highlighter la colonne triée
            document.querySelectorAll('tbody tr td:nth-child(5)').forEach(td => {
                td.classList.add('sorted-column');
            });
        }

        // Attacher les event listeners pour toutes les nouvelles rows
        console.log(`📊 Affichage de ${filteredPartitions.length} morceaux`);
        document.querySelectorAll('#partitionsTableBody tr').forEach(row => {
            this.attachRowEventListeners(row);
        });
        console.log('✅ App prête!');

        // Masquer le popup de progression et afficher le toast final
        this.hideProgressToast();
        this.showActivityToast('✅ App chargée');

        // Events pour l'overlay de recherche MIDI (une seule fois)
        if (!document.getElementById('closeMidiSearchBtn')._midiHandlersAttached) {
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

            document.getElementById('midiSearchOverlay').addEventListener('click', (e) => {
                if (e.target.id === 'midiSearchOverlay') {
                    document.getElementById('midiSearchOverlay').classList.remove('active');
                }
            });

            document.getElementById('closeMidiSearchBtn')._midiHandlersAttached = true;
        }

        // Mettre à jour le titre
        document.title = 'WeMeetMusik';

        // Synchroniser les données en arrière-plan si cache était utilisé
        if (fromCache) {
            console.log('🔄 Synchro depuis le serveur...');
            (async () => {
                try {
                    const newPartitions = await SupabaseData.getAllPartitions();
                    this.partitionsCache = newPartitions;
                    this.saveCache(); // Sauvegarder le cache après synchro
                    console.log('✅ Synchro terminée');
                    this.showActivityToast('📡 Synchro depuis le serveur');
                } catch (error) {
                    console.error('❌ Erreur synchro:', error);
                }
            })();
        } else {
            // Si pas de cache, sauvegarder les nouvelles données
            this.saveCache();
        }
    },

    /**
     * Ajouter une partition (optimistic update)
     */
    async addPartition() {
        const title = document.getElementById('newTitle').value.trim();
        const artist = document.getElementById('newArtist').value.trim();

        if (!title || !artist) {
            alert('Remplis Titre et Artiste');
            return;
        }

        // Créer une partition "optimiste" localement avec ID temporaire
        const tempId = 'temp_' + Date.now();
        const optimisticPartition = {
            id: tempId,
            title,
            artist,
            user_id: UI.currentUserId,
            status: 'Partition Manquante',
            created_at: new Date().toISOString(),
            nom_fichier: null,
            users: {
                name: UI.currentUserName,
                emoji: UI.currentUserEmoji,
                color_primary: UI.currentUserColorPrimary
            }
        };

        // Ajouter au cache localement (en premier)
        if (this.partitionsCache) {
            this.partitionsCache.unshift(optimisticPartition);
        }

        // Mettre à jour les stats globales
        if (this.globalStats) {
            // La nouvelle partition n'a pas de statut utilisateur, donc pas compter dans stats
        }

        // Créer et ajouter la row au DOM (en premier)
        const tbody = document.getElementById('partitionsTableBody');
        const tr = this.createPartitionRow(optimisticPartition, null);
        tbody.insertBefore(tr, tbody.firstChild);

        // Attacher les event listeners pour cette nouvelle row
        this.attachRowEventListeners(tr);

        // Mettre à jour le compteur
        const counterElement = document.getElementById('partitionsCounter');
        if (counterElement) {
            counterElement.textContent = parseInt(counterElement.textContent) + 1;
        }

        // Vider les inputs tout de suite
        document.getElementById('newTitle').value = '';
        document.getElementById('newArtist').value = '';
        document.getElementById('suggestions').innerHTML = '';

        // Envoyer à Supabase EN ARRIÈRE-PLAN (sans await, sans bloquer l'UI)
        (async () => {
            try {
                const result = await SupabaseData.addPartition(title, artist, UI.currentUserId);

                if (result && result.id) {
                    // Remplacer l'ID temporaire par l'ID réel dans le cache
                    const cacheIndex = this.partitionsCache.findIndex(p => p.id === tempId);
                    if (cacheIndex !== -1) {
                        this.partitionsCache[cacheIndex].id = result.id;
                        this.saveCache(); // Sauvegarder le cache
                        const realId = result.id;

                        // Remplacer l'ID temporaire dans le DOM
                        const tempRow = document.querySelector(`tr[data-partition-id="${tempId}"]`);
                        if (tempRow) {
                            tempRow.setAttribute('data-partition-id', realId);
                        }

                        // Réarranger et afficher toast
                        await UIApp.movePartitionToTop(realId, `✅ Chanson ajoutée: "${title}"`);
                    }
                }
            } catch (error) {
                // Si erreur, enlever du DOM et du cache
                const tempRow = document.querySelector(`tr[data-partition-id="${tempId}"]`);
                if (tempRow) tempRow.remove();

                if (this.partitionsCache) {
                    this.partitionsCache = this.partitionsCache.filter(p => p.id !== tempId);
                }

                // Mettre à jour le compteur
                const counterElement = document.getElementById('partitionsCounter');
                if (counterElement) {
                    counterElement.textContent = Math.max(0, parseInt(counterElement.textContent) - 1);
                }

                alert('Erreur lors de l\'ajout: ' + error.message);
            }
        })();
    },

    /**
     * Attacher les event listeners pour une row (helper pour optimistic update)
     */
    attachRowEventListeners(row) {
        const partitionId = row.dataset.partitionId;

        // Event listeners pour les inputs de fichier
        row.querySelectorAll('.table-input').forEach(input => {
            input.addEventListener('blur', async (e) => {
                const partitionId = e.target.dataset.partitionId;
                const field = e.target.dataset.field;
                const value = e.target.value;

                if (value) {
                    try {
                        await SupabaseData.updatePartitionField(partitionId, field, value);
                    } catch (error) {
                        alert(`Erreur: ${error.message}`);
                    }
                }
            });

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.target.blur();
                }
            });
        });

        // Event listeners pour les boutons upload
        row.querySelectorAll('.btn-upload').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                alert('Feature viewer de partition à venir!');
            });
        });

        // Event listeners pour les liens Youtube
        row.querySelectorAll('.btn-youtube').forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();

                const titleCell = row.querySelector('td:nth-child(2)');
                const artistCell = row.querySelector('td:nth-child(3)');

                const title = titleCell ? titleCell.textContent.trim() : '';
                const artist = artistCell ? artistCell.textContent.trim() : '';

                if (!title || title === '') {
                    alert('Titre manquant');
                    return;
                }

                const query = `${title} ${artist}`.trim();
                const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

                window.open(youtubeSearchUrl, '_blank', 'width=1200,height=800');
            });
        });

        // Event listeners pour les boutons supprimer
        row.querySelectorAll('.btn-delete-row').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const partitionId = e.target.dataset.partitionId;
                const title = e.target.dataset.title;

                const overlay = document.getElementById('deleteConfirmOverlay');
                document.getElementById('deleteConfirmText').innerHTML = `Vous allez supprimer <strong>${title}</strong>`;

                overlay.classList.add('active');

                document.getElementById('deleteConfirmBtn').onclick = async () => {
                    try {
                        const row = document.querySelector(`tr[data-partition-id="${partitionId}"]`);
                        if (row) {
                            row.remove();
                        }

                        overlay.classList.remove('active');

                        // Supprimer sur Supabase en arrière-plan (optimistic)
                        (async () => {
                            try {
                                await SupabaseData.deletePartition(partitionId);

                                // Mettre à jour le compteur
                                const counterElement = document.getElementById('partitionsCounter');
                                if (counterElement) {
                                    counterElement.textContent = Math.max(0, parseInt(counterElement.textContent) - 1);
                                }
                            } catch (error) {
                                alert(`Erreur: ${error.message}`);
                                await UIApp.loadAndRenderTable(UIApp.currentFilter || 'all');
                            }
                        })();
                    } catch (error) {
                        overlay.classList.remove('active');
                    }
                };

                document.getElementById('deleteCancelBtn').onclick = () => {
                    overlay.classList.remove('active');
                };
            });
        });

        // Double-click pour éditer les cellules
        row.querySelectorAll('td').forEach(cell => {
            cell.addEventListener('dblclick', async function(e) {
                if (e.target.tagName === 'STRONG' || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

                const row = this.closest('tr');
                const partitionId = row.dataset.partitionId;
                const columnIndex = Array.from(this.parentNode.children).indexOf(this);

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
                    const newValue = input.value.trim();
                    if (newValue === text) {
                        if (columnIndex === 1) {
                            this.innerHTML = `<strong>${text}</strong>`;
                        } else {
                            this.innerText = text;
                        }
                        return;
                    }

                    if (columnIndex === 1) {
                        this.innerHTML = `<strong>${newValue || text}</strong>`;
                    } else {
                        this.innerText = newValue || text;
                    }

                    try {
                        let fieldToUpdate = null;
                        if (columnIndex === 1) fieldToUpdate = 'title';
                        else if (columnIndex === 2) fieldToUpdate = 'artist';
                        else if (columnIndex === 5) fieldToUpdate = 'file_url';

                        if (fieldToUpdate && newValue !== text) {
                            // Faire l'update en arrière-plan
                            (async () => {
                                try {
                                    await SupabaseData.updatePartitionField(partitionId, fieldToUpdate, newValue);
                                    // Réarranger après update
                                    const fieldName = fieldToUpdate === 'title' ? 'Titre' : fieldToUpdate === 'artist' ? 'Artiste' : 'Fichier';
                                    await UIApp.movePartitionToTop(partitionId, `✏️ ${fieldName} modifié`);
                                } catch (error) {
                                    alert(`Erreur: ${error.message}`);
                                    this.innerText = text;
                                }
                            })();

                            // Mettre à jour "Modifié le" immédiatement
                            const now = new Date().toLocaleString('fr-FR');
                            const modifiedCell = row.querySelector(`td:nth-child(5)`);
                            if (modifiedCell) {
                                modifiedCell.innerText = now;
                            }
                        }
                    } catch (error) {
                        alert(`Erreur: ${error.message}`);
                        this.innerText = text;
                    }
                };

                input.addEventListener('blur', save);
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') input.blur();
                });
            });
        });
    },

    /**
     * Mettre à jour les styles des boutons de statut pour l'utilisateur actuel
     */
    updateStatusButtonsUI() {
        const rows = document.querySelectorAll('#partitionsTableBody tr');
        rows.forEach(row => {
            const partitionId = row.getAttribute('data-partition-id');
            const userStatus = this.userStatusesCache?.[partitionId];

            // Mettre à jour les classes active pour les 3 boutons de statut
            const statusCells = row.querySelectorAll('.status-cell');
            if (statusCells[0]) {
                statusCells[0].classList.toggle('active', userStatus === 'todo');
            }
            if (statusCells[1]) {
                statusCells[1].classList.toggle('active', userStatus === 'working');
            }
            if (statusCells[2]) {
                statusCells[2].classList.toggle('active', userStatus === 'skilled');
            }
        });
    },

    /**
     * Créer une ligne de partition (helper pour réutilisation)
     */
    createPartitionRow(partition, userStatus) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-partition-id', partition.id);

        const workingCount = 0;
        const todoCount = 0;
        const skilledCount = 0;

        const workingNames = '';
        const todoNames = '';
        const skilledNames = '';

        const nomFichier = partition.nom_fichier || '';
        const uploadBtn = `<button class="btn-upload" data-partition-id="${partition.id}" title="Ouvrir la Partition">🎼</button>`;
        const youtubeLink = `<a href="#" class="btn-youtube" data-partition-id="${partition.id}" style="color: var(--primary); text-decoration: none; font-weight: 600; cursor: pointer;">Youtube</a>`;
        const fichierDisplay = `<div style="display: flex; gap: 6px; align-items: center; justify-content: flex-start;">${youtubeLink} ${uploadBtn} <input type="text" value="${nomFichier}" class="table-input" data-partition-id="${partition.id}" data-field="nom_fichier" placeholder="..." style="flex: 1; max-width: 100px;"></div>`;

        const userEmoji = partition.users?.emoji || '🎵';
        const userColor = partition.users?.color_primary || '#666';
        const userName = partition.users?.name || 'Inconnu';

        const lastModified = '';

        tr.innerHTML = `
            <td style="color: ${userColor}; font-weight: 600;">${userEmoji} ${userName}</td>
            <td><strong>${partition.title}</strong></td>
            <td>${partition.artist}</td>
            <td>${partition.status}</td>
            <td style="font-size: 0.85em; color: #666;">${lastModified}</td>
            <td>${fichierDisplay}</td>
            <td class="status-cell ${userStatus === 'todo' ? 'active' : ''}" onclick="UIApp.setStatus(${partition.id}, 'todo')" title="${todoNames || 'Personne'}">
                🤔 ${todoNames || ''}
            </td>
            <td class="status-cell ${userStatus === 'working' ? 'active' : ''}" onclick="UIApp.setStatus(${partition.id}, 'working')" title="${workingNames || 'Personne'}">
                🐫 ${workingNames || ''}
            </td>
            <td class="status-cell ${userStatus === 'skilled' ? 'active' : ''}" onclick="UIApp.setStatus(${partition.id}, 'skilled')" title="${skilledNames || 'Personne'}">
                ✅ ${skilledNames || ''}
            </td>
            <td style="text-align: center;">
                <button class="btn-delete-row" data-partition-id="${partition.id}" data-title="${partition.title}" style="background: none; border: none; cursor: pointer; font-size: 1.2em; color: #999; padding: 0;">✕</button>
            </td>
        `;

        return tr;
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
            } else {
                // Statut différent = forcer directement le nouveau statut
                // Si un ancien statut existe, il sera remplacé
                await SupabaseData.setUserPartitionStatus(UI.currentUserId, partitionId, status);
            }

            // Mettre à jour le cache des statuts après changement (au lieu de l'invalider)
            const newStatus = currentStatus === status ? null : status;
            if (newStatus) {
                this.userStatusesCache[partitionId] = newStatus;
            } else {
                delete this.userStatusesCache[partitionId];
            }

            // Mettre à jour uniquement la ligne concernée
            await this.updateStatusCells(partitionId);

            // Réarranger et afficher toast avec le titre
            const row = document.querySelector(`tr[data-partition-id="${partitionId}"]`);
            const titleCell = row?.querySelector('td:nth-child(2)');
            const title = titleCell ? titleCell.textContent.trim() : 'Morceau';
            const statusLabel = status === 'todo' ? '🤔 Todo' : status === 'working' ? '🐫 En cours' : '✅ Maîtrisé';
            await this.movePartitionToTop(partitionId, `${statusLabel} assigné: "${title}"`);
        } catch (error) {
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

            // Affichage des noms pour le tooltip
            const workingNames = statuses.working.map(s => s.users?.name || '?').join(', ');
            const todoNames = statuses.todo.map(s => s.users?.name || '?').join(', ');
            const skilledNames = statuses.skilled.map(s => s.users?.name || '?').join(', ');

            // Trouver la ligne dans la table
            const row = document.querySelector(`tr[data-partition-id="${partitionId}"]`);
            if (!row) return;

            // Mettre à jour les cellules de status (ordre: todo, working, skilled)
            const cells = row.querySelectorAll('.status-cell');

            if (cells[0]) {
                cells[0].className = `status-cell ${userStatus === 'todo' ? 'active' : ''}`;
                cells[0].innerHTML = `🤔 ${todoNames || ''}`;
                cells[0].onclick = () => UIApp.setStatus(partitionId, 'todo');
                cells[0].title = todoNames || 'Personne';
            }

            if (cells[1]) {
                cells[1].className = `status-cell ${userStatus === 'working' ? 'active' : ''}`;
                cells[1].innerHTML = `🐫 ${workingNames || ''}`;
                cells[1].onclick = () => UIApp.setStatus(partitionId, 'working');
                cells[1].title = workingNames || 'Personne';
            }

            if (cells[2]) {
                cells[2].className = `status-cell ${userStatus === 'skilled' ? 'active' : ''}`;
                cells[2].innerHTML = `✅ ${skilledNames || ''}`;
                cells[2].onclick = () => UIApp.setStatus(partitionId, 'skilled');
                cells[2].title = skilledNames || 'Personne';
            }

        } catch (error) {
            console.error('❌ Error updating status cells:', error);
        }
    },

    /**
     * Afficher les suggestions
     */
    filterPartitions() {
        const titleQuery = document.getElementById('newTitle').value.toLowerCase();
        const artistQuery = document.getElementById('newArtist').value.toLowerCase();

        // Filtrer le tableau pour montrer les partitions correspondantes
        const rows = document.querySelectorAll('#partitionsTableBody tr');
        let visibleCount = 0;

        rows.forEach(row => {
            const title = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
            const artist = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';

            // Afficher si le titre ET artiste correspondent
            const matches = (titleQuery === '' || title.includes(titleQuery)) &&
                           (artistQuery === '' || artist.includes(artistQuery));

            if (matches) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        // Mettre à jour le compteur et les stats GLOBALES (pas filtrées)
        const counterElement = document.getElementById('partitionsCounter');
        if (counterElement) {
            counterElement.textContent = visibleCount;
        }

        // Afficher les stats GLOBALES peu importe le filtre actuel
        this.updateStats(visibleCount, this.globalStats.todo, this.globalStats.working, this.globalStats.skilled);

        // Afficher les suggestions si titre saisi
        if (titleQuery.length >= 2) {
            const matchingPartitions = this.partitionsCache?.filter(p =>
                p.title.toLowerCase().includes(titleQuery)
            ) || [];

            const suggestionsDiv = document.getElementById('suggestions');
            const suggestions = matchingPartitions.slice(0, 5);

            if (suggestions.length > 0) {
                suggestionsDiv.innerHTML = suggestions
                    .map(p => `
                        <div class="suggestion-item" onclick="UIApp.selectSuggestion('${p.title.replaceAll("'", "\\'")}')">
                            <strong>${p.title}</strong> - ${p.artist}
                        </div>
                    `)
                    .join('');
            } else {
                suggestionsDiv.innerHTML = '';
            }
        } else {
            document.getElementById('suggestions').innerHTML = '';
        }
    },

    /**
     * Mettre à jour les stats (compteur et graphique)
     */
    updateStats(visibleCount, todoCount, workingCount, skilledCount) {
        const counterElement = document.getElementById('partitionsCounter');
        if (counterElement) {
            counterElement.textContent = visibleCount;
        }

        // Créer le graphique en barres horizontales
        const chart = document.getElementById('statsChart');
        if (chart && visibleCount > 0) {
            const total = todoCount + workingCount + skilledCount;
            const todoPercent = (todoCount / total) * 100;
            const workingPercent = (workingCount / total) * 100;
            const skilledPercent = (skilledCount / total) * 100;

            chart.innerHTML = `
                <div style="display: flex; gap: 2px; border-radius: 4px; overflow: hidden; width: 200px; height: 100%; background: #eee;">
                    ${todoCount > 0 ? `<div style="width: ${todoPercent}%; background: #ff9800; title: 'Todo: ${todoCount}';"></div>` : ''}
                    ${workingCount > 0 ? `<div style="width: ${workingPercent}%; background: #f44336; title: 'En cours: ${workingCount}';"></div>` : ''}
                    ${skilledCount > 0 ? `<div style="width: ${skilledPercent}%; background: #4caf50; title: 'Maîtrisé: ${skilledCount}';"></div>` : ''}
                </div>
                <span style="font-size: 0.85em; color: #666; margin-left: 8px;">${todoCount}|${workingCount}|${skilledCount}</span>
            `;
        } else {
            chart.innerHTML = '';
        }
    },

    /**
     * Sélectionner une suggestion (ancien code)
     */
    selectSuggestion(title) {
        document.getElementById('newTitle').value = title;
        document.getElementById('suggestions').innerHTML = '';
        document.getElementById('newArtist').focus();
        this.filterPartitions();
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

        // Masquer TOUTES les pages sauf la login
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById('loginPage').classList.add('active');

        // Masquer les overlays
        document.getElementById('customizationOverlay').classList.remove('active');
        document.getElementById('midiSearchOverlay').classList.remove('active');
        document.getElementById('instrumentsVerificationPage').classList.remove('active');
        document.getElementById('loadingOverlay').classList.remove('active');
        document.getElementById('deleteConfirmOverlay').classList.remove('active');

        // Vider complètement le cache et l'état
        this.partitionsCache = null;
        this.userStatusesCache = null;
        this.globalStats = null;
        this.allPartitions = [];
        this.currentFilter = 'all';

        // Vider la table
        const tbody = document.getElementById('partitionsTableBody');
        if (tbody) tbody.innerHTML = '';

        // Vider les formulaires
        document.getElementById('newUsername').value = '';
        document.getElementById('newTitle').value = '';
        document.getElementById('newArtist').value = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('suggestions').innerHTML = '';

        UI.newUserInstruments = [];
        UI.customizationInstruments = [];

        try {
            UILogin.updateAvailableInstrumentsUI();
        } catch (e) {
            // Silencieusement ignorer si la fonction n'est pas disponible
        }

        // Réinitialiser les couleurs
        document.documentElement.style.setProperty('--primary', '#ff4758');
        document.documentElement.style.setProperty('--bg-light', '#f8f9fa');

        // Réinitialiser l'état utilisateur
        UI.currentUserId = null;
        UI.currentUserName = null;
        UI.currentUserEmoji = null;
        UI.currentUserColorPrimary = null;
        UI.currentUserColorSecondary = null;

        // Réinitialiser les onglets
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const firstTab = document.querySelector('.tab-btn[data-filter="all"]');
        if (firstTab) firstTab.classList.add('active');

        // Forcer le scroll vers le haut
        window.scrollTo(0, 0);
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

    },

    /**
     * Tri des colonnes
     */
    handleSort(columnName) {
        const table = document.getElementById('partitionsTable');
        const tbody = document.getElementById('partitionsTableBody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        // Déterminer l'index de la colonne (ordre: User, Title, Artist, Status, Modified)
        let columnIndex = 0;
        if (columnName === 'user') columnIndex = 0;
        else if (columnName === 'title') columnIndex = 1;
        else if (columnName === 'artist') columnIndex = 2;
        else if (columnName === 'status') columnIndex = 3;
        else if (columnName === 'modified') columnIndex = 4;

        // Déterminer la direction du tri
        const header = document.querySelector(`th[data-column="${columnName}"]`);
        let isAsc = !header.classList.contains('asc');

        // Réinitialiser tous les headers et colonnes
        document.querySelectorAll('.partitions-table th.sortable').forEach(th => {
            th.classList.remove('asc', 'desc');
        });
        document.querySelectorAll('.partitions-table td').forEach(td => {
            td.classList.remove('sorted-column');
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

        // Highlighter la colonne triée
        document.querySelectorAll(`tbody tr td:nth-child(${columnIndex + 1})`).forEach(td => {
            td.classList.add('sorted-column');
        });

    },

    /**
     * Filtre ULTRA-RAPIDE des partitions (réutilise le DOM, pas de recharge!)
     */
    quickFilter(filter = 'all') {
        this.currentFilter = filter;

        // Si le cache n'existe pas, utiliser les données du DOM
        const rows = document.querySelectorAll('#partitionsTableBody tr');
        let visibleCount = 0;

        rows.forEach(row => {
            const partitionId = row.dataset.partitionId;
            const userStatus = this.userStatusesCache?.[partitionId];

            // Afficher/cacher selon le filtre
            if (filter === 'all' || userStatus === filter) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        // Mettre à jour le compteur et les stats GLOBALES (pas filtrées)
        const counterElement = document.getElementById('partitionsCounter');
        if (counterElement) {
            counterElement.textContent = visibleCount;
        }

        // Afficher les stats GLOBALES peu importe le filtre actuel
        this.updateStats(visibleCount, this.globalStats.todo, this.globalStats.working, this.globalStats.skilled);
    }
};

console.log('🎵 UIApp module loaded');
