/**
 * LibreScore Integration Helper
 * Search and download partitions from LibreScore API
 * Then upload them to MEGA
 */

const LibreScoreHelper = {
    // API endpoints
    SEARCH_API: 'https://msdl.librescore.org/api/v2/scores',
    DOWNLOAD_API: 'https://msdl.librescore.org/api/v2/scores',
    CONVERSION_API: 'https://mscz-api.librescore.org', // For format conversion if needed

    // Rate limiting: 100 calls per 10 minutes
    requestCount: 0,
    lastResetTime: Date.now(),
    MAX_REQUESTS: 100,
    RESET_INTERVAL: 10 * 60 * 1000, // 10 minutes

    /**
     * Search LibreScore for partitions
     * @param {string} query - Search query (e.g., "Bohemian Rhapsody")
     * @returns {Promise<Array>} Array of partition results
     */
    async search(query) {
        try {
            console.log('🔍 Searching LibreScore for:', query);

            this.checkRateLimit();

            // Build search URL with query parameter
            const searchUrl = `${this.SEARCH_API}?query=${encodeURIComponent(query)}&limit=20`;

            const response = await fetch(searchUrl);

            if (!response.ok) {
                throw new Error(`LibreScore API error: ${response.status}`);
            }

            const data = await response.json();

            // Parse results
            const results = (data.scores || []).map(score => ({
                id: score.id,
                title: score.title || 'Unknown Title',
                composer: score.composer || 'Unknown Composer',
                artist: score.composer || 'Unknown Artist',
                url: score.url,
                downloadUrl: score.downloadUrl || `${this.DOWNLOAD_API}/${score.id}/files/score.mscz`,
                pageUrl: score.pageUrl || `https://librescore.org/score/${score.id}`,
                thumbnail: score.thumbnail,
                owner: score.owner?.name || 'LibreScore User'
            }));

            console.log(`✅ Found ${results.length} results`);
            return results;

        } catch (error) {
            console.error('❌ LibreScore search error:', error);
            throw error;
        }
    },

    /**
     * Download MSCZ file from LibreScore and upload to MEGA
     * @param {Object} scoreData - Score data from search results
     * @param {string} userName - MEGA user folder name
     * @param {string} currentUserId - Current user ID for tracking
     * @returns {Promise<Object>} Partition data ready for DataManager.addPartition()
     */
    async downloadAndUploadToMEGA(scoreData, userName, currentUserId) {
        try {
            console.log(`⬇️  Downloading from LibreScore: ${scoreData.title}`);

            this.checkRateLimit();

            // Download MSCZ file
            const downloadUrl = scoreData.downloadUrl;
            const response = await fetch(downloadUrl);

            if (!response.ok) {
                throw new Error(`Failed to download: ${response.status}`);
            }

            const fileBuffer = await response.arrayBuffer();
            const fileName = this.sanitizeFileName(`${scoreData.title} - ${scoreData.artist}.mscz`);

            console.log(`   📦 Downloaded: ${(fileBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);

            // Upload to MEGA
            console.log(`   ⬆️  Uploading to MEGA...`);
            const uploadResult = await MegaHelper.uploadFile(
                new File([fileBuffer], fileName, { type: 'application/octet-stream' }),
                userName
            );

            console.log(`   ✅ Uploaded to MEGA`);

            // Return partition data ready for DataManager
            return {
                title: scoreData.title,
                artist: scoreData.artist,
                fileName: fileName,
                fileSize: fileBuffer.byteLength,
                megaUrl: uploadResult.megaUrl,
                nodeId: uploadResult.nodeId,
                uploadedBy: currentUserId,
                sourceUrl: scoreData.pageUrl,
                isFromLibreScore: true
            };

        } catch (error) {
            console.error('❌ Download/Upload error:', error);
            throw error;
        }
    },

    /**
     * Convert MSCZ to other formats (optional)
     * @param {Object} scoreData - Score data
     * @param {string} format - Target format (MIDI, MusicXML, etc.)
     * @returns {Promise<Blob>} Converted file
     */
    async convertScore(scoreData, format = 'MIDI') {
        try {
            const conversionUrl = `${this.CONVERSION_API}/${format.toLowerCase()}/${scoreData.id}`;
            const response = await fetch(conversionUrl);

            if (!response.ok) {
                throw new Error(`Conversion failed: ${response.status}`);
            }

            return await response.blob();
        } catch (error) {
            console.error('❌ Conversion error:', error);
            throw error;
        }
    },

    /**
     * Check and enforce rate limiting
     */
    checkRateLimit() {
        const now = Date.now();

        // Reset counter every 10 minutes
        if (now - this.lastResetTime > this.RESET_INTERVAL) {
            this.requestCount = 0;
            this.lastResetTime = now;
        }

        this.requestCount++;

        if (this.requestCount > this.MAX_REQUESTS) {
            const remainingTime = Math.ceil((this.RESET_INTERVAL - (now - this.lastResetTime)) / 1000);
            throw new Error(`Rate limit exceeded. Please wait ${remainingTime} seconds.`);
        }

        console.log(`📊 API requests: ${this.requestCount}/${this.MAX_REQUESTS}`);
    },

    /**
     * Sanitize file names for MEGA
     * @param {string} fileName - Original file name
     * @returns {string} Sanitized file name
     */
    sanitizeFileName(fileName) {
        return fileName
            .replace(/[<>:"/\\|?*]/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
    },

    /**
     * Parse LibreScore URL to extract score ID
     * @param {string} url - LibreScore URL (e.g., https://librescore.org/score/123456)
     * @returns {string} Score ID
     */
    extractScoreId(url) {
        const match = url.match(/score\/(\d+)/);
        return match ? match[1] : null;
    }
};

console.log('🎵 LibreScoreHelper loaded');
