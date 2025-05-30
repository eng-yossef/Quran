// Global variables
let currentPage = 1;
const totalPages = 604; // Total pages in standard Quran mushaf
let pagesData = {}; // Will store organized verses by page
let surahData = []; // Will store surah information
let currentAudio = null;
let currentPlayingSurah = null;
let isPlayingEntireSurah = false;
let currentVerseHighlight = null;
let audioPaused = false;
let currentVerseSequence = [];
let currentVerseIndex = 0;
let currentPageNumber = 1; // Track current page number
let lastScrollPosition = window.pageYOffset;
let scrollTimeout = null;
let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 50; // Minimum swipe distance in pixels
const QURAN_DATA_CACHE_KEY = 'quran-data-v1';
const tafsirCache = new Map();
const MAX_CACHE_SIZE = 100; // Maximum size of the cache
const MAX_PREFETCH_COUNT = 5; // 👈 You can change this number to prefetch more or fewer verses
let audioQueue = [];

// Night Mode Toggle with better verse number handling
const nightModeToggle = document.getElementById('nightModeToggle');
let isNightMode = localStorage.getItem('nightMode') === 'true';

// DOM elements
const quranPageEl = document.getElementById('quranPage');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageIndicatorEl = document.getElementById('pageIndicator');
const sidebarEl = document.getElementById('sidebar');
const menuButtonEl = document.getElementById('menuButton');
const closeSidebarEl = document.getElementById('closeSidebar');
const surahListEl = document.getElementById('surahList');

// Main function to play a verse from the queue
async function playVerseAudioFromQueue(callback = null) {
    // Pause current audio if needed
    if (currentAudio && !audioPaused) {
        currentAudio.pause();
        currentAudio.removeEventListener('ended', currentAudio._endedHandler); // Clean up previous listener
        currentAudio = null;
    }

    // If no audio left in queue, stop
    if (audioQueue.length === 0) {
        stopAudio();
        return;
    }

    const { audio, verse } = audioQueue.shift();
    currentAudio = audio;

    // Update UI play button if needed
    if (audioPaused) {
        audioPaused = false;
        document.querySelector('.stop-audio-btn').innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>`;
    }

    // Clean up any previous ended listeners
    if (audio._endedHandler) {
        audio.removeEventListener('ended', audio._endedHandler);
    }

    // Create and store the ended handler
    audio._endedHandler = () => {
        audio.removeEventListener('ended', audio._endedHandler);
        delete audio._endedHandler;
        if (callback) callback();
    };

    // Add the new ended listener
    currentAudio.addEventListener('ended', currentAudio._endedHandler);

    // Try to play audio with error handling
    try {
        await currentAudio.play();
        
        // Update current verse index and prefetch next verses
        if (isPlayingEntireSurah && currentVerseSequence) {
            currentVerseIndex = currentVerseSequence.findIndex(v => 
                v.surahNumber === verse.surahNumber && 
                v.numberInSurah === verse.numberInSurah
            );
            
            // Prefetch next verses if we're running low
            if (audioQueue.length < 2 && currentVerseIndex < currentVerseSequence.length - 1) {
                prefetchVerses(currentVerseIndex + 1, MAX_PREFETCH_COUNT);
            }
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('Playback aborted due to pause or interruption.');
        } else {
            console.error('Audio playback failed:', error);
        }
        return; // Exit early on error
    }
}





async function prefetchVerses(startIndex, count) {
    for (let i = startIndex; i < Math.min(startIndex + count, currentVerseSequence.length); i++) {
        const verse = currentVerseSequence[i];
        try {
            const res = await fetch(`https://api.alquran.cloud/v1/ayah/${verse.surahNumber}:${verse.numberInSurah}/ar.alafasy`);
            const data = await res.json();
            if (data.code === 200 && data.data.audio) {
                const audio = new Audio(data.data.audio);
                audioQueue.push({ audio, verse });
            }
        } catch (err) {
            console.error(`Error prefetching audio for ${verse.surahNumber}:${verse.numberInSurah}`, err);
        }
    }
}

