async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = event => {
            const db = event.target.result;
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
        };

        request.onsuccess = event => resolve(event.target.result);
        request.onerror = () => reject('Failed to open IndexedDB');
    });
}

async function saveToDB(surahs) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    store.put({
        id: 1,
        surahs,
        timestamp: Date.now()
    });

    await tx.complete;
    db.close();
}

async function getFromDB() {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve) => {
        const request = store.get(1);
        request.onsuccess = () => {
            const result = request.result;
            if (result && (Date.now() - result.timestamp) < EXPIRATION_HOURS * 60 * 60 * 1000) {
                resolve(result.surahs);
            } else {
                resolve(null);
            }
        };
        request.onerror = () => resolve(null);
    });
}

async function fetchQuranData() {
    try {
        const cached = await getFromDB();
        if (cached) {
            console.log("✅ Loaded from IndexedDB");
            return cached;
        }

        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        const surahs = data?.data?.surahs;

        if (!surahs) throw new Error("Invalid response structure");

        await saveToDB(surahs);
        localStorage.setItem('quran-backup', JSON.stringify(surahs));
        console.log("✅ Fetched from network, saved to IndexedDB and localStorage backup");
        return surahs;

    } catch (error) {
        console.warn("⚠️ Network error, trying IndexedDB and localStorage fallback:", error.message);
        
        const backup = localStorage.getItem('quran-backup');
        if (backup) {
            console.log("✅ Loaded from localStorage backup");
            return JSON.parse(backup);
        }

        console.error("❌ No data available");
        return null;
    }
}

function organizeVersesByPage(surahs) {
    const pages = {};

    for (let i = 1; i <= totalPages; i++) {
        pages[i] = [];
    }

    surahs.forEach(surah => {
        surah.ayahs.forEach(ayah => {
            if (!pages[ayah.page]) {
                pages[ayah.page] = [];
            }
            pages[ayah.page].push({
                ...ayah,
                surahName: surah.name,
                surahNumber: surah.number,
                englishName: surah.englishName,
                revelationType: surah.revelationType
            });
        });
    });

    return pages;
}

function saveCurrentPage(page) {
    try {
        const data = {
            page: page,
            timestamp: new Date().getTime()
        };
        localStorage.setItem('lastVisitedPage', JSON.stringify(data));
    } catch (error) {
        console.error('Error saving page:', error);
    }
}
