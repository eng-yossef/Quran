/*
 * Bookmarks — Manual verse bookmarking with manager panel
 * Features: Add/remove/toggle, sort (newest/oldest/surah), share/copy/note/delete per bookmark,
 * render-complete navigation via MutationObserver, IndexedDB backup + localStorage.
 */

const BOOKMARKS_KEY = 'quran-bookmarks';
let _bookmarksSort = 'newest';

/* ═══════════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════════ */

function initBookmarks() {
    const bookmarksBtn = document.getElementById('bookmarksBtn');
    const bookmarksPanel = document.getElementById('bookmarksPanel');
    const bookmarksCloseBtn = document.getElementById('bookmarksCloseBtn');

    bookmarksBtn.addEventListener('click', toggleBookmarksPanel);
    bookmarksCloseBtn.addEventListener('click', closeBookmarksPanel);

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('bookmarks-overlay-bg')) {
            closeBookmarksPanel();
        }
    });

    updateBookmarkIcons();
}

/* ═══════════════════════════════════════════════════════════════════
   PANEL TOGGLE
   ═══════════════════════════════════════════════════════════════════ */

function toggleBookmarksPanel() {
    const panel = document.getElementById('bookmarksPanel');
    if (panel.classList.contains('active')) {
        closeBookmarksPanel();
    } else {
        openBookmarksPanel();
    }
}

function openBookmarksPanel() {
    const panel = document.getElementById('bookmarksPanel');
    const overlay = document.getElementById('bookmarksOverlay');
    panel.classList.add('active');
    if (overlay) overlay.classList.add('active');
    renderBookmarksList();
}