// Play entire surah with prefetching
async function playEntireSurah(surahNumber, startFrom = { page: null, verseNumber: null }) {
    stopAudio();
    clearVerseHighlights();

    const verses = [];
    let currentPage = startFrom.page;

    if (!currentPage && startFrom.verseNumber) {
        for (let page = 1; page <= totalPages; page++) {
            const verseInPage = pagesData[page].find(v =>
                v.surahNumber == surahNumber && v.numberInSurah == startFrom.verseNumber
            );
            if (verseInPage) {
                currentPage = page;
                break;
            }
        }
        if (!currentPage) return;
    }

    if (!currentPage) {
        for (let page = 1; page <= totalPages; page++) {
            if (pagesData[page].some(v => v.surahNumber == surahNumber)) {
                currentPage = page;
                break;
            }
        }
        if (!currentPage) return;
    }

    let foundStartingVerse = !startFrom.verseNumber;
    for (let page = currentPage; page <= totalPages; page++) {
        const pageVerses = pagesData[page].filter(v => v.surahNumber == surahNumber);
        if (pageVerses.length === 0) break;

        for (const verse of pageVerses) {
            if (!foundStartingVerse) {
                if (verse.numberInSurah === startFrom.verseNumber) {
                    foundStartingVerse = true;
                    verses.push(verse);
                }
            } else {
                verses.push(verse);
            }
        }

        if (page < totalPages && pagesData[page + 1][0]?.surahNumber !== surahNumber) {
            break;
        }
    }

    if (verses.length === 0) return;

    isPlayingEntireSurah = true;
    currentPlayingSurah = surahNumber;
    currentVerseSequence = verses;
    currentVerseIndex = 0;

    if (startFrom.verseNumber) {
        currentVerseIndex = verses.findIndex(v => v.numberInSurah === startFrom.verseNumber);
        if (currentVerseIndex < 0) currentVerseIndex = 0;
    }

    document.querySelector('.stop-audio-btn').style.display = 'block';
    document.querySelector('.stop-audio-btn').innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>`;

    audioQueue = [];
    await prefetchVerses(currentVerseIndex, MAX_PREFETCH_COUNT);
    playNextVerseInSequence();
}



function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    audioQueue = [];
    isPlayingEntireSurah = false;
    document.querySelector('.stop-audio-btn').style.display = 'none';
}

function highlightCurrentVerse(element) {
    element.classList.add('current-playing-verse');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearVerseHighlights() {
    document.querySelectorAll('.current-playing-verse').forEach(el => el.classList.remove('current-playing-verse'));
}


// Sequentially play the next verse

async function playNextVerseInSequence() {
    if (currentVerseIndex >= currentVerseSequence.length || !isPlayingEntireSurah) {
        stopAudio();
        return;
    }

    const verse = currentVerseSequence[currentVerseIndex];

    document.querySelectorAll('.current-playing-verse').forEach(el => {
        el.classList.remove('current-playing-verse');
    });

    const versePage = findPageForVerse(verse.surahNumber, verse.numberInSurah);
    if (versePage !== currentPageNumber) {
        try {
            await renderPage(versePage);
        } catch (error) {
            console.error("Error rendering page:", error);
            stopAudio();
            return;
        }
    }

    const verseElement = document.querySelector(
        `.verse-container[data-surah="${verse.surahNumber}"][data-ayah="${verse.numberInSurah}"]`
    );
    if (verseElement) {
        highlightCurrentVerse(verseElement);
    }

    playVerseAudioFromQueue(async () => {
        currentVerseIndex++;

        // Prefetch next verse if queue is getting short
        if (audioQueue.length < MAX_PREFETCH_COUNT - 1) {
            await prefetchVerses(currentVerseIndex + audioQueue.length, 1);
        }

        if (currentVerseIndex < currentVerseSequence.length) {
            playNextVerseInSequence();
        } else {
            stopAudio();
        }
    });
}








// Corrected implementation
function matchSidebarHeight() {
    const quranPage = document.querySelector('.main-content');
    const sidebar = document.querySelector('.surah-list');

    if (quranPage && sidebar) {
        // Get the computed height of the quran page
        const quranPageHeight = quranPage.offsetHeight;

        // Set sidebar height to match
        sidebar.style.height = `${quranPageHeight - 200}px`;


    }
}

// Correct event listeners - use 'DOMContentLoaded' instead of 'load'
document.addEventListener('DOMContentLoaded', function () {
    // Initial match
    matchSidebarHeight();

    // Also run after fonts and images are loaded
    window.addEventListener('load', matchSidebarHeight);
});

// Add debounce to resize event
let resizeTimer;
window.addEventListener('resize', function () {
    // clearTimeout(resizeTimer);
    // resizeTimer = setTimeout(matchSidebarHeight, 250);
    matchSidebarHeight();
});


function setupTafsirHideOnScroll() {
    // Use passive: true for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });
}

function handleScroll() {
    // Clear any pending hide operations
    if (scrollTimeout) {
        clearTimeout(scrollTimeout);
    }

    // Only hide if scroll is significant (more than 5 pixels)
    if (Math.abs(window.pageYOffset - lastScrollPosition) > 5) {
        scrollTimeout = setTimeout(() => {
            hideTafsir();
        }, 100); // Small delay to avoid hiding during momentum scrolling
    }

    lastScrollPosition = window.pageYOffset;
}

function setupSwipeNavigation() {
    const quranPage = document.getElementById('quranPage');
    const SWIPE_IGNORE_RADIUS = 40; // Pixels around close button to ignore

    quranPage.addEventListener('touchstart', (e) => {
        // Check if touch started on/near close button
        const closeBtn = e.target.closest('.close-tafsir-btn');
        if (closeBtn) {
            e.stopPropagation(); // Prevent swipe handling
            return;
        }

        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    quranPage.addEventListener('touchend', (e) => {
        // Check if released on/near close button
        const closeBtn = e.target.closest('.close-tafsir-btn');
        if (closeBtn) return;

        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
}

function handleSwipe() {
    const deltaX = touchEndX - touchStartX;

    // Swipe right → Next page
    if (deltaX > SWIPE_THRESHOLD && currentPage < totalPages) {
        navigateToPage(currentPage + 1);
    }
    // Swipe left → Previous page
    else if (deltaX < -SWIPE_THRESHOLD && currentPage > 1) {
        navigateToPage(currentPage - 1);
    }
}



function navigateToPage(newPage) {
    currentPage = newPage;
    renderPage(currentPage);
    saveCurrentPage(currentPage);
    // window.scrollTo({
    //     top: 0,
    //     behavior: 'smooth'
    // });
    highlightSurahForCurrentPage();

    // Add visual feedback (optional)
    document.getElementById('quranPage').style.transform = `translateX(${newPage > currentPage ? 5 : -5}px)`;
    setTimeout(() => {
        document.getElementById('quranPage').style.transform = 'translateX(0)';
    }, 300);
}
const API_URL = 'https://api.alquran.cloud/v1/quran/quran-uthmani';
const DB_NAME = 'QuranCacheDB';
const STORE_NAME = 'SurahStore';
const EXPIRATION_HOURS = 24; // Cache valid for 24 hours

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
                resolve(null); // expired or not found
            }
        };
        request.onerror = () => resolve(null);
    });
}

async function fetchQuranData() {
    try {
        // Try IndexedDB first
        const cached = await getFromDB();
        if (cached) {
            console.log("✅ Loaded from IndexedDB");
            return cached;
        }

        // Fetch from network if not cached or expired
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        const surahs = data?.data?.surahs;

        if (!surahs) throw new Error("Invalid response structure");

        await saveToDB(surahs);
        localStorage.setItem('quran-backup', JSON.stringify(surahs)); // backup
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



// Organize verses by page
function organizeVersesByPage(surahs) {
    const pages = {};

    // Initialize pages object
    for (let i = 1; i <= totalPages; i++) {
        pages[i] = [];
    }

    // Group verses by page
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


// Add stop button container to HTML body
const stopBtnContainer = document.createElement('div');
stopBtnContainer.className = 'stop-btn-container';
stopBtnContainer.innerHTML = `
    <button class="stop-audio-btn" style="display: none;">
        <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
    </button>
`;
document.body.appendChild(stopBtnContainer);

function renderPage(pageNumber) {
    currentPageNumber = pageNumber;
    saveCurrentPage(pageNumber);
    const pageVerses = pagesData[pageNumber];
    if (!pageVerses) return;

    let html = '';
    let currentSurah = null;

    pageVerses.forEach(verse => {
        if (verse.surahNumber !== currentSurah) {
            if (verse.numberInSurah === 1) {
                html += `
                    <div class="surah-info">
                        <h2 class="surah-name" data-surah="${verse.surahNumber}">
                            ${verse.surahName}
                        </h2>
                        <p>${verse.englishName} - ${verse.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}</p>
                    </div>
                `;
                if (pageNumber != 1 && pageNumber != 187) {
                    html += `
                        <div class="bismillah-container">
                            <div class="bismillah-decoration left"></div>
                            <h1 class="bismillah-text">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</h1>
                            <div class="bismillah-decoration right"></div>
                        </div>
                    `;
                }
            }
            currentSurah = verse.surahNumber;
        }

        html += `
        <div class="verse-container" data-surah="${verse.surahNumber}" data-ayah="${verse.numberInSurah}" data-surah-name="${verse.surahName}">
            <span class="verse-text">${verse.numberInSurah === 1 && pageNumber != 1 && pageNumber != 187 ? verse.text.substring(39) : verse.text}</span>
            <span class="verse-number">${toArabicNumber(verse.numberInSurah)}</span>
        </div>
    `;
    });

    quranPageEl.innerHTML = html;

    // =============== Inject Input + Button Next to Page Number ===============
    pageIndicatorEl.innerHTML = `
        <input type="number" id="pageInput"  min="1" max="${totalPages}" value="${pageNumber}" style="width: 45px;">
        <button id="goToPageBtn" class="go-btn">اذهب</button>
    `;

    // Set up button and input events
    const input = document.getElementById('pageInput');
    const button = document.getElementById('goToPageBtn');

    button.addEventListener('click', () => {
        const val = parseInt(input.value);
        if (!isNaN(val) && val >= 1 && val <= totalPages) {
            renderPage(val);
        } else {
            alert(`أدخل رقم صفحة من 1 إلى ${totalPages}`);
        }
    });

    input.addEventListener('keypress', e => {
        if (e.key === 'Enter') button.click();
    });
    // ==========================================================================

    // Surah click event
    document.querySelectorAll('.surah-name').forEach(surahName => {
        surahName.addEventListener('click', function () {
            const surahNumber = parseInt(this.getAttribute('data-surah'));
            playEntireSurah(surahNumber, { page: pageNumber });
        });
    });

    prevPageBtn.disabled = pageNumber <= 1;
    nextPageBtn.disabled = pageNumber >= totalPages;

    history.replaceState({ page: pageNumber }, '', `?page=${pageNumber}`);
    setupVerseInteractions();
    highlightSurahForCurrentPage();
    matchSidebarHeight();
}



function setupVerseInteractions() {
    const isTouchDevice = ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0);

    document.querySelectorAll('.verse-container').forEach(verseContainer => {
        verseContainer.classList.add('no-text-select');

        const surahNumber = parseInt(verseContainer.getAttribute('data-surah'));
        const verseNumber = parseInt(verseContainer.getAttribute('data-ayah'));

        let tafsirTimer = null;
        let touchStartTime = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        let touchMoved = false;
        let isPotentialScroll = false;

        const highlightVerse = () => {
            document.querySelectorAll('.verse-container').forEach(v => {
                v.classList.remove('active-verse');
            });
            verseContainer.classList.add('active-verse');
        };

        if (isTouchDevice) {
            /* ===== MOBILE/TOUCH HANDLING ===== */
            verseContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
            verseContainer.addEventListener('touchmove', handleTouchMove, { passive: true });
            verseContainer.addEventListener('touchend', handleTouchEnd);
            verseContainer.addEventListener('touchcancel', handleTouchCancel);
        } else {
            /* ===== DESKTOP HANDLING ===== */
            verseContainer.addEventListener('click', handleDesktopClick);
            verseContainer.addEventListener('mouseenter', handleMouseEnter);
            verseContainer.addEventListener('mouseleave', handleMouseLeave);
        }

        function handleTouchStart(e) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchEndX = touchStartX;
            touchEndY = touchStartY;
            touchStartTime = Date.now();
            touchMoved = false;
            isPotentialScroll = false;

            tafsirTimer = setTimeout(() => {
                if (!touchMoved && !isPotentialScroll) {
                    clearSelection();
                    showTafsir(verseContainer, surahNumber, verseNumber);
                }
            }, 500);
        }

        function handleTouchMove(e) {
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;

            touchEndX = currentX;
            touchEndY = currentY;

            const xDiff = Math.abs(currentX - touchStartX);
            const yDiff = Math.abs(currentY - touchStartY);

            if (xDiff > 5 || yDiff > 5) {
                touchMoved = true;

                if (yDiff > xDiff) {
                    isPotentialScroll = true;
                }

                if (tafsirTimer) {
                    clearTimeout(tafsirTimer);
                    tafsirTimer = null;
                }
            }
        }

        function handleTouchEnd(e) {
            const touchDuration = Date.now() - touchStartTime;
            const isTap = !touchMoved && touchDuration < 300;

            const deltaX = Math.abs(touchEndX - touchStartX);
            const deltaY = Math.abs(touchEndY - touchStartY);
            const isHorizontalSwipe = deltaX > deltaY && deltaX > 30;

            if (!isHorizontalSwipe) {
                e.preventDefault();
                e.stopPropagation();
            }

            if (tafsirTimer) {
                clearTimeout(tafsirTimer);
                tafsirTimer = null;
            }

            if (isTap && !isHorizontalSwipe) {
                const isCurrentVersePlaying = currentPlayingSurah === surahNumber &&
                    currentVerseSequence[currentVerseIndex]?.numberInSurah === verseNumber;

                if (isCurrentVersePlaying && !audioPaused) {
                    toggleAudioPlayback();
                } else {
                    highlightVerse();
                    playEntireSurah(surahNumber, { verseNumber: verseNumber });
                    clearSelection();
                }
            }

            touchMoved = false;
            isPotentialScroll = false;
        }

        function handleTouchCancel() {
            if (tafsirTimer) {
                clearTimeout(tafsirTimer);
                tafsirTimer = null;
            }
            touchMoved = false;
            isPotentialScroll = false;
        }

        function handleDesktopClick(e) {
            if (!e.target.closest('.verse-tafsir')) {
                const isCurrentVersePlaying = currentPlayingSurah === surahNumber &&
                    currentVerseSequence[currentVerseIndex]?.numberInSurah === verseNumber;

                if (isCurrentVersePlaying && !audioPaused) {
                    toggleAudioPlayback();
                } else {
                    highlightVerse();
                    playEntireSurah(surahNumber, { verseNumber: verseNumber });
                    clearSelection();
                }
            }
        }

        async function handleMouseEnter() {
            tafsirTimer = setTimeout(async () => {
                await showTafsir(verseContainer, surahNumber, verseNumber);
                tafsirTimer = null;
            }, 1500);
        }

        function handleMouseLeave() {
            if (tafsirTimer) {
                clearTimeout(tafsirTimer);
                tafsirTimer = null;
            }
            hideTafsir(verseContainer);
        }
    });

    function clearSelection() {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        } else if (document.selection) {
            document.selection.empty();
        }
    }
}






// Add this in your initialization code
function setupTafsirCloseHandlers() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-tafsir-btn')) {
            e.stopImmediatePropagation(); // Completely stops event bubbling
            e.preventDefault();

            const tafsir = e.target.closest('.verse-tafsir');
            if (tafsir) {
                tafsir.style.display = 'none';
            }
        }
    }, true); // Use capturing phase
}


// Add to cache with limit
function addToCache(key, value) {
    if (tafsirCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = tafsirCache.keys().next().value;
        tafsirCache.delete(oldestKey);
    }
    tafsirCache.set(key, value);
}

async function showTafsir(verseElement, surahNumber, verseNumber) {
    // Hide any existing tafsir first
    hideTafsir(verseElement);

    // Create tooltip container
    const tooltip = document.createElement('div');
    tooltip.className = 'verse-tafsir';
    verseElement.appendChild(tooltip);

    // Add initial content (with close button)
    tooltip.innerHTML = `
        <div class="verse-tafsir-header">
            تفسير المیسر
            <button class="close-tafsir-btn" aria-label="إغلاق التفسير">×</button>
        </div>
        <div class="tafsir-content">جاري التحميل...</div>
    `;

    // Attach close listener to current button
    const closeButton = tooltip.querySelector('.close-tafsir-btn');
    addCloseButtonListener(closeButton, verseElement);

    const cacheKey = `${surahNumber}:${verseNumber}`;

    try {
        let tafsirData;

        // Check cache first
        if (tafsirCache.has(cacheKey)) {
            tafsirData = tafsirCache.get(cacheKey);
        } else {
            // Fetch tafsir if not in cache
            const response = await fetch(`https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/ar-tafsir-muyassar/${surahNumber}/${verseNumber}.json`);
            tafsirData = await response.json();
            addToCache(cacheKey, tafsirData);
        }

        // Update tooltip content
        tooltip.innerHTML = `
            <div class="verse-tafsir-header">
                تفسير المیسر (${surahNumber}:${verseNumber})
                <button class="close-tafsir-btn" aria-label="إغلاق التفسير">×</button>
            </div>
            <div class="tafsir-content">${tafsirData.text}</div>
        `;

        // Re-attach close button after DOM update
        const newCloseButton = tooltip.querySelector('.close-tafsir-btn');
        addCloseButtonListener(newCloseButton, verseElement);

    } catch (error) {
        tooltip.innerHTML = `
            <div class="verse-tafsir-header">
                تفسير المیسر
                <button class="close-tafsir-btn" aria-label="إغلاق التفسير">×</button>
            </div>
            <div class="tafsir-content">لا يتوفر تفسير لهذه الآية حالياً</div>
        `;

        const newCloseButton = tooltip.querySelector('.close-tafsir-btn');
        addCloseButtonListener(newCloseButton, verseElement);
    }

    // Show and position the tooltip
    tooltip.style.display = 'block';
    positionTafsirTooltip(verseElement, tooltip);
}

function addCloseButtonListener(closeButton, verseElement) {
    const handleCloseClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideTafsir(verseElement);
    };

    closeButton.addEventListener('click', handleCloseClick);
    closeButton.addEventListener('touchstart', handleCloseClick);
}



function hideTafsir(verseElement) {
    document.querySelectorAll('.verse-tafsir').forEach(t => {
        t.style.display = 'none';
    });
}


function positionTafsirTooltip(verseElement, tooltip) {
    const verseRect = verseElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    tooltip.style.display = 'block';
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;

    // ===== RESPONSIVE ADJUSTMENTS ===== //
    let horizontalOffset = 15;
    let maxTooltipWidth = Math.min(300, viewportWidth - 40);
    let verticalOffset = 0;
    const minMargin = 10;

    if (viewportWidth >= 768 && viewportWidth < 1024) {
        maxTooltipWidth = 200;
        horizontalOffset = 20;
    } else if (viewportWidth < 768) {
        maxTooltipWidth = viewportWidth - 50;
        horizontalOffset = 10;
    } else if (viewportWidth >= 1024) {
        maxTooltipWidth = 400;
        horizontalOffset = 25;
    }

    tooltip.style.maxWidth = `${maxTooltipWidth}px`;
    tooltip.style.width = 'auto';
    const effectiveTooltipWidth = Math.min(tooltipWidth, maxTooltipWidth);

    // ===== POSITIONING LOGIC ===== //
    const rightPosition = verseRect.right + horizontalOffset;
    const leftPosition = verseRect.left - horizontalOffset - effectiveTooltipWidth;
    const spaceRight = viewportWidth - verseRect.right - horizontalOffset;
    const spaceLeft = verseRect.left - horizontalOffset;

    let useRightSide;

    if (viewportWidth >= 1024) {
        useRightSide = spaceRight >= effectiveTooltipWidth ||
            (spaceRight >= spaceLeft && spaceRight >= minMargin);
    } else {
        const isRightEdgeVerse = verseRect.right > viewportWidth * 0.7;
        useRightSide = !isRightEdgeVerse && spaceRight >= effectiveTooltipWidth;
    }

    if (useRightSide && (rightPosition + effectiveTooltipWidth > viewportWidth - minMargin)) {
        useRightSide = (leftPosition >= minMargin);
    }

    // ===== FINAL POSITIONING ===== //
    if (viewportWidth < 768) {
        // Centered on mobile
        tooltip.style.left = `${(viewportWidth - effectiveTooltipWidth) / 5}px`;
        tooltip.style.right = 'auto';
    } else {
        if (useRightSide) {
            tooltip.style.left = `${Math.min(rightPosition, viewportWidth - effectiveTooltipWidth - minMargin) - 150}px`;
            tooltip.style.right = 'auto';
        } else {
            tooltip.style.left = `${Math.max(leftPosition, minMargin) - 11}px`;
            tooltip.style.right = 'auto';
        }
    }

    // ===== VERTICAL POSITIONING (unchanged) ===== //
    verticalOffset = (verseRect.height - tooltipHeight) / 2;

    if (verseRect.top + verticalOffset < minMargin) {
        verticalOffset = -verseRect.top + minMargin;
    }
    if (verseRect.bottom + verticalOffset + tooltipHeight > viewportHeight - minMargin) {
        verticalOffset = viewportHeight - verseRect.bottom - tooltipHeight - minMargin;
    }

    tooltip.style.top = `${verseRect.top + verticalOffset}px`;

    // ===== ARROW POSITIONING ===== //
    if (viewportWidth < 768) {
        // Hide arrow or center it optionally for mobile
        tooltip.style.setProperty('--arrow-left', '50%');
        tooltip.style.setProperty('--arrow-border', '10px solid transparent 10px solid #d4af37 10px solid transparent');
    } else if (useRightSide) {
        tooltip.style.setProperty('--arrow-left', '-10px');
        tooltip.style.setProperty('--arrow-border',
            '10px solid transparent 10px solid #d4af37 10px solid transparent');
    } else {
        tooltip.style.setProperty('--arrow-left', 'calc(100% - 1px)');
        tooltip.style.setProperty('--arrow-border',
            '10px solid #d4af37 10px solid transparent 10px solid transparent');
    }
}







function toArabicNumber(num) {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num
        .toString()
        .split('')
        .map(digit => /\d/.test(digit) ? arabicDigits[+digit] : digit)
        .join('');
}


function highlightCurrentVerse(verseElement) {
    if (!verseElement) return;

    verseElement.classList.add('current-playing-verse');

    // Scroll to the verse with smooth behavior
    setTimeout(() => {
        verseElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'start'
        });
    }, 100);

    // Add visual pulse effect
    verseElement.style.animation = 'verse-pulse 2s infinite';
}

function clearVerseHighlights() {
    document.querySelectorAll('.current-playing-verse').forEach(el => {
        el.classList.remove('current-playing-verse');
        el.style.animation = '';
    });
}
function findPageForVerse(surahNumber, ayahNumber) {
    for (let page in pagesData) {
        if (pagesData[page].some(v => v.surahNumber == surahNumber && v.numberInSurah == ayahNumber)) {
            return parseInt(page);
        }
    }
    return currentPageNumber;
}

// async function playVerseAudio(surah, ayah, isSequence = false, onEndedCallback) {
//     if (currentAudio && !audioPaused) {
//         currentAudio.pause();
//         currentAudio = null;
//     }

//     const apiUrl = `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`;

//     try {
//         const response = await fetch(apiUrl);
//         const data = await response.json();

//         if (data.code === 200 && data.data.audio) {
//             currentAudio = new Audio(data.data.audio);

//             if (audioPaused) {
//                 audioPaused = false;
//                 document.querySelector('.stop-audio-btn').innerHTML = `
//                     <svg viewBox="0 0 24 24" width="18" height="18">
//                         <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
//                     </svg>
//                 `;
//             }

//             currentAudio.addEventListener('ended', () => {
//                 if (typeof onEndedCallback === "function") {
//                     onEndedCallback();
//                 }
//             });

//             try {
//                 await currentAudio.play();
//             } catch (err) {
//                 console.warn("Playback interrupted:", err);
//             }

//         }
//     } catch (error) {
//         console.error(`Error fetching audio for ${surah}:${ayah}`, error);
//     }
// }


function toggleAudioPlayback() {
    const stopBtn = document.querySelector('.stop-audio-btn');

    if (currentAudio) {
        if (currentAudio.paused) {
            // Resume playback from where it was paused
            currentAudio.play();
            audioPaused = false;
            stopBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
            `;

            // Only play next verse if we're in sequence mode AND we reached the end
            if (isPlayingEntireSurah && currentAudio.ended) {
                playNextVerseInSequence();
            }
        } else {
            // Pause playback (without resetting position)
            currentAudio.pause();
            audioPaused = true;
            stopBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M8 5v14l11-7z"/>
                </svg>
            `;
        }
    }
}

// Add event listener to stop button
document.querySelector('.stop-audio-btn').addEventListener('click', function () {
    toggleAudioPlayback();
});



// Populate surah list in sidebar
function populateSurahList(surahs) {
    surahListEl.innerHTML = surahs.map(surah => `
        <li class="surah-item" data-surah="${surah.number}">
            <span class="surah-number">${toArabicNumber(surah.number)}</span>
            <span class="surah-name">${surah.name} (${surah.englishName})</span>
        </li>
    `).join('');

    // Add click event listeners to surah items
    document.querySelectorAll('.surah-item').forEach(item => {
        item.addEventListener('click', () => {
            const surahNumber = parseInt(item.getAttribute('data-surah'));
            goToSurah(surahNumber);
            closeSidebar();
        });
    });
}

// Go to first page of a surah
function goToSurah(surahNumber) {
    const surah = surahData.find(s => s.number === surahNumber);
    if (surah && surah.ayahs.length > 0) {
        currentPage = surah.ayahs[0].page;
        renderPage(currentPage);
        highlightActiveSurah(surahNumber);
        window.scrollTo(0, 0);
        // Update browser history
        history.replaceState({ page: currentPage }, '', `?page=${currentPage}`);
    }
    //resize the page 
    matchSidebarHeight();
    // Close sidebar
    closeSidebar();
}



// After rendering a page, detect which surah is visible
function highlightSurahForCurrentPage() {
    if (!pagesData[currentPage] || pagesData[currentPage].length === 0) return;

    const firstVerse = pagesData[currentPage][0];
    highlightActiveSurah(firstVerse.surahNumber);
}

// Highlight the active surah in sidebar
function highlightActiveSurah(surahNumber) {
    // Remove highlight from all surah items
    document.querySelectorAll('.surah-item').forEach(item => {
        item.classList.remove('active-surah');
    });

    // Add highlight to current surah
    const activeSurahItem = document.querySelector(`.surah-item[data-surah="${surahNumber}"]`);
    if (activeSurahItem) {
        activeSurahItem.classList.add('active-surah');

        // Scroll to the surah in sidebar if needed
        activeSurahItem.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }
}

// Toggle sidebar
function toggleSidebar() {
    sidebarEl.classList.toggle('open');
}

function closeSidebar() {
    sidebarEl.classList.remove('open');
}



function setupTafsirClickHandlers() {
    // Handle clicks on tafsir content (prevents bubbling to verse)
    document.addEventListener('click', function (e) {
        if (e.target.closest('.verse-tafsir')) {
            e.stopImmediatePropagation();
        }
    }, true); // Use capturing phase


    document.addEventListener('touchend', function (e) {
        if (e.target.closest('.verse-tafsir')) {
            e.stopImmediatePropagation();
        }
    }, true); // Use capturing phase
}

// Initialize app
async function initApp() {
    try {
        // Load Quran data
        const surahs = await fetchQuranData();
        if (!surahs) {
            quranPageEl.innerHTML = '<p style="text-align:center; padding:2rem;">تعذر تحميل القرآن الكريم. يرجى المحاولة لاحقاً.</p>';
            return;
        }

        surahData = surahs;
        pagesData = organizeVersesByPage(surahs);
        populateSurahList(surahs);

        // Initialize current page with priority:
        // 1. URL parameter
        // 2. localStorage saved page
        // 3. Default to page 1
        const urlParams = new URLSearchParams(window.location.search);
        const pageParam = urlParams.get('page');

        currentPage = (function () {
            try {
                // 1. Check URL parameter first
                if (pageParam && !isNaN(pageParam)) {
                    const page = parseInt(pageParam);
                    if (page >= 1 && page <= totalPages) {
                        return page;
                    }
                }

                // 2. Check localStorage
                const saved = localStorage.getItem('lastVisitedPage');
                if (saved) {
                    // Handle both JSON and number formats
                    if (saved.startsWith('{')) {
                        const data = JSON.parse(saved);
                        // Check expiration (30 days)
                        if (new Date().getTime() - data.timestamp < 30 * 24 * 60 * 60 * 1000) {
                            return Math.max(1, Math.min(data.page, totalPages));
                        }
                    } else {
                        const page = parseInt(saved);
                        if (!isNaN(page)) {
                            return Math.max(1, Math.min(page, totalPages));
                        }
                    }
                }

                // 3. Default to page 1
                return 1;
            } catch (e) {
                console.error('Error initializing page:', e);
                return 1;
            }
        })();

        // Load current page
        await renderPage(currentPage);
        saveCurrentPage(currentPage); // Save initialized page

        // Navigation event listeners
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) navigateToPage(currentPage - 1);

        });

        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) navigateToPage(currentPage + 1);

        });

        // Sidebar controls
        menuButtonEl.addEventListener('click', toggleSidebar);
        closeSidebarEl.addEventListener('click', closeSidebar);

        // Keyboard navigation (fixed arrow directions)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && currentPage < totalPages) {
                e.preventDefault();
                currentPage++;
                renderPage(currentPage);
                saveCurrentPage(currentPage);
                // window.scrollTo({
                //     top: 0,
                //     behavior: 'smooth'
                //   });
                highlightSurahForCurrentPage();


            } else if (e.key === 'ArrowRight' && currentPage > 1) {
                e.preventDefault();
                currentPage--;
                renderPage(currentPage);
                saveCurrentPage(currentPage);
                // window.scrollTo({
                //     top: 0,
                //     behavior: 'smooth'
                //   });
                highlightSurahForCurrentPage();


            } else if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                toggleAudioPlayback();
            } else if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                const selection = window.getSelection();
                if (selection && selection.toString().trim() !== '') {
                    if (document.getElementById('quranPage').contains(selection.anchorNode)) {
                        saveVerseAsImage(selection);
                    }
                }
            }
        });


        document.addEventListener('click', function (e) {
            const isInsideVerse = e.target.closest('.verse-container');
            const isInsideTafsir = e.target.closest('.verse-tafsir');

            if (!isInsideVerse && !isInsideTafsir) {
                // Hide all tafsir tooltips
                document.querySelectorAll('.verse-tafsir').forEach(tooltip => {
                    tooltip.remove();
                });

                // Optionally remove active class
                document.querySelectorAll('.verse-container').forEach(v => {
                    v.classList.remove('active-verse');
                });
            }
        });

        setupTafsirCloseHandlers();
        setupVerseInteractions();
        setupVerseHoverEffects();
        setupTafsirHideOnScroll();
        setupSwipeNavigation();
        setupTafsirClickHandlers();



    } catch (error) {
        console.error('App initialization failed:', error);
        quranPageEl.innerHTML = '<p style="text-align:center; padding:2rem;">حدث خطأ أثناء تحميل التطبيق. يرجى تحديث الصفحة.</p>';
    }
}

