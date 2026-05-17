/**
 * MEGA Helper - Gestion des uploads/downloads via serveur Replit
 * Utilise les endpoints /api/upload, /api/list, /api/delete
 */

const REPLIT_API = 'https://sheet-uploader--soaresden.replit.app';

const MegaHelper = {
    isConnected: true, // Le serveur gère la connexion

    /**
     * Récupérer la liste des utilisateurs depuis Supabase
     * Vérifier l'existence des dossiers MEGA
     * @returns {Promise<Array>} [{ name: "Denis", fileCount: 5 }, ...]
     */
    async getUsers() {
        try {
            console.log('👥 Loading users from Supabase...');

            // Charger les utilisateurs depuis Supabase
            const { data: users, error } = await supabase
                .from('users')
                .select('name')
                .order('name', { ascending: true });

            if (error) throw new Error(error.message);

            if (!users || users.length === 0) {
                console.log('ℹ️  No users in Supabase');
                return [];
            }

            // Pour chaque utilisateur, vérifier le dossier MEGA et compter les fichiers MCSZ
            const usersWithCounts = [];
            for (const user of users) {
                try {
                    const files = await this.listUserFiles(user.name);

                    // Filtrer UNIQUEMENT les fichiers .mscz
                    const mcszFiles = files.filter(file => {
                        return file.name.toLowerCase().endsWith('.mscz');
                    });

                    usersWithCounts.push({
                        name: user.name,
                        fileCount: mcszFiles.length
                    });
                    console.log(`   ✅ ${user.name}: ${mcszFiles.length} fichiers MCSZ`);
                } catch (megaError) {
                    // Le dossier n'existe pas encore ou erreur
                    usersWithCounts.push({
                        name: user.name,
                        fileCount: 0
                    });
                    console.log(`   ℹ️  ${user.name}: pas de dossier MEGA`);
                }
            }

            console.log(`✅ Loaded ${usersWithCounts.length} users from Supabase`);
            return usersWithCounts;

        } catch (error) {
            console.error('❌ Error loading users:', error.message);
            return [];
        }
    },

    /**
     * Uploader un fichier
     * @param {File} file - Le fichier à uploader
     * @param {string} userName - Nom d'utilisateur (dossier MEGA)
     * @returns {Promise<Object>} { name, size, megaUrl, nodeId }
     */
    async uploadFile(file, userName) {
        try {
            console.log(`⬆️  Upload ${file.name} pour ${userName}...`);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('userName', userName);

            const response = await fetch(`${REPLIT_API}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Upload failed');
            }

            console.log(`✅ Fichier uploadé: ${data.name}`);
            console.log(`   MEGA URL: ${data.megaUrl}`);

            return {
                name: data.name,
                size: data.size,
                megaUrl: data.megaUrl,
                nodeId: data.nodeId,
                mimeType: data.mimeType
            };

        } catch (error) {
            console.error('❌ Erreur upload:', error.message);
            throw error;
        }
    },

    /**
     * Lister les fichiers d'un utilisateur
     * @param {string} userName - Nom d'utilisateur
     * @returns {Promise<Array>} Liste des fichiers
     */
    async listUserFiles(userName) {
        try {
            console.log(`📁 Listing files for ${userName}...`);
            console.log(`   API endpoint: ${REPLIT_API}/api/list/${userName}`);

            const response = await fetch(`${REPLIT_API}/api/list/${userName}`);

            if (!response.ok) {
                console.error(`   HTTP ${response.status}: ${response.statusText}`);
                throw new Error(`List failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`   API Response:`, data);

            if (!data.success) {
                console.log(`   API returned success=false`);
                return [];
            }

            const files = data.files || [];
            console.log(`   Total files returned: ${files.length}`);

            // Afficher tous les fichiers avec leurs extensions
            if (files.length > 0) {
                const extensions = {};
                files.forEach(file => {
                    const name = file.name || file.fileName || 'unknown';
                    const ext = name.split('.').pop();
                    extensions[ext] = (extensions[ext] || 0) + 1;
                });
                console.log(`   File types found:`, extensions);
                console.log(`   First 5 files:`, files.slice(0, 5).map(f => f.name || f.fileName));
            }

            return files;

        } catch (error) {
            console.error('❌ Erreur listing:', error.message);
            console.error('   Stack:', error.stack);
            return [];
        }
    },

    /**
     * Supprimer un fichier
     * @param {string} nodeId - ID du nœud MEGA
     * @returns {Promise<boolean>} true si succès
     */
    async deleteFile(nodeId) {
        try {
            console.log(`🗑️  Deleting ${nodeId}...`);

            const response = await fetch(`${REPLIT_API}/api/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nodeId })
            });

            if (!response.ok) {
                throw new Error(`Delete failed: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                console.log(`✅ Fichier supprimé`);
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ Erreur delete:', error.message);
            return false;
        }
    },

    /**
     * Télécharger un fichier (ouvre dans le navigateur)
     * @param {string} megaUrl - URL MEGA du fichier
     */
    async downloadFile(megaUrl) {
        try {
            console.log(`⬇️  Downloading ${megaUrl}...`);
            // Ouvrir le lien MEGA directement
            window.open(megaUrl, '_blank');
            return true;
        } catch (error) {
            console.error('❌ Erreur download:', error.message);
            return false;
        }
    }
};