function closeBookmarksPanel() {
    const panel = document.getElementById('bookmarksPanel');
    const overlay = document.getElementById('bookmarksOverlay');
    panel.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

/* ═══════════════════════════════════════════════════════════════════
   STORAGE
   ═══════════════════════════════════════════════════════════════════ */

function getBookmarks() {
    try {
        return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

function saveBookmarks(bookmarks) {
    try {
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch (e) {
        console.warn('[Bookmarks] localStorage save failed:', e.message);
    }
}

function isBookmarked(surahNumber, verseNumber) {
    const bookmarks = getBookmarks();
    return bookmarks.some(b => b.surahNumber === surahNumber && b.verseNumber === verseNumber);
}

/* ═══════════════════════════════════════════════════════════════════
   CRUD
   ═══════════════════════════════════════════════════════════════════ */

function addBookmark(surahNumber, verseNumber, surahName, verseText) {
    const bookmarks = getBookmarks();
    if (isBookmarked(surahNumber, verseNumber)) return;

    bookmarks.push({
        id: Date.now(),
        surahNumber,
        verseNumber,
        surahName,
        verseText,
        verseKey: `${surahNumber}:${verseNumber}`,
        note: '',
        timestamp: new Date().toISOString()
    });

    saveBookmarks(bookmarks);
    updateBookmarkIcons();
    showToast('تمت الإضافة إلى المفضلة');
}

function removeBookmark(surahNumber, verseNumber) {
    let bookmarks = getBookmarks();
    bookmarks = bookmarks.filter(b => !(b.surahNumber === surahNumber && b.verseNumber === verseNumber));
    saveBookmarks(bookmarks);
    updateBookmarkIcons();
    renderBookmarksList();
    showToast('تمت الإزالة من المفضلة');
}

function updateBookmarkNote(id, note) {
    const bookmarks = getBookmarks();
    const bookmark = bookmarks.find(b => b.id === id);
    if (bookmark) {
        bookmark.note = note;
        saveBookmarks(bookmarks);
        renderBookmarksList();
    }
}

function toggleBookmark(surahNumber, verseNumber, surahName, verseText) {
    if (isBookmarked(surahNumber, verseNumber)) {
        removeBookmark(surahNumber, verseNumber);
    } else {
        addBookmark(surahNumber, verseNumber, surahName, verseText);
    }
}

/* ═══════════════════════════════════════════════════════════════════
   NAVIGATION (render-complete via MutationObserver)
   ═══════════════════════════════════════════════════════════════════ */

function navigateToBookmark(surahNumber, verseNumber) {
    closeBookmarksPanel();

    const targetPage = getVersePage(surahNumber, verseNumber);

    if (targetPage === currentPageNumber) {
        _scrollToBookmarkVerse(surahNumber, verseNumber);
    } else {
        navigateToPage(targetPage);
        _waitForRenderAndScrollToVerse(surahNumber, verseNumber);
    }
}

function _waitForRenderAndScrollToVerse(surahNumber, verseNumber) {
    let resolved = false;

    const check = () => {
        const el = document.querySelector(
            `.verse-container[data-surah="${surahNumber}"][data-ayah="${verseNumber}"]`
        );
        if (el) {
            resolved = true;
            _scrollToBookmarkVerse(surahNumber, verseNumber);
            return true;
        }
        return false;
    };

    if (check()) return;

    const observer = new MutationObserver(() => {
        if (resolved) return;
        if (check()) observer.disconnect();
    });

    observer.observe(quranPageEl, { childList: true, subtree: true });

    setTimeout(() => {
        if (!resolved) {
            resolved = true;
            observer.disconnect();
            if (!check()) showToast('تعذر العثور على الآية');
        }
    }, 3000);
}

function _scrollToBookmarkVerse(surahNumber, verseNumber) {
    const verseEl = document.querySelector(
        `.verse-container[data-surah="${surahNumber}"][data-ayah="${verseNumber}"]`
    );
    if (!verseEl) {
        showToast('تعذر العثور على الآية');
        return;
    }

    verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    verseEl.classList.add('search-highlight');
    setTimeout(() => verseEl.classList.remove('search-highlight'), 3000);
}

/* ═══════════════════════════════════════════════════════════════════
   RENDER BOOKMARKS LIST
   ═══════════════════════════════════════════════════════════════════ */

function renderBookmarksList() {
    const container = document.getElementById('bookmarksList');
    const statsContainer = document.getElementById('bookmarksStats');
    const bookmarks = getBookmarks();

    statsContainer.innerHTML = `
        <div class="bookmarks-stat">
            <div class="bookmarks-stat-num">${bookmarks.length}</div>
            <div>المفضلة</div>
        </div>
        <div class="bookmarks-stat">
            <div class="bookmarks-stat-num">${new Set(bookmarks.map(b => b.surahNumber)).size}</div>
            <div>سورة</div>
        </div>
    `;

    if (bookmarks.length === 0) {
        container.innerHTML = `
            <div class="bookmarks-empty">
                <div class="bookmarks-empty-icon">\u{1F4D1}</div>
                <p>لا توجد مفضلة بعد</p>
                <p style="font-size: 0.85rem; color: #aaa;">اضغط على أيقونة المفضلة بجانب أي آية لإضافتها</p>
            </div>
        `;
        return;
    }

    let html = '';

    html += `<div class="bookmarks-sort">
        <button class="sort-btn${_bookmarksSort === 'newest' ? ' active' : ''}" data-sort="newest">الأحدث</button>
        <button class="sort-btn${_bookmarksSort === 'oldest' ? ' active' : ''}" data-sort="oldest">الأقدم</button>
        <button class="sort-btn${_bookmarksSort === 'surah' ? ' active' : ''}" data-sort="surah">حسب السورة</button>
    </div>`;

    const sorted = [...bookmarks];
    if (_bookmarksSort === 'newest') {
        sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (_bookmarksSort === 'oldest') {
        sorted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else {
        sorted.sort((a, b) => a.surahNumber - b.surahNumber || a.verseNumber - b.verseNumber);
    }

    sorted.forEach(bookmark => {
        const date = new Date(bookmark.timestamp).toLocaleDateString('ar');
        const versePreview = (bookmark.verseText || '').substring(0, 80);
        const noteHtml = bookmark.note
            ? `<div class="bookmark-item-note">${_escapeHtml(bookmark.note)}</div>`
            : '';

        html += `
        <div class="bookmark-item" data-surah="${bookmark.surahNumber}" data-verse="${bookmark.verseNumber}">
            <div class="bookmark-item-header">
                <span class="bookmark-item-surah">${_escapeHtml(bookmark.surahName)} \u2014 آية ${toArabicNumber(bookmark.verseNumber)}</span>
                <span class="bookmark-item-date">${date}</span>
            </div>
            <div class="bookmark-item-text">${_escapeHtml(versePreview)}${versePreview.length >= 80 ? '...' : ''}</div>
            ${noteHtml}
            <div class="bookmark-item-actions">
                <button class="bookmark-action-btn" data-action="open" data-surah="${bookmark.surahNumber}" data-verse="${bookmark.verseNumber}">\u{1F4D6} فتح</button>
                <button class="bookmark-action-btn" data-action="share" data-surah="${bookmark.surahNumber}" data-verse="${bookmark.verseNumber}">\u{1F4E4} مشاركة</button>
                <button class="bookmark-action-btn" data-action="copy" data-surah="${bookmark.surahNumber}" data-verse="${bookmark.verseNumber}">\u{1F4CB} نسخ</button>
                <button class="bookmark-action-btn" data-action="note" data-id="${bookmark.id}" data-note="${_escapeAttr(bookmark.note || '')}">\u{1F4DD} ملاحظة</button>
                <button class="bookmark-action-btn delete" data-action="delete" data-surah="${bookmark.surahNumber}" data-verse="${bookmark.verseNumber}">\u{1F5D1}\uFE0F حذف</button>
            </div>
        </div>`;
    });

    container.innerHTML = html;

    container.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            _bookmarksSort = btn.getAttribute('data-sort');
            renderBookmarksList();
        });
    });

    container.querySelectorAll('.bookmark-item-actions').forEach(actions => {
        actions.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            e.stopPropagation();
            _handleBookmarkAction(btn);
        });
    });

    container.querySelectorAll('.bookmark-item').forEach(item => {
        item.addEventListener('click', () => {
            const surah = parseInt(item.getAttribute('data-surah'));
            const verse = parseInt(item.getAttribute('data-verse'));
            navigateToBookmark(surah, verse);
        });
    });
}

