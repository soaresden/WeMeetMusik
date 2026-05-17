/**
 * Gestion des données utilisateurs et partitions
 * Utilise localStorage pour la persistance
 */

const DataManager = {
    STORAGE_KEY: 'soundboard_data',

    // Instruments disponibles
    INSTRUMENTS: [
        'Violon',
        'Piano',
        'Guitare Seche',
        'Guitare Elec',
        'Basse Seche',
        'Basse Elect',
        'Percu',
        'Batterie',
        'Flute',
        'Harmonica'
    ],

    // Initialiser les données
    init() {
        if (!this.getData()) {
            this.setData({
                users: [],
                partitions: [],
                userStatuses: {} // { userId-partitionId: { status: 'working'|'todo', timestamp } }
            });
            this.createSampleData();
        }
    },

    // Créer des données de test (vides maintenant)
    createSampleData() {
        const data = this.getData();
        data.users = [];
        data.partitions = [];
        data.userStatuses = {};
        this.setData(data);
    },

    // Récupérer toutes les données
    getData() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    },

    // Sauvegarder les données
    setData(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    },

    // ==================== UTILISATEURS ====================

    getAllUsers() {
        return this.getData().users;
    },

    getUserById(userId) {
        return this.getData().users.find(u => u.id === userId);
    },

    createUser(name, instruments) {
        const data = this.getData();
        const userId = 'user_' + Date.now();

        const newUser = {
            id: userId,
            name: name,
            instruments: instruments,
            createdAt: Date.now()
        };

        data.users.push(newUser);
        this.setData(data);
        return newUser;
    },

    // ==================== PARTITIONS ====================

    getAllPartitions() {
        return this.getData().partitions;
    },

    getPartitionById(partitionId) {
        return this.getData().partitions.find(p => p.id === partitionId);
    },

    addPartition(title, artist, fileName = null, fileSize = null, megaUrl = null, nodeId = null, uploadedBy = null, downloadStatus = 'à_télécharger') {
        const data = this.getData();
        const partitionId = 'part_' + Date.now();

        const newPartition = {
            id: partitionId,
            title: title,
            artist: artist,
            fileName: fileName,           // Null si souhait, sinon nom du fichier
            fileSize: fileSize,           // Null si souhait
            megaUrl: megaUrl,             // URL MEGA pour télécharger
            nodeId: nodeId,               // ID du nœud MEGA
            uploadedBy: uploadedBy,       // Qui a ajouté/uploadé
            downloadStatus: downloadStatus, // 'à_télécharger' | 'disponible'
            dateAdded: Date.now()
        };

        data.partitions.push(newPartition);
        this.setData(data);
        return newPartition;
    },

    /**
     * Mettre à jour le status de téléchargement d'une partition
     * @param {string} partitionId - ID de la partition
     * @param {string} status - 'à_télécharger' | 'disponible'
     * @param {string} fileName - Nom du fichier (si disponible)
     * @param {number} fileSize - Taille du fichier (si disponible)
     */
    updatePartitionDownloadStatus(partitionId, status, fileName = null, fileSize = null) {
        const data = this.getData();
        const partition = data.partitions.find(p => p.id === partitionId);

        if (partition) {
            partition.downloadStatus = status;
            if (fileName) partition.fileName = fileName;
            if (fileSize) partition.fileSize = fileSize;
            this.setData(data);
        }

        return partition;
    },

    // ==================== STATUTS ====================

    getPartitionStatus(userId, partitionId) {
        const data = this.getData();
        const key = `${userId}-${partitionId}`;
        return data.userStatuses[key] || null;
    },

    setPartitionStatus(userId, partitionId, status) {
        const data = this.getData();
        const key = `${userId}-${partitionId}`;

        if (status === null || status === 'none') {
            delete data.userStatuses[key];
        } else {
            data.userStatuses[key] = {
                status: status,
                timestamp: Date.now()
            };
        }

        this.setData(data);
    },

    // Récupérer tous les utilisateurs avec un statut sur une partition
    getUsersWithStatus(partitionId, statusType = null) {
        const data = this.getData();
        const users = [];

        Object.entries(data.userStatuses).forEach(([key, statusObj]) => {
            const [userId, partId] = key.split('-');

            if (partId === partitionId) {
                if (statusType === null || statusObj.status === statusType) {
                    const user = data.users.find(u => u.id === userId);
                    if (user) {
                        users.push({
                            userId: userId,
                            userName: user.name,
                            status: statusObj.status
                        });
                    }
                }
            }
        });

        return users;
    },

    // Récupérer les partitions triées par priorité
    getPartitionsSorted(userId) {
        const partitions = this.getAllPartitions();

        return partitions.sort((a, b) => {
            const statusA = this.getPartitionStatus(userId, a.id);
            const statusB = this.getPartitionStatus(userId, b.id);

            // Les partitions qu'on travaille en premier
            if (statusA?.status === 'working' && statusB?.status !== 'working') return -1;
            if (statusA?.status !== 'working' && statusB?.status === 'working') return 1;

            // Puis les partitions en todo
            if (statusA?.status === 'todo' && statusB?.status !== 'todo') return -1;
            if (statusA?.status !== 'todo' && statusB?.status === 'todo') return 1;

            // Sinon par titre
            return a.title.localeCompare(b.title);
        });
    },

    // Rechercher des partitions
    searchPartitions(query) {
        const partitions = this.getAllPartitions();
        const q = query.toLowerCase();

        return partitions.filter(p =>
            p.title.toLowerCase().includes(q) ||
            p.artist.toLowerCase().includes(q) ||
            p.fileName.toLowerCase().includes(q)
        );
    },

    // Extraire titre et artiste du nom de fichier
    parseFileNameToTitleArtist(fileName) {
        // Format attendu: "titre - artiste.mcsz"
        const withoutExtension = fileName.replace(/\.[^/.]+$/, "");
        const parts = withoutExtension.split(' - ');

        if (parts.length >= 2) {
            return {
                title: parts[0].trim(),
                artist: parts.slice(1).join(' - ').trim()
            };
        }

        return {
            title: withoutExtension,
            artist: 'Artiste inconnu'
        };
    },

    // ==================== LOGGING ====================

    addLog(userId, action, details = '') {
        const data = this.getData();
        if (!data.logs) {
            data.logs = [];
        }

        data.logs.push({
            id: 'log_' + Date.now(),
            userId: userId,
            userName: this.getUserById(userId)?.name || 'Utilisateur inconnu',
            action: action,
            details: details,
            timestamp: Date.now()
        });

        // Garder seulement les 500 derniers logs
        if (data.logs.length > 500) {
            data.logs = data.logs.slice(-500);
        }

        this.setData(data);
    },

    getLogs(limit = 20) {
        const data = this.getData();
        const logs = data.logs || [];
        return logs.slice(-limit).reverse();
    },

    getLogsForPartition(partitionId, limit = 10) {
        const logs = this.getLogs(100);
        return logs.filter(log => log.details.includes(partitionId)).slice(0, limit);
    },

    // ==================== STATUT EN LIGNE ====================

    updateUserOnlineStatus(userId) {
        const data = this.getData();
        if (!data.onlineUsers) {
            data.onlineUsers = {};
        }
        data.onlineUsers[userId] = Date.now();
        this.setData(data);
    },

    getOnlineUsers() {
        const data = this.getData();
        const onlineUsers = data.onlineUsers || {};
        const now = Date.now();
        const timeout = 5 * 60 * 1000; // 5 minutes

        return Object.entries(onlineUsers)
            .filter(([userId, lastSeen]) => (now - lastSeen) < timeout)
            .map(([userId]) => this.getUserById(userId))
            .filter(user => user !== undefined);
    },

    // ==================== SUPPRESSION ====================

    async deletePartition(partitionId) {
        const partition = this.getPartitionById(partitionId);

        // Supprimer de MEGA si nodeId est présent (best effort)
        if (partition && partition.nodeId) {
            try {
                await MegaHelper.deleteFile(partition.nodeId);
            } catch (error) {
                console.error('❌ Erreur deleting from MEGA:', error);
                // Continuer même si MEGA delete échoue
            }
        }

        // Supprimer de localStorage
        const data = this.getData();
        data.partitions = data.partitions.filter(p => p.id !== partitionId);

        // Supprimer aussi les statuts associés
        Object.keys(data.userStatuses).forEach(key => {
            if (key.endsWith('-' + partitionId)) {
                delete data.userStatuses[key];
            }
        });

        this.setData(data);
    }
};

// Initialiser au chargement
DataManager.init();
