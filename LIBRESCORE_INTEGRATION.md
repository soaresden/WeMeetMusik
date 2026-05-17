# LibreScore Integration - WeMeetMusik

## Overview
LibreScore integration allows users to search for and import music partitions directly from LibreScore without needing to manually download and upload MSCZ files.

## How It Works

### User Flow:
1. **Login** → User tiles load, connect to MEGA
2. **Search** → User types in the "Chercher sur LibreScore..." field
3. **Results** → API returns matching partitions with composer/artist info
4. **Import** → Click "⬇️ Importer" button
5. **Auto Upload** → File downloads from LibreScore and uploads to MEGA
6. **Display** → New partition appears in the table

### Technical Flow:
```
LibreScoreUI (search input)
    ↓
LibreScoreHelper.search() [HTTP API → msdl.librescore.org]
    ↓ (results displayed)
LibreScoreUI.downloadScore() [user clicks Import]
    ↓
LibreScoreHelper.downloadAndUploadToMEGA()
    ├→ Fetch MSCZ from LibreScore
    ├→ MegaHelper.uploadFile() → MEGA
    └→ Return partition metadata
    ↓
DataManager.addPartition() [save to localStorage]
    ↓
UI.renderPartitionsTable() [refresh display]
```

## Files Added

### 1. `libreScoreHelper.js`
Core helper for LibreScore API integration
- `search(query)` - Search LibreScore API
- `downloadAndUploadToMEGA(scoreData, userName, currentUserId)` - Download and upload to MEGA
- `convertScore(scoreData, format)` - Convert to other formats (optional)
- `checkRateLimit()` - Enforce 100 requests per 10 minutes
- `sanitizeFileName()` - Clean file names for MEGA
- `extractScoreId()` - Parse LibreScore URLs

**Rate Limit**: 100 API calls per 10 minutes (LibreScore API limit)

### 2. `libreScoreUI.js`
UI components and event handlers
- `init()` - Initialize event listeners
- `performSearch()` - Handle search button click and Enter key
- `displaySearchResults(results)` - Render results list
- `downloadScore(index)` - Import selected score to MEGA
- `escapeHtml()` - Security: prevent XSS

### 3. Updated `index.html`
- Added script references for both new files
- Already had search input fields and results container

### 4. Updated `styles.css`
New CSS classes for LibreScore results:
- `.search-results-header` - Results header
- `.search-results-list` - Container for results
- `.search-result-item` - Individual result card
- `.result-info`, `.result-title`, `.result-artist`, `.result-meta` - Result text
- `.btn-download` - Import button styling

## API Details

### LibreScore Endpoints Used:
```
Search: GET https://msdl.librescore.org/api/v2/scores?query=X&limit=20
Download: https://msdl.librescore.org/api/v2/scores/{id}/files/score.mscz
```

### Response Format Example:
```json
{
  "scores": [
    {
      "id": "12345",
      "title": "Bohemian Rhapsody",
      "composer": "Freddie Mercury",
      "url": "...",
      "downloadUrl": "...",
      "pageUrl": "https://librescore.org/score/12345",
      "thumbnail": "...",
      "owner": {"name": "Username"}
    }
  ]
}
```

## Features

✅ **Search LibreScore** - Full-text search across millions of scores
✅ **One-Click Import** - Download and upload to MEGA automatically
✅ **Rate Limiting** - Respects API limits (100/10min)
✅ **Activity Logging** - Logs each import with timestamp
✅ **Error Handling** - User-friendly error messages
✅ **File Sanitization** - Cleans problematic characters from file names
✅ **UI Feedback** - Loading states on buttons during import

## Error Messages

### Search Errors:
- "Saisis une requête de recherche" - Empty search query
- "Erreur de recherche: {error}" - API or network error

### Download Errors:
- "Tu dois être connecté" - No user logged in
- "Erreur d'import: {error}" - Download or upload failed

## Usage Examples

### Basic Search:
```javascript
// Automatically called by UI when user clicks search button
LibreScoreHelper.search('Bohemian Rhapsody');
```

### Manual Import:
```javascript
// Normally called by LibreScoreUI.downloadScore()
const score = {
    title: "Bohemian Rhapsody",
    artist: "Freddie Mercury",
    downloadUrl: "https://...",
    pageUrl: "https://..."
};

const partitionData = await LibreScoreHelper.downloadAndUploadToMEGA(
    score,
    'Denis', // MEGA folder
    'user_123' // current user ID
);

DataManager.addPartition(
    partitionData.title,
    partitionData.artist,
    partitionData.fileName,
    partitionData.fileSize,
    partitionData.megaUrl,
    partitionData.nodeId,
    partitionData.uploadedBy
);
```

## Dependencies

- `megaHelper.js` - For uploading to MEGA
- `userData.js` - For DataManager
- `ui.js` - For UI updates
- Fetch API (native browser)
- No external npm packages required

## Future Enhancements

🔹 Batch import multiple scores at once
🔹 Format conversion (MIDI, MusicXML, PDF)
🔹 Favorite/bookmark scores
🔹 Advanced search filters (instrument, difficulty, key)
🔹 Share LibreScore links directly in chat
🔹 Cache search results locally
🔹 Progress bar for downloads

## Troubleshooting

### "Aucun résultat trouvé"
- Check spelling of search query
- Try searching by composer name instead
- Some scores may not be available on LibreScore

### Import fails with network error
- Check internet connection
- LibreScore API might be temporarily down
- Try again in a few minutes

### File size issues
- LibreScore typically has files < 10MB
- Check MEGA account storage quota
- Some MSCZ files may be corrupted on LibreScore

## Security Notes

✅ XSS Protection - HTML sanitization on all user inputs
✅ CORS - Requests made from browser (subject to CORS policies)
✅ File Validation - Only accepts MSCZ format from download
✅ Rate Limiting - Prevents API abuse

## Performance

- Search results: ~2-5 seconds (depends on query)
- Download: ~1-5 seconds (depends on file size)
- Upload to MEGA: ~2-10 seconds (depends on file size and connection)
- Total import time: ~5-20 seconds

