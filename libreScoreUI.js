/**
 * LibreScore UI Integration
 * Handles search results display and partition import
 */

const LibreScoreUI = {
    currentSearchResults: [],
    isSearching: false,

    /**
     * Initialize LibreScore search functionality
     */
    init() {
        const searchBtn = document.getElementById('searchBtn');
        const libreScoreSearch = document.getElementById('libreScoreSearch');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.performSearch());
        }

        if (libreScoreSearch) {
            libreScoreSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }

        console.log('🎵 LibreScore UI initialized');
    },

    /**
     * Perform search on LibreScore
     */
    async performSearch() {
        const searchInput = document.getElementById('libreScoreSearch');
        const query = searchInput?.value?.trim();

        if (!query) {
            alert('Saisis une requête de recherche');
            return;
        }

        if (this.isSearching) return;

        try {
            this.isSearching = true;
            const searchBtn = document.getElementById('searchBtn');
            const originalText = searchBtn.textContent;
            searchBtn.textContent = '⏳ Recherche...';
            searchBtn.disabled = true;

            console.log('🔍 Searching:', query);
            const results = await LibreScoreHelper.search(query);

            this.currentSearchResults = results;
            this.displaySearchResults(results);

            searchBtn.textContent = originalText;
            searchBtn.disabled = false;

        } catch (error) {
            console.error('❌ Search error:', error);
            alert(`Erreur de recherche: ${error.message}`);

            const searchBtn = document.getElementById('searchBtn');
            searchBtn.textContent = '🔍';
            searchBtn.disabled = false;
        } finally {
            this.isSearching = false;
        }
    },

    /**
     * Display search results in the results area
     * @param {Array} results - Array of score results
     */
    displaySearchResults(results) {
        const resultsContainer = document.getElementById('searchResults');

        if (!resultsContainer) return;

        if (results.length === 0) {
            resultsContainer.innerHTML = '<p>Aucun résultat trouvé</p>';
            return;
        }

        let html = `
            <div class="search-results-header">
                <h3>📊 Résultats (${results.length})</h3>
            </div>
            <div class="search-results-list">
        `;

        results.forEach((score, index) => {
            html += `
                <div class="search-result-item">
                    <div class="result-info">
                        <div class="result-title">${this.escapeHtml(score.title)}</div>
                        <div class="result-artist">${this.escapeHtml(score.artist)}</div>
                        <div class="result-meta">
                            <small>Par ${this.escapeHtml(score.owner)}</small>
                        </div>
                    </div>
                    <button
                        class="btn-primary btn-download"
                        onclick="LibreScoreUI.downloadScore(${index})"
                    >
                        ⬇️ Importer
                    </button>
                </div>
            `;
        });

        html += '</div>';
        resultsContainer.innerHTML = html;
    },

    /**
     * Download and import a score from search results
     * @param {number} index - Index in currentSearchResults
     */
    async downloadScore(index) {
        const score = this.currentSearchResults[index];
        if (!score) return;

        const currentUser = window.currentUser;
        if (!currentUser) {
            alert('Tu dois être connecté');
            return;
        }

        try {
            const button = event.target;
            button.textContent = '⏳ Téléchargement...';
            button.disabled = true;

            console.log(`⬇️  Importing: ${score.title}`);

            // Download and upload to MEGA
            const partitionData = await LibreScoreHelper.downloadAndUploadToMEGA(
                score,
                currentUser.name,
                currentUser.id
            );

            // Add to DataManager
            const partition = DataManager.addPartition(
                partitionData.title,
                partitionData.artist,
                partitionData.fileName,
                partitionData.fileSize,
                partitionData.megaUrl,
                partitionData.nodeId,
                partitionData.uploadedBy
            );

            console.log('✅ Partition importée:', partition.title);

            // Log the action
            DataManager.addLog(currentUser.id, 'import_librescore', `Importé depuis LibreScore: ${partition.title}`);

            // Refresh the table
            UI.renderPartitionsTable(currentUser.id);
            UI.updateActivityLog();

            // Clear search
            document.getElementById('libreScoreSearch').value = '';
            document.getElementById('searchResults').innerHTML = '';

            alert(`✅ ${score.title} importé avec succès!`);

            button.textContent = '⬇️ Importer';
            button.disabled = false;

        } catch (error) {
            console.error('❌ Import error:', error);
            alert(`Erreur d'import: ${error.message}`);

            const button = event.target;
            button.textContent = '⬇️ Importer';
            button.disabled = false;
        }
    },

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    LibreScoreUI.init();
});

console.log('🎵 LibreScoreUI loaded');