// Helper function to save current page
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


async function saveVerseAsImage(selection) {
    try {
        const range = selection.getRangeAt(0);
        // Get the parent element that contains the selected text
        let container = range.startContainer;
        if (container.nodeType === Node.TEXT_NODE) {
            container = container.parentNode;
        }

        // Find the nearest verse container
        const verseContainer = findParentWithClass(container, 'verse-container');
        if (!verseContainer) {
            console.warn('No verse container found for selection');
            return;
        }

        // Create a decorated container
        const decoratedVerse = createDecoratedVerse(verseContainer, selection.toString());

        // Use html2canvas to convert to image
        const html2canvas = await loadHtml2Canvas();

        html2canvas(decoratedVerse, {
            backgroundColor: null,
            scale: 2,
            logging: false,
            allowTaint: true,
            useCORS: true
        }).then(canvas => {
            // Trigger download
            const link = document.createElement('a');
            link.download = `quran-verse-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            // Clean up
            document.body.removeChild(decoratedVerse);
        });
    } catch (error) {
        console.error('Error saving verse as image:', error);
    }
}


function createDecoratedVerse(verseContainer, selectedText) {
    const verseNumber = verseContainer.querySelector('.verse-number')?.textContent;
    const surahName = verseContainer.dataset.surahName || 'السورة';


    const decorated = document.createElement('div');
    decorated.className = 'qv-premium-container';
    decorated.innerHTML = `
        <div class="qv-premium-gold-accent"></div>
        <div class="qv-premium-pattern"></div>
        <div class="qv-premium-corner qv-premium-corner-tl"></div>
        <div class="qv-premium-corner qv-premium-corner-tr"></div>
        <div class="qv-premium-corner qv-premium-corner-bl"></div>
        <div class="qv-premium-corner qv-premium-corner-br"></div>
        
        <div class="qv-premium-header">
            <div class="qv-premium-meta">
                <div class="qv-premium-surah">${surahName}</div>
                <span class="qv-premium-number">آية  ${verseNumber}</span>
            </div>
        </div>
        
        <div class="qv-premium-text">${selectedText}</div>
        
        <div class="qv-premium-footer">
            <div class="qv-premium-decoration"></div>
            <div class="qv-premium-watermark">${new Date().toLocaleDateString('ar-EG')}</div>
        </div>
    `;

    document.body.appendChild(decorated);
    return decorated;
}



function loadHtml2Canvas() {
    return new Promise((resolve) => {
        if (window.html2canvas) {
            showSaveNotification();

            return resolve(window.html2canvas);
        }
        const script = document.createElement('script');
        script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
        script.onload = () => resolve(window.html2canvas);
        document.head.appendChild(script);
    });
}

// Helper function to find parent with specific class
function findParentWithClass(element, className, maxDepth = 5) {
    let current = element;
    let depth = 0;

    while (current && depth < maxDepth) {
        if (current.classList && current.classList.contains(className)) {
            return current;
        }
        current = current.parentNode;
        depth++;
    }
    return null;
}


function showSaveNotification() {
    const notification = document.createElement('div');
    notification.textContent = 'Preparing verse image...';
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 20px';
    notification.style.background = '#2E8B57';
    notification.style.color = 'white';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '1000';
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function updateVerseNumbers() {
    const verseNumbers = document.querySelectorAll('.verse-number');
    verseNumbers.forEach(num => {
        if (isNightMode) {
            num.style.backgroundColor = '#01579b';
            num.style.color = '#b3e5fc';
            num.style.boxShadow = '0 0 0 1px #0288d1';
        } else {
            num.style.backgroundColor = '#e0f7fa';
            num.style.color = '#006064';
            num.style.boxShadow = 'none';
        }
    });
}

function applyNightMode() {
    document.body.classList.toggle('night-mode', isNightMode);
    nightModeToggle.textContent = isNightMode ? '☀️' : '🌙';
    updateVerseNumbers();
    setupVerseHoverEffects();

}

// Initialize
applyNightMode();

// Toggle handler
nightModeToggle.addEventListener('click', () => {
    isNightMode = !isNightMode;
    localStorage.setItem('nightMode', isNightMode);
    applyNightMode();
});

// Call this after loading new verses
function onVersesLoaded() {
    updateVerseNumbers();
}



function setupVerseHoverEffects() {
    const verses = document.querySelectorAll('.verse');

    verses.forEach(verse => {
        verse.addEventListener('mouseenter', function () {
            if (document.body.classList.contains('night-mode')) {
                this.style.setProperty('--glow-intensity', '0.6');
            }
        });

        verse.addEventListener('mouseleave', function () {
            this.style.setProperty('--glow-intensity', '0');
        });
    });
}


// Start the application
initApp();
