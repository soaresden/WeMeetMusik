/**
 * Gestion de l'interface utilisateur - Table Layout (Refactorised)
 * Pas de credentials MEGA - Utilise dossier partagé
 */

const UI = {
    currentUserId: null,
    currentUserName: null,
    selectedPartitionId: null,

    // Initialiser les événements du login
    async initLoginPage() {
        console.log('🚀 Initializing login page...');

        await this.populateUserSelect();
        console.log('✅ Users loaded');

        document.getElementById('registerBtn').addEventListener('click', () => {
            this.register();
        });

        document.getElementById('newUsername').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.register();
            }
        });

        console.log('✅ Login page initialized');
    },

    // Remplir les vignettes des utilisateurs
    async populateUserSelect() {
        console.log('📥 Populating user tiles...');
        const container = document.getElementById('usersList');

        try {
            // Récupérer les utilisateurs depuis Supabase
            const { data: users, error } = await supabase
                .from('users')
                .select('id, name');

            if (error) throw error;

            container.innerHTML = '';

            if (users && users.length > 0) {
                users.forEach(user => {
                    const tile = document.createElement('div');
                    tile.className = 'user-tile';
                    tile.innerHTML = `
                        <div class="user-tile-icon">👤</div>
                        <div class="user-tile-name">${user.name}</div>
                    `;

                    tile.addEventListener('click', () => {
                        this.currentUserName = user.name;
                        this.currentUserId = user.id;
                        this.login();
                    });

                    container.appendChild(tile);
                });
                console.log(`✅ User tiles populated with ${users.length} users`);
            } else {
                console.log('⚠️  No users found');
                container.innerHTML = '<p style="color: #999; padding: 20px; text-align: center;">Aucun utilisateur trouvé</p>';
            }
        } catch (error) {
            console.error('❌ Error loading users:', error);
            alert('Erreur lors du chargement des utilisateurs');
        }
    },

    // Connexion
    async login() {
        console.log('👤 Login started');

        const userName = this.currentUserName;
        if (!userName) {
            alert('Sélectionne un utilisateur');
            return;
        }

        // Charger les partitions (depuis localStorage + MEGA partagé)
        console.log(`   Loading partitions...`);
        await this.loadPartitions();

        // Afficher la page app
        const user = { name: userName, id: this.currentUserId };
        this.showAppPage(user);
        console.log('✅ Login complete');
    },

    // Charger les partitions
    async loadPartitions() {
        try {
            console.log(`📁 Loading partitions...`);

            // Charger depuis localStorage d'abord
            const localPartitions = DataManager.getAllPartitions();
            console.log(`   Found ${localPartitions.length} local partitions`);

            // Charger depuis MEGA partagé (les fichiers disponibles)
            const megaPartitions = await MegaPublicHelper.listAvailablePartitions();
            console.log(`   Found ${megaPartitions.length} files on MEGA`);

            // Mettre à jour le status des partitions qui sont maintenant disponibles
            megaPartitions.forEach(megaFile => {
                const fileName = megaFile.name;
                const localPartition = localPartitions.find(p => p.fileName === fileName);

                if (localPartition) {
                    DataManager.updatePartitionDownloadStatus(
                        localPartition.id,
                        'disponible',
                        fileName,
                        megaFile.size
                    );
                }
            });

            console.log('✅ Partitions loaded and synced');
        } catch (error) {
            console.error('❌ Error loading partitions:', error);
        }
    },

    // Afficher la page app
    showAppPage(user) {
        console.log('🎵 Showing app page...');

        this.currentUserName = user.name;
        this.currentUserId = user.id;

        // Mettre à jour l'en-tête
        document.getElementById('currentUser').textContent = user.name;

        // Cacher login, afficher app
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('appPage').classList.add('active');

        // Marquer l'utilisateur comme en ligne
        DataManager.updateUserOnlineStatus(this.currentUserId);
        DataManager.addLog(this.currentUserId, 'login', `Connecté`);

        // Initialiser les composants UI
        this.renderPartitionsTable(this.currentUserId);
        this.updateActivityLog();
        this.updateOnlineUsersList();

        // Événements
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('addPartitionBtn').addEventListener('click', () => this.addNewPartition());

        console.log('✅ App page ready');
    },

    // Ajouter une nouvelle partition souhaitée
    addNewPartition() {
        const title = document.getElementById('newPartitionTitle').value.trim();
        const artist = document.getElementById('newPartitionArtist').value.trim();

        if (!title || !artist) {
            alert('Remplis Titre et Artiste');
            return;
        }

        // Créer la partition (sans fichier)
        const partition = DataManager.addPartition(
            title,
            artist,
            null, // fileName
            null, // fileSize
            null, // megaUrl
            null, // nodeId
            this.currentUserId, // uploadedBy
            'à_télécharger' // downloadStatus
        );

        console.log(`✅ Partition souhaitée créée: ${title}`);

        // Ajouter au status de l'utilisateur si coché
        const working = document.getElementById('newPartitionWorking').checked;
        const todo = document.getElementById('newPartitionTodo').checked;
        const skilled = document.getElementById('newPartitionSkilled').checked;

        if (working) {
            DataManager.setPartitionStatus(this.currentUserId, partition.id, 'working');
        } else if (todo) {
            DataManager.setPartitionStatus(this.currentUserId, partition.id, 'todo');
        } else if (skilled) {
            DataManager.setPartitionStatus(this.currentUserId, partition.id, 'skilled');
        }

        // Log
        DataManager.addLog(this.currentUserId, 'add_partition', `Souhait: ${title} - ${artist}`);

        // Nettoyer le formulaire
        document.getElementById('newPartitionTitle').value = '';
        document.getElementById('newPartitionArtist').value = '';
        document.getElementById('newPartitionWorking').checked = false;
        document.getElementById('newPartitionTodo').checked = false;
        document.getElementById('newPartitionSkilled').checked = false;

        // Rafraîchir
        this.renderPartitionsTable(this.currentUserId);
        this.updateActivityLog();
    },

    // Afficher la table des partitions
    renderPartitionsTable(userId) {
        console.log('📊 Rendering partitions table...');
        const tbody = document.getElementById('partitionsTableBody');

        const partitions = DataManager.getPartitionsSorted(userId);
        tbody.innerHTML = '';

        partitions.forEach(partition => {
            const tr = document.createElement('tr');

            // Status badge
            const statusBadge = this.getStatusBadge(partition.downloadStatus);

            // Compter les users avec status
            const working = DataManager.getUsersWithStatus(partition.id, 'working').length;
            const todo = DataManager.getUsersWithStatus(partition.id, 'todo').length;
            const skilled = DataManager.getUsersWithStatus(partition.id, 'skilled').length;

            // Déterminer la classe de la ligne
            const userStatus = DataManager.getPartitionStatus(userId, partition.id);
            let rowClass = '';
            if (userStatus?.status === 'working') rowClass = 'status-working';
            else if (userStatus?.status === 'todo') rowClass = 'status-todo';
            else if (userStatus?.status === 'skilled') rowClass = 'status-skilled';

            tr.className = rowClass;
            tr.innerHTML = `
                <td>${statusBadge}</td>
                <td><strong>${partition.title}</strong></td>
                <td>${partition.artist}</td>
                <td style="text-align: center;">${working > 0 ? `<span class="status-badge">${working}</span>` : ''}</td>
                <td style="text-align: center;">${todo > 0 ? `<span class="status-badge">${todo}</span>` : ''}</td>
                <td style="text-align: center;">${skilled > 0 ? `<span class="status-badge">${skilled}</span>` : ''}</td>
            `;

            tr.addEventListener('click', () => {
                this.selectPartition(partition.id);
            });

            tbody.appendChild(tr);
        });

        console.log(`✅ Table rendered with ${partitions.length} partitions`);
    },

    // Sélectionner une partition
    selectPartition(partitionId) {
        this.selectedPartitionId = partitionId;
        const partition = DataManager.getPartitionById(partitionId);

        if (!partition) return;

        console.log(`🎯 Selected partition: ${partition.title}`);

        // Afficher les infos de la partition
        document.getElementById('partitionTitle').textContent = partition.title;
        document.getElementById('partitionArtist').textContent = partition.artist;

        // Status
        const working = DataManager.getUsersWithStatus(partitionId, 'working');
        const todo = DataManager.getUsersWithStatus(partitionId, 'todo');
        const skilled = DataManager.getUsersWithStatus(partitionId, 'skilled');

        document.getElementById('workingOnList').innerHTML = working
            .map(u => `<div class="person-item">👤 ${u.userName}</div>`)
            .join('');

        document.getElementById('todoList').innerHTML = todo
            .map(u => `<div class="person-item">👤 ${u.userName}</div>`)
            .join('');

        document.getElementById('skilledList').innerHTML = skilled
            .map(u => `<div class="person-item">👤 ${u.userName}</div>`)
            .join('');

        // Boutons de statut
        const userStatus = DataManager.getPartitionStatus(this.currentUserId, partitionId);
        document.getElementById('markWorkingBtn').className = userStatus?.status === 'working' ? 'btn-status active' : 'btn-status';
        document.getElementById('markTodoBtn').className = userStatus?.status === 'todo' ? 'btn-status active' : 'btn-status';
        document.getElementById('markSkilledBtn').className = userStatus?.status === 'skilled' ? 'btn-status active' : 'btn-status';

        document.getElementById('markWorkingBtn').onclick = () => {
            DataManager.setPartitionStatus(this.currentUserId, partitionId, 'working');
            DataManager.addLog(this.currentUserId, 'status_change', `Je travaille: ${partition.title}`);
            this.selectPartition(partitionId);
            this.renderPartitionsTable(this.currentUserId);
            this.updateActivityLog();
        };

        document.getElementById('markTodoBtn').onclick = () => {
            DataManager.setPartitionStatus(this.currentUserId, partitionId, 'todo');
            DataManager.addLog(this.currentUserId, 'status_change', `Todo: ${partition.title}`);
            this.selectPartition(partitionId);
            this.renderPartitionsTable(this.currentUserId);
            this.updateActivityLog();
        };

        document.getElementById('markSkilledBtn').onclick = () => {
            DataManager.setPartitionStatus(this.currentUserId, partitionId, 'skilled');
            DataManager.addLog(this.currentUserId, 'status_change', `Je sais la faire: ${partition.title}`);
            this.selectPartition(partitionId);
            this.renderPartitionsTable(this.currentUserId);
            this.updateActivityLog();
        };

        document.getElementById('clearStatusBtn').onclick = () => {
            DataManager.setPartitionStatus(this.currentUserId, partitionId, null);
            DataManager.addLog(this.currentUserId, 'status_change', `Status supprimé: ${partition.title}`);
            this.selectPartition(partitionId);
            this.renderPartitionsTable(this.currentUserId);
            this.updateActivityLog();
        };

        // Info fichier
        if (partition.fileName) {
            document.getElementById('fileFormat').textContent = partition.fileName.split('.').pop().toUpperCase();
            document.getElementById('fileSize').textContent = partition.fileSize ? (partition.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A';

            if (partition.downloadStatus === 'disponible') {
                document.getElementById('viewPartitionBtn').style.display = 'block';
                document.getElementById('viewPartitionBtn').onclick = () => {
                    alert('Lien de téléchargement: ' + partition.megaUrl);
                };
            } else {
                document.getElementById('viewPartitionBtn').style.display = 'none';
            }
        }

        // Afficher le panel
        document.getElementById('noSelection').style.display = 'none';
        document.getElementById('partitionDisplay').style.display = 'block';
    },

    // Badge de status
    getStatusBadge(downloadStatus) {
        if (downloadStatus === 'disponible') {
            return '<span class="status-badge-available">✅ Disponible</span>';
        } else {
            return '<span class="status-badge-pending">⏳ À télécharger</span>';
        }
    },

    // Mettre à jour les utilisateurs en ligne
    updateOnlineUsersList() {
        const container = document.getElementById('onlineUsersList');
        const onlineUsers = DataManager.getOnlineUsers();

        container.innerHTML = '';

        if (onlineUsers.length === 0) {
            container.innerHTML = '<p style="color: #999; font-size: 0.9em;">Personne en ligne</p>';
            return;
        }

        const html = onlineUsers.map(user => {
            const lastSeen = DataManager.getOnlineUsers(); // Approximatif
            return `
                <div class="online-user-item">
                    <span class="online-indicator">🟢</span>
                    <span>${user.name}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    // Mettre à jour le log d'activité
    updateActivityLog() {
        const container = document.getElementById('activityLog');
        const logs = DataManager.getLogs(10);

        container.innerHTML = '';

        if (logs.length === 0) {
            container.innerHTML = '<p style="color: #999; font-size: 0.9em;">Aucune activité</p>';
            return;
        }

        const html = logs.map(log => {
            const date = new Date(log.timestamp);
            const timeStr = `${String(date.getFullYear()).slice(-2)}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;

            return `
                <div class="activity-item">
                    <span class="activity-time">${timeStr}</span>
                    <span class="activity-user">${log.userName}</span>
                    <span class="activity-action">${log.action}</span>
                    ${log.details ? `<span class="activity-details">${log.details}</span>` : ''}
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    // Enregistrer un nouvel utilisateur
    async register() {
        const username = document.getElementById('newUsername').value.trim();

        if (!username) {
            alert('Saisis ton nom');
            return;
        }

        try {
            // Enregistrer dans Supabase
            const { data, error } = await supabase
                .from('users')
                .insert([{ name: username }])
                .select();

            if (error) throw error;

            console.log(`✅ User registered: ${username}`);
            document.getElementById('newUsername').value = '';

            // Rafraîchir les utilisateurs
            await this.populateUserSelect();
        } catch (error) {
            console.error('❌ Registration error:', error);
            alert('Erreur lors de l\'inscription');
        }
    },

    // Logout
    logout() {
        console.log('👋 Logout');
        document.getElementById('appPage').classList.remove('active');
        document.getElementById('loginPage').classList.add('active');
        this.currentUserId = null;
        this.currentUserName = null;
        this.selectedPartitionId = null;
    }
};

console.log('🎵 UI module loaded');
