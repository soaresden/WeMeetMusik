/**
 * WeMeetMusik - Mini Server Replit
 * Upload files to MEGA directly
 *
 * À copier dans index.js sur Replit
 */

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { Storage } = require('mega');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload config
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

// MEGA credentials
const MEGA_CONFIG = {
    email: 'soaresden+wemeet@gmail.com',
    password: 'lamusique1980!'
};

console.log('🎵 WeMeetMusik Server starting...');

// ═════════════════════════════════════════════════════════════════════════════
// ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Health check
 */
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: '🎵 WeMeetMusik Mega Upload Server v1.0',
        endpoints: {
            'POST /api/upload': 'Upload file',
            'GET /api/list/:userName': 'List user files',
            'POST /api/delete': 'Delete file',
            'GET /api/test': 'Test MEGA connection',
            'GET /api/folders': 'List all user folders'
        }
    });
});

/**
 * Test MEGA connection
 * GET /api/test
 */
app.get('/api/test', async (req, res) => {
    try {
        console.log('\n🧪 Testing MEGA connection...');
        const storage = new Storage();

        await new Promise((resolve, reject) => {
            storage.login(MEGA_CONFIG, resolve, reject);
        });

        console.log('✅ Connected to MEGA');

        const root = storage.getRootFolder();
        console.log('📁 Root folder found');

        const folders = (root.children || [])
            .filter(child => child.isFolder)
            .map(folder => ({
                name: folder.name,
                filesCount: folder.children?.length || 0
            }));

        console.log(`📊 Found ${folders.length} folders`);
        folders.forEach(f => console.log(`   - ${f.name}: ${f.filesCount} files`));

        res.json({
            success: true,
            message: 'Connected to MEGA',
            rootFolder: {
                totalChildren: root.children?.length || 0,
                userFolders: folders
            }
        });

    } catch (error) {
        console.error('❌ MEGA Test Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            hint: 'Check MEGA credentials in replit-server.js'
        });
    }
});

/**
 * List all folders (users)
 * GET /api/folders
 */
app.get('/api/folders', async (req, res) => {
    try {
        console.log('\n📁 Listing all folders...');
        const storage = new Storage();

        await new Promise((resolve, reject) => {
            storage.login(MEGA_CONFIG, resolve, reject);
        });

        const root = storage.getRootFolder();
        const folders = (root.children || [])
            .filter(child => child.isFolder)
            .map(folder => ({
                name: folder.name,
                filesCount: folder.children?.length || 0,
                files: (folder.children || []).map(f => ({
                    name: f.name,
                    size: f.size,
                    isFolder: f.isFolder
                }))
            }));

        res.json({
            success: true,
            folderCount: folders.length,
            folders: folders
        });

    } catch (error) {
        console.error('❌ Error listing folders:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Upload file to MEGA
 * POST /api/upload
 * Body: FormData with file + userName
 */
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        // Validation
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Pas de fichier envoyé'
            });
        }

        const userName = (req.body.userName || 'unknown').replace(/\s+/g, '_');
        const fileName = req.file.originalname;

        console.log(`\n⬆️  Upload START: ${fileName}`);
        console.log(`   User: ${userName}`);
        console.log(`   Size: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`);

        // Connexion à MEGA
        const storage = new Storage();

        const loginPromise = new Promise((resolve, reject) => {
            storage.login(MEGA_CONFIG, resolve, reject);
        });

        await loginPromise;
        console.log('   ✅ Connecté à MEGA');

        // Récupérer le dossier root
        const root = storage.getRootFolder();

        // Trouver ou créer le dossier utilisateur
        let userFolder = null;
        if (root.children) {
            userFolder = root.children.find(
                child => child.name === userName && child.isFolder
            );
        }

        if (!userFolder) {
            console.log(`   📁 Création dossier: ${userName}`);
            userFolder = root.mkdir(userName);
        } else {
            console.log(`   📁 Dossier trouvé: ${userName}`);
        }

        // Upload le fichier
        const uploadPromise = new Promise((resolve, reject) => {
            const uploadTask = userFolder.upload({
                name: fileName,
                size: req.file.size
            }, req.file.buffer);

            uploadTask.then(resolve).catch(reject);
        });

        await uploadPromise;
        console.log(`   ✅ Fichier uploadé avec succès!`);

        // Réponse succès
        res.json({
            success: true,
            message: `${fileName} uploadé sur MEGA`,
            name: fileName,
            userName: userName,
            size: req.file.size,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`\n❌ ERREUR UPLOAD:`, error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Erreur lors de l\'upload'
        });
    }
});

/**
 * List files in user folder
 * GET /api/list/:userName
 */
app.get('/api/list/:userName', async (req, res) => {
    try {
        const userName = req.params.userName.replace(/\s+/g, '_');

        const storage = new Storage();

        await new Promise((resolve, reject) => {
            storage.login(MEGA_CONFIG, resolve, reject);
        });

        const root = storage.getRootFolder();
        const userFolder = root.children?.find(
            child => child.name === userName && child.isFolder
        );

        if (!userFolder) {
            return res.json({
                success: true,
                folder: userName,
                files: [],
                message: 'Dossier non trouvé'
            });
        }

        const files = (userFolder.children || []).map(file => ({
            name: file.name,
            size: file.size,
            isFolder: file.isFolder,
            isDirectory: file.isFolder,
            nodeId: file.nodeID,
            modifiedDate: file.modifiedDate
        }));

        res.json({
            success: true,
            folder: userName,
            userName: userName,
            fileCount: files.length,
            files: files
        });

    } catch (error) {
        console.error('❌ ERREUR LIST:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Delete file from MEGA
 * POST /api/delete
 * Body: { nodeId }
 */
app.post('/api/delete', async (req, res) => {
    try {
        const { nodeId } = req.body;

        if (!nodeId) {
            return res.status(400).json({
                error: 'nodeId requis'
            });
        }

        const storage = new Storage();

        await new Promise((resolve, reject) => {
            storage.login(MEGA_CONFIG, resolve, reject);
        });

        const root = storage.getRootFolder();

        // Chercher le fichier avec ce nodeId
        let fileToDelete = null;
        const searchInFolder = (folder) => {
            if (folder.children) {
                for (const child of folder.children) {
                    if (child.nodeID === nodeId) {
                        fileToDelete = child;
                        return true;
                    }
                    if (child.isFolder && searchInFolder(child)) {
                        return true;
                    }
                }
            }
            return false;
        };

        searchInFolder(root);

        if (!fileToDelete) {
            return res.status(404).json({
                error: 'Fichier non trouvé avec ce nodeId'
            });
        }

        fileToDelete.remove();

        res.json({
            success: true,
            message: `Fichier supprimé`,
            nodeId: nodeId
        });

    } catch (error) {
        console.error('❌ ERREUR DELETE:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ═════════════════════════════════════════════════════════════════════════════
// START SERVER
// ═════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎵 WeMeetMusik Server RUNNING`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 URL: https://${process.env.REPL_SLUG || 'your-replit'}.replit.dev`);
    console.log(`${'='.repeat(60)}\n`);
    console.log('📋 Endpoints disponibles:');
    console.log('   GET  / - Health check');
    console.log('   GET  /api/test - Test MEGA connection');
    console.log('   GET  /api/folders - List all user folders');
    console.log('   GET  /api/list/:userName - List user files');
    console.log('   POST /api/upload - Upload file');
    console.log('   POST /api/delete - Delete file');
    console.log('');
});
