/*
 * Last Read — Continue Reading (Last Read Position)
 * Enhanced with:
 *   - Manual Set/Remove Last Read controls
 *   - Automatic vs Manual priority
 *   - Once-per-session Continue Reading card
 *   - Verse number ornament highlighting
 *   - Surah list indicator
 *   - IntersectionObserver with 40% center band + 50% threshold
 *   - 1000ms dwell time before saving
 *   - IndexedDB + localStorage dual storage
 *   - MutationObserver-based cross-page navigation
 *   - Audio integration
 *   - Input validation + error recovery
 *   - DOM-based card rendering (no innerHTML XSS)
 *   - Arabic + English relative timestamps
 */

/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════ */

const LAST_READ_DB_NAME = 'QuranLastReadDB';
const LAST_READ_STORE = 'position';
const LAST_READ_LS_KEY = 'quran-last-read';
const LAST_READ_DISMISS_KEY = 'last-read-dismissed';
const LAST_READ_DISMISS_VKEY = 'last-read-dismissed-verse';
const LAST_READ_SESSION_KEY = 'last-read-session-shown';
const LAST_READ_AUTO_KEY = 'last-read-auto-tracking';
const DWELL_TIME_MS = 1000;
const SAVE_THROTTLE_MS = 3000;
const NAVIGATION_TIMEOUT_MS = 3000;

/* ═══════════════════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════════════════ */

let _lastReadObserver = null;
let _dwellTimer = null;
let _dwellVerse = null;
let _lastSaveTime = 0;
let _lastSavedKey = null;
let _surahInfoCache = null;
let _audioTrackingActive = false;

/* ═══════════════════════════════════════════════════════════════════
   SURAH INFO CACHE (O(1) lookup instead of O(114) find)
   ═══════════════════════════════════════════════════════════════════ */

function _buildSurahCache() {
    if (_surahInfoCache) return;
    if (!surahData || !Array.isArray(surahData)) return;
    _surahInfoCache = new Map();
    surahData.forEach(s => {
        _surahInfoCache.set(s.number, { arabicName: s.name, englishName: s.englishName });
    });
}

function getLastReadSurahInfo(surahNumber) {
    _buildSurahCache();
    if (!_surahInfoCache) return null;
    return _surahInfoCache.get(surahNumber) || null;
}

/* ═══════════════════════════════════════════════════════════════════
   DATA VALIDATION
   ═══════════════════════════════════════════════════════════════════ */

function validateLastReadData(data) {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.surahNumber !== 'number' || data.surahNumber < 1 || data.surahNumber > 114) return false;
    if (typeof data.ayahNumber !== 'number' || data.ayahNumber < 1 || data.ayahNumber > 286) return false;
    if (typeof data.pageNumber !== 'number' || data.pageNumber < 1 || data.pageNumber > 604) return false;
    if (typeof data.timestamp !== 'number' || data.timestamp <= 0) return false;
    return true;
}

function _sanitizeData(raw) {
    try {
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (validateLastReadData(data)) return data;
    } catch (e) { /* corrupted */ }
    return null;
}

/* ═══════════════════════════════════════════════════════════════════
   IndexedDB STORAGE (primary)
   ═══════════════════════════════════════════════════════════════════ */

