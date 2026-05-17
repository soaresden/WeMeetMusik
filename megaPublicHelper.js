/**
 * MEGA Public Folder Helper
 * Accéder au dossier MEGA partagé sans credentials
 * https://mega.nz/folder/Zgx2WAIC#b_pZhR6hNun_h3JkSZRmGA
 */

const MegaPublicHelper = {
    // Dossier MEGA partagé
    SHARED_FOLDER_URL: 'https://mega.nz/folder/Zgx2WAIC#b_pZhR6hNun_h3JkSZRmGA',
    FOLDER_ID: 'Zgx2WAIC',
    FOLDER_KEY: 'b_pZhR6hNun_h3JkSZRmGA',

    /**
     * Lister tous les fichiers MSCZ du dossier partagé
     * @returns {Promise<Array>} Tableau des partitions disponibles
     */
    async listAvailablePartitions() {
        try {
            console.log('📁 Listing available partitions from MEGA shared folder...');

            // Accéder au dossier partagé via l'API MEGA
            const storage = new mega.Storage();

            // Importer le dossier partagé
            await new Promise((resolve, reject) => {
                storage.importFileRevision(this.FOLDER_ID, this.FOLDER_KEY, resolve, reject);
            });

            const root = storage.getRootFolder();
            const files = [];

            // Récupérer tous les fichiers .mscz du dossier
            if (root.children) {
                root.children.forEach(file => {
                    if (file.name && file.name.toLowerCase().endsWith('.mscz')) {
                        files.push({
                            name: file.name,
                            size: file.size,
                            nodeId: file.nodeID,
                            downloadUrl: file.downloadUrl,
                            isFolder: file.isFolder
                        });
                    }
                });
            }

            console.log(`✅ Found ${files.length} MSCZ files`);
            return files;

        } catch (error) {
            console.error('❌ Error listing partitions:', error);
            return [];
        }
    },

    /**
     * Obtenir l'URL de téléchargement pour un fichier
     * @param {string} nodeId - ID du nœud MEGA
     * @param {string} key - Clé de décryption
     * @returns {Promise<string>} URL de téléchargement
     */
    async getDownloadUrl(nodeId, key) {
        try {
            const storage = new mega.Storage();
            await new Promise((resolve, reject) => {
                storage.importFileRevision(this.FOLDER_ID, this.FOLDER_KEY, resolve, reject);
            });

            const root = storage.getRootFolder();
            if (root.children) {
                const file = root.children.find(f => f.nodeID === nodeId);
                if (file) {
                    return file.downloadUrl;
                }
            }
            return null;
        } catch (error) {
            console.error('❌ Error getting download URL:', error);
            return null;
        }
    },

    /**
     * Obtenir le lien direct MEGA pour télécharger
     * Format: https://mega.nz/file/{nodeId}#{fileKey}
     * @param {string} nodeId - ID du nœud
     * @param {string} fileKey - Clé du fichier
     * @returns {string} Lien MEGA direct
     */
    getDirectDownloadLink(nodeId, fileKey) {
        return `https://mega.nz/file/${nodeId}#${fileKey}`;
    },

    /**
     * Vérifier si le dossier est accessible
     * @returns {Promise<boolean>}
     */
    async checkFolderAccess() {
        try {
            console.log('🔍 Checking MEGA folder access...');
            const partitions = await this.listAvailablePartitions();
            console.log(`✅ Folder is accessible (${partitions.length} files)`);
            return true;
        } catch (error) {
            console.error('❌ Folder not accessible:', error);
            return false;
        }
    }
};

console.log('🎵 MegaPublicHelper loaded');
console.log(`📁 Shared folder: ${MegaPublicHelper.SHARED_FOLDER_URL}`);