function _handleBookmarkAction(btn) {
    const action = btn.getAttribute('data-action');
    const surah = parseInt(btn.getAttribute('data-surah'));
    const verse = parseInt(btn.getAttribute('data-verse'));

    switch (action) {
        case 'open':
            navigateToBookmark(surah, verse);
            break;
        case 'share':
            if (typeof shareVerse === 'function') shareVerse(surah, verse);
            break;
        case 'copy':
            if (typeof copyVerseText === 'function') copyVerseText(surah, verse);
            break;
        case 'note': {
            const id = parseInt(btn.getAttribute('data-id'));
            const currentNote = btn.getAttribute('data-note') || '';
            promptBookmarkNote(id, currentNote);
            break;
        }
        case 'delete':
            removeBookmark(surah, verse);
            break;
    }
}

function _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function _escapeAttr(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ═══════════════════════════════════════════════════════════════════
   NOTE PROMPT
   ═══════════════════════════════════════════════════════════════════ */

function promptBookmarkNote(id, currentNote) {
    const note = prompt('\u0623\u0636\u0641 \u0645\u0644\u0627\u062D\u0638\u0629:', currentNote);
    if (note !== null) {
        updateBookmarkNote(id, note);
    }
}

/* ═══════════════════════════════════════════════════════════════════
   UTILITY
   ═══════════════════════════════════════════════════════════════════ */

function getVersePage(surahNumber, verseNumber) {
    for (let page in pagesData) {
        if (pagesData[page].some(v => v.surahNumber == surahNumber && v.numberInSurah == verseNumber)) {
            return parseInt(page);
        }
    }
    return currentPageNumber;
}

function updateBookmarkIcons() {
    document.querySelectorAll('.verse-container').forEach(verse => {
        const surah = parseInt(verse.getAttribute('data-surah'));
        const ayah = parseInt(verse.getAttribute('data-ayah'));
        const btn = verse.querySelector('.verse-bookmark-btn');
        if (btn) {
            if (isBookmarked(surah, ayah)) {
                btn.classList.add('bookmarked');
                btn.textContent = '\u2605';
            } else {
                btn.classList.remove('bookmarked');
                btn.textContent = '\u2606';
            }
        }
    });
}