function _openLastReadDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(LAST_READ_DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(LAST_READ_STORE)) {
                db.createObjectStore(LAST_READ_STORE, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function _saveToIDB(data) {
    try {
        const db = await _openLastReadDB();
        const tx = db.transaction(LAST_READ_STORE, 'readwrite');
        tx.objectStore(LAST_READ_STORE).put({ id: 'current', ...data });
        return new Promise((resolve) => { tx.oncomplete = resolve; tx.onerror = resolve; });
    } catch (e) {
        console.warn('[LastRead] IndexedDB save failed:', e);
    }
}

async function _loadFromIDB() {
    try {
        const db = await _openLastReadDB();
        const tx = db.transaction(LAST_READ_STORE, 'readonly');
        const req = tx.objectStore(LAST_READ_STORE).get('current');
        return new Promise((resolve) => {
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch (e) {
        return null;
    }
}

/* ═══════════════════════════════════════════════════════════════════
   DUAL STORAGE (IndexedDB + localStorage fallback)
   ═══════════════════════════════════════════════════════════════════ */

function getLastRead() {
    try {
        const raw = localStorage.getItem(LAST_READ_LS_KEY);
        return _sanitizeData(raw);
    } catch (e) {
        return null;
    }
}

function saveLastRead(data) {
    if (!validateLastReadData(data)) return;

    const key = `${data.surahNumber}:${data.ayahNumber}`;
    if (key === _lastSavedKey && Date.now() - _lastSaveTime < SAVE_THROTTLE_MS) return;

    _lastSavedKey = key;
    _lastSaveTime = Date.now();

    try {
        localStorage.setItem(LAST_READ_LS_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('[LastRead] localStorage save failed:', e.message);
    }

    _saveToIDB(data);
}

function clearLastRead() {
    try { localStorage.removeItem(LAST_READ_LS_KEY); } catch (e) { /* */ }
    try {
        _openLastReadDB().then(db => {
            const tx = db.transaction(LAST_READ_STORE, 'readwrite');
            tx.objectStore(LAST_READ_STORE).delete('current');
        });
    } catch (e) { /* */ }
}

/* ═══════════════════════════════════════════════════════════════════
   MANUAL vs AUTOMATIC TRACKING
   ═══════════════════════════════════════════════════════════════════ */

function isAutoTrackingEnabled() {
    const val = localStorage.getItem(LAST_READ_AUTO_KEY);
    return val !== 'false';
}

function setAutoTrackingEnabled(enabled) {
    localStorage.setItem(LAST_READ_AUTO_KEY, enabled ? 'true' : 'false');
}

function isManualLastRead() {
    const data = getLastRead();
    return data && data.mode === 'manual';
}

/* ═══════════════════════════════════════════════════════════════════
   MANUAL SET / REMOVE LAST READ
   ═══════════════════════════════════════════════════════════════════ */

function setManualLastRead(surahNumber, ayahNumber) {
    const surahInfo = getLastReadSurahInfo(surahNumber);
    const verseEl = document.querySelector(
        `.verse-container[data-surah="${surahNumber}"][data-ayah="${ayahNumber}"]`
    );
    let pageNumber = currentPageNumber;
    if (verseEl) {
        const pageContent = document.querySelector('.quran-page-content');
        if (pageContent) pageNumber = currentPageNumber;
    }

    const data = {
        surahNumber: surahNumber,
        surahName: surahInfo ? surahInfo.arabicName : '',
        englishSurahName: surahInfo ? surahInfo.englishName : '',
        pageNumber: pageNumber,
        ayahNumber: ayahNumber,
        verseKey: `${surahNumber}:${ayahNumber}`,
        mode: 'manual',
        timestamp: Date.now()
    };

    saveLastRead(data);

    _lastSavedKey = `${surahNumber}:${ayahNumber}`;
    _lastSaveTime = Date.now();

    _applyLastReadHighlight();
    updateLastReadMarker();
    updateCard();
    updateSurahListLastReadIndicator();
    updateVerseLastReadButton(surahNumber, ayahNumber);

    showToast('تم تعيين كآخر موضع قراءة');
}

function removeManualLastRead() {
    const data = getLastRead();
    if (!data) return;

    setAutoTrackingEnabled(true);
    clearLastRead();

    document.querySelectorAll('.verse-container.last-read-verse').forEach(el => {
        el.classList.remove('last-read-verse');
        el.removeAttribute('aria-current');
    });

    const verseEl = document.querySelector(
        `.verse-container[data-surah="${data.surahNumber}"][data-ayah="${data.ayahNumber}"]`
    );
    if (verseEl) {
        updateVerseLastReadButton(data.surahNumber, data.ayahNumber);
    }

    updateCard();
    updateSurahListLastReadIndicator();

    showToast('تمت إزالة علامة آخر قراءة');
}

/* ═══════════════════════════════════════════════════════════════════
   VERSE TOOLBAR — Last Read Button Update
   ═══════════════════════════════════════════════════════════════════ */

function updateVerseLastReadButton(surahNumber, ayahNumber) {
    const verseEl = document.querySelector(
        `.verse-container[data-surah="${surahNumber}"][data-ayah="${ayahNumber}"]`
    );
    if (!verseEl) return;

    const btn = verseEl.querySelector('.verse-lastread-btn');
    if (!btn) return;

    const data = getLastRead();
    const isLastRead = data && data.surahNumber === surahNumber && data.ayahNumber === ayahNumber;

    if (isLastRead) {
        btn.textContent = '❌';
        btn.title = 'إزالة علامة آخر قراءة';
        btn.setAttribute('aria-label', 'إزالة علامة آخر قراءة');
        btn.classList.add('is-lastread');
    } else {
        btn.textContent = '📍';
        btn.title = 'تعيين كآخر موضع قراءة';
        btn.setAttribute('aria-label', 'تعيين كآخر موضع قراءة');
        btn.classList.remove('is-lastread');
    }
}

function _setupLastReadButtonAction(btn, surahNumber, ayahNumber) {
    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const data = getLastRead();
        const isLastRead = data && data.surahNumber === surahNumber && data.ayahNumber === ayahNumber;

        if (isLastRead) {
            removeManualLastRead();
        } else {
            setManualLastRead(surahNumber, ayahNumber);
        }
    });
}

/* ═══════════════════════════════════════════════════════════════════
   RELATIVE TIME FORMATTING (Arabic + English)
   ═══════════════════════════════════════════════════════════════════ */

function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);

    const isArabic = document.documentElement.getAttribute('dir') === 'rtl';

    if (secs < 60) return isArabic ? 'الآن' : 'Just now';

    if (mins < 60) {
        if (isArabic) {
            if (mins === 1) return 'منذ دقيقة';
            if (mins === 2) return 'منذ دقيقتين';
            if (mins <= 10) return `منذ ${toArabicNumber(mins)} دقائق`;
            if (mins <= 19) return `منذ ${toArabicNumber(mins)} دقيقة`;
            const ones = mins % 10;
            if (ones === 0 || ones === 1) return `منذ ${toArabicNumber(mins)} دقيقة`;
            if (ones === 2) return `منذ ${toArabicNumber(mins)} دقيقتين`;
            return `منذ ${toArabicNumber(mins)} دقائق`;
        }
        return mins === 1 ? '1 minute ago' : `${mins} minutes ago`;
    }

    if (hrs < 24) {
        if (isArabic) {
            if (hrs === 1) return 'منذ ساعة';
            if (hrs === 2) return 'منذ ساعتين';
            if (hrs <= 10) return `منذ ${toArabicNumber(hrs)} ساعات`;
            if (hrs <= 19) return `منذ ${toArabicNumber(hrs)} ساعة`;
            const ones = hrs % 10;
            if (ones === 0 || ones === 1) return `منذ ${toArabicNumber(hrs)} ساعة`;
            if (ones === 2) return `منذ ${toArabicNumber(hrs)} ساعتين`;
            return `منذ ${toArabicNumber(hrs)} ساعات`;
        }
        return hrs === 1 ? '1 hour ago' : `${hrs} hours ago`;
    }

    if (days === 1) return isArabic ? 'أمس' : 'Yesterday';
    if (days <= 30) {
        if (isArabic) {
            if (days <= 10) return `منذ ${toArabicNumber(days)} أيام`;
            const ones = days % 10;
            if (ones === 0 || ones === 1) return `منذ ${toArabicNumber(days)} يوم`;
            if (ones === 2) return `منذ ${toArabicNumber(days)} يومين`;
            return `منذ ${toArabicNumber(days)} أيام`;
        }
        return `${days} days ago`;
    }

    const d = new Date(timestamp);
    return isArabic
        ? d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ═══════════════════════════════════════════════════════════════════
   CONTINUE READING CARD — Once Per Session
   ═══════════════════════════════════════════════════════════════════ */

function renderContinueReadingCard() {
    const container = document.getElementById('continueReadingCard');
    if (!container) return;
    container.innerHTML = '';

    const data = getLastRead();
    if (!data || !data.surahNumber) return;

    if (sessionStorage.getItem(LAST_READ_SESSION_KEY)) return;

    const dismissed = localStorage.getItem(LAST_READ_DISMISS_KEY);
    const dismissedVerse = localStorage.getItem(LAST_READ_DISMISS_VKEY);
    const currentKey = `${data.surahNumber}:${data.ayahNumber}`;

    if (dismissed && dismissedVerse === currentKey) return;

    const surahInfo = getLastReadSurahInfo(data.surahNumber);
    const surahName = surahInfo ? surahInfo.arabicName : (data.surahName || '');
    const relTime = formatRelativeTime(data.timestamp);

    const card = document.createElement('div');
    card.className = 'last-read-card';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', 'متابعة القراءة');

    const icon = document.createElement('div');
    icon.className = 'last-read-card-icon';
    icon.textContent = '\u{1F4D6}';
    icon.setAttribute('aria-hidden', 'true');

    const body = document.createElement('div');
    body.className = 'last-read-card-body';

    const label = document.createElement('p');
    label.className = 'last-read-card-label';
    label.textContent = 'متابعة القراءة';

    const title = document.createElement('p');
    title.className = 'last-read-card-title';
    title.textContent = surahName;

    const meta = document.createElement('p');
    meta.className = 'last-read-card-meta';
    const modeLabel = data.mode === 'manual' ? 'آخر قراءة' : 'آخر قراءة';
    meta.textContent = `الآية ${toArabicNumber(data.ayahNumber)} \u2022 ${relTime}`;

    body.appendChild(label);
    body.appendChild(title);
    body.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'last-read-card-actions';

    const continueBtn = document.createElement('button');
    continueBtn.className = 'last-read-continue-btn';
    continueBtn.textContent = '\u25B6 متابعة';
    continueBtn.setAttribute('aria-label', 'متابعة القراءة من الآية ' + toArabicNumber(data.ayahNumber));
    continueBtn.addEventListener('click', () => continueReading());

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'last-read-dismiss-btn';
    dismissBtn.textContent = '\u00D7';
    dismissBtn.setAttribute('aria-label', 'إخفاء');
    dismissBtn.addEventListener('click', () => dismissLastReadCard());

    actions.appendChild(continueBtn);
    actions.appendChild(dismissBtn);

    card.appendChild(icon);
    card.appendChild(body);
    card.appendChild(actions);
    container.appendChild(card);

    sessionStorage.setItem(LAST_READ_SESSION_KEY, '1');
}

function dismissLastReadCard() {
    const card = document.querySelector('.last-read-card');
    if (!card) return;

    const data = getLastRead();
    if (data) {
        localStorage.setItem(LAST_READ_DISMISS_VKEY, `${data.surahNumber}:${data.ayahNumber}`);
    }
    localStorage.setItem(LAST_READ_DISMISS_KEY, Date.now().toString());
    sessionStorage.setItem(LAST_READ_SESSION_KEY, '1');

    card.classList.add('dismissing');
    setTimeout(() => {
        const container = document.getElementById('continueReadingCard');
        if (container) container.innerHTML = '';
    }, 350);
}

function updateCard() {
    const data = getLastRead();
    if (!data) return;

    const titleEl = document.querySelector('.last-read-card-title');
    const metaEl = document.querySelector('.last-read-card-meta');
    if (!titleEl || !metaEl) return;

    const surahInfo = getLastReadSurahInfo(data.surahNumber);
    if (surahInfo) titleEl.textContent = surahInfo.arabicName;
    metaEl.textContent = `الآية ${toArabicNumber(data.ayahNumber)} \u2022 ${formatRelativeTime(data.timestamp)}`;
}

/* ═══════════════════════════════════════════════════════════════════
   NAVIGATION — Continue Reading
   ═══════════════════════════════════════════════════════════════════ */

function continueReading() {
    const data = getLastRead();
    if (!data || !data.surahNumber) return;

    dismissLastReadCard();

    if (data.pageNumber === currentPageNumber) {
        scrollToVerse(data.surahNumber, data.ayahNumber, true);
    } else {
        navigateToPage(data.pageNumber);
        _waitForRenderAndScroll(data.surahNumber, data.ayahNumber);
    }
}

function _waitForRenderAndScroll(surahNumber, ayahNumber) {
    let resolved = false;

    const verseEl = document.querySelector(
        `.verse-container[data-surah="${surahNumber}"][data-ayah="${ayahNumber}"]`
    );
    if (verseEl) {
        scrollToVerse(surahNumber, ayahNumber, true);
        return;
    }

    const observer = new MutationObserver(() => {
        if (resolved) return;
        const el = document.querySelector(
            `.verse-container[data-surah="${surahNumber}"][data-ayah="${ayahNumber}"]`
        );
        if (el) {
            resolved = true;
            observer.disconnect();
            requestAnimationFrame(() => scrollToVerse(surahNumber, ayahNumber, true));
        }
    });

    observer.observe(quranPageEl, { childList: true, subtree: true });

    setTimeout(() => {
        if (!resolved) {
            resolved = true;
            observer.disconnect();
            showToast('تعذر العثور على الآية');
        }
    }, NAVIGATION_TIMEOUT_MS);
}

function scrollToVerse(surahNumber, ayahNumber, animate) {
    const verseEl = document.querySelector(
        `.verse-container[data-surah="${surahNumber}"][data-ayah="${ayahNumber}"]`
    );
    if (!verseEl) {
        showToast('تعذر العثور على الآية');
        return;
    }

    verseEl.scrollIntoView({ behavior: animate ? 'smooth' : 'auto', block: 'center' });

    if (animate) {
        const verseNumEl = verseEl.querySelector('.verse-number');
        if (verseNumEl) {
            verseNumEl.classList.remove('last-read-ornament-pulse');
            void verseNumEl.offsetWidth;
            verseNumEl.classList.add('last-read-ornament-pulse');
            setTimeout(() => verseNumEl.classList.remove('last-read-ornament-pulse'), 2200);
        }
    }
}

/* ═══════════════════════════════════════════════════════════════════
   VERSE NUMBER ORNAMENT HIGHLIGHTING
   ═══════════════════════════════════════════════════════════════════ */

function _applyLastReadHighlight() {
    document.querySelectorAll('.verse-container.last-read-verse').forEach(el => {
        el.classList.remove('last-read-verse');
        el.removeAttribute('aria-current');
    });

    document.querySelectorAll('.verse-number.last-read-ornament').forEach(el => {
        el.classList.remove('last-read-ornament');
    });

    const data = getLastRead();
    if (!data || !data.surahNumber) return;

    const verseEl = document.querySelector(
        `.verse-container[data-surah="${data.surahNumber}"][data-ayah="${data.ayahNumber}"]`
    );
    if (!verseEl) return;

    verseEl.classList.add('last-read-verse');
    verseEl.setAttribute('aria-current', 'true');

    const verseNumEl = verseEl.querySelector('.verse-number');
    if (verseNumEl) {
        verseNumEl.classList.add('last-read-ornament');
    }
}

/* ═══════════════════════════════════════════════════════════════════
   INTERSECTION OBSERVER — Reading Detection
   ═══════════════════════════════════════════════════════════════════ */

function trackReadingPosition() {
    if (_lastReadObserver) {
        _lastReadObserver.disconnect();
        _lastReadObserver = null;
    }
    _cancelDwell();

    const verses = quranPageEl?.querySelectorAll('.verse-container');
    if (!verses || verses.length === 0) return;

    _lastReadObserver = new IntersectionObserver(_onIntersection, {
        root: quranPageEl,
        rootMargin: '-30% 0px -30% 0px',
        threshold: 0.5
    });

    verses.forEach(v => _lastReadObserver.observe(v));
}

function _onIntersection(entries) {
    if (_audioTrackingActive || window._isAudioNavigation) return;

    if (isManualLastRead() || !isAutoTrackingEnabled()) return;

    let bestEntry = null;
    let bestRatio = 0;

    for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestEntry = entry;
        }
    }

    if (!bestEntry) {
        _cancelDwell();
        return;
    }

    const el = bestEntry.target;
    const surah = parseInt(el.getAttribute('data-surah'));
    const ayah = parseInt(el.getAttribute('data-ayah'));
    if (isNaN(surah) || isNaN(ayah)) return;

    const verseKey = `${surah}:${ayah}`;
    if (verseKey === _dwellVerse) return;

    _cancelDwell();
    _dwellVerse = verseKey;

    _dwellTimer = setTimeout(() => {
        _dwellTimer = null;
        _dwellVerse = null;
        _savePosition(surah, ayah);
    }, DWELL_TIME_MS);
}

function _cancelDwell() {
    if (_dwellTimer) {
        clearTimeout(_dwellTimer);
        _dwellTimer = null;
    }
    _dwellVerse = null;
}

function _savePosition(surahNumber, ayahNumber) {
    const surahInfo = getLastReadSurahInfo(surahNumber);

    saveLastRead({
        surahNumber: surahNumber,
        surahName: surahInfo ? surahInfo.arabicName : '',
        englishSurahName: surahInfo ? surahInfo.englishName : '',
        pageNumber: currentPageNumber,
        ayahNumber: ayahNumber,
        verseKey: `${surahNumber}:${ayahNumber}`,
        mode: 'auto',
        timestamp: Date.now()
    });

    updateCard();
}

/* ═══════════════════════════════════════════════════════════════════
   AUDIO INTEGRATION
   ═══════════════════════════════════════════════════════════════════ */

function onAudioVerseChange(surahNumber, verseNumber) {
    _audioTrackingActive = true;

    if (isManualLastRead() || !isAutoTrackingEnabled()) {
        setTimeout(() => { _audioTrackingActive = false; }, 2000);
        return;
    }

    _savePosition(surahNumber, verseNumber);

    setTimeout(() => { _audioTrackingActive = false; }, 2000);
}

/* ═══════════════════════════════════════════════════════════════════
   MARKER UPDATE (called after renderPage)
   ═══════════════════════════════════════════════════════════════════ */

function updateLastReadMarker() {
    _applyLastReadHighlight();

    const data = getLastRead();
    if (!data || !data.surahNumber) return;
    if (data.pageNumber !== currentPageNumber) return;
}

/* ═══════════════════════════════════════════════════════════════════
   SURAH LIST LAST READ INDICATOR
   ═══════════════════════════════════════════════════════════════════ */

function updateSurahListLastReadIndicator() {
    document.querySelectorAll('.surah-item').forEach(item => {
        item.classList.remove('has-last-read');
        const indicator = item.querySelector('.surah-lastread-indicator');
        if (indicator) indicator.remove();
    });

    const data = getLastRead();
    if (!data || !data.surahNumber) return;

    const surahItem = document.querySelector(`.surah-item[data-surah="${data.surahNumber}"]`);
    if (!surahItem) return;

    surahItem.classList.add('has-last-read');

    const indicator = document.createElement('span');
    indicator.className = 'surah-lastread-indicator';
    indicator.textContent = '📖';
    indicator.setAttribute('aria-label', 'آخر قراءة');
    surahItem.appendChild(indicator);
}

/* ═══════════════════════════════════════════════════════════════════
   GO TO SURAH — With Auto-Scroll to Last Read
   ═══════════════════════════════════════════════════════════════════ */

function goToSurahWithLastRead(surahNumber) {
    const data = getLastRead();
    if (data && data.surahNumber === surahNumber) {
        const targetSurah = surahData.find(s => s.number === surahNumber);
        if (targetSurah && targetSurah.ayahs.length > 0) {
            currentPage = data.pageNumber;
            renderPage(currentPage);
            highlightActiveSurah(surahNumber);
            window.scrollTo(0, 0);
            history.replaceState({ page: currentPage }, '', `?page=${currentPage}`);

            setTimeout(() => {
                _applyLastReadHighlight();
                scrollToVerse(data.surahNumber, data.ayahNumber, true);
            }, 200);
        }
        matchSidebarHeight();
        closeSidebar();
        return true;
    }
    return false;
}

/* ═══════════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════════ */

function initLastRead() {
    _buildSurahCache();
    renderContinueReadingCard();
    trackReadingPosition();
    updateLastReadMarker();
    updateSurahListLastReadIndicator();
}
