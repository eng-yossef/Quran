const BOOKMARKS_KEY = 'quran-bookmarks';

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
    panel.classList.add('active');
    renderBookmarksList();
}

function closeBookmarksPanel() {
    const panel = document.getElementById('bookmarksPanel');
    panel.classList.remove('active');
}

function getBookmarks() {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
}

function saveBookmarks(bookmarks) {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

function isBookmarked(surahNumber, verseNumber) {
    const bookmarks = getBookmarks();
    return bookmarks.some(b => b.surahNumber === surahNumber && b.verseNumber === verseNumber);
}

function addBookmark(surahNumber, verseNumber, surahName, verseText) {
    const bookmarks = getBookmarks();
    if (isBookmarked(surahNumber, verseNumber)) return;

    bookmarks.push({
        id: Date.now(),
        surahNumber,
        verseNumber,
        surahName,
        verseText,
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
                <div class="bookmarks-empty-icon">📑</div>
                <p>لا توجد مفضلة بعد</p>
                <p style="font-size: 0.85rem; color: #aaa;">اضغط على أيقونة المفضلة بجانب أي آية لإضافتها</p>
            </div>
        `;
        return;
    }

    container.innerHTML = bookmarks.map(bookmark => {
        const date = new Date(bookmark.timestamp).toLocaleDateString('ar');
        return `
            <div class="bookmark-item" onclick="navigateToSearchResult(${getVersePage(bookmark.surahNumber, bookmark.verseNumber)}, ${bookmark.surahNumber}, ${bookmark.verseNumber}); closeBookmarksPanel();">
                <div class="bookmark-item-surah">${bookmark.surahName} - آية ${toArabicNumber(bookmark.verseNumber)}</div>
                <div class="bookmark-item-text">${bookmark.verseText.substring(0, 100)}${bookmark.verseText.length > 100 ? '...' : ''}</div>
                ${bookmark.note ? `<div class="bookmark-item-note">${bookmark.note}</div>` : ''}
                <div class="bookmark-item-date">${date}</div>
                <div class="bookmark-item-actions">
                    <button class="bookmark-action-btn" onclick="event.stopPropagation(); promptBookmarkNote(${bookmark.id}, '${(bookmark.note || '').replace(/'/g, "\\'")}')">📝 ملاحظة</button>
                    <button class="bookmark-action-btn delete" onclick="event.stopPropagation(); removeBookmark(${bookmark.surahNumber}, ${bookmark.verseNumber})">🗑️ حذف</button>
                </div>
            </div>
        `;
    }).join('');
}

function promptBookmarkNote(id, currentNote) {
    const note = prompt('أضف ملاحظة:', currentNote);
    if (note !== null) {
        updateBookmarkNote(id, note);
    }
}

function getVersePage(surahNumber, verseNumber) {
    for (let page in pagesData) {
        if (pagesData[page].some(v => v.surahNumber == surahNumber && v.numberInSurah == verseNumber)) {
            return parseInt(page);
        }
    }
    return 1;
}

function updateBookmarkIcons() {
    document.querySelectorAll('.verse-container').forEach(verse => {
        const surah = parseInt(verse.getAttribute('data-surah'));
        const ayah = parseInt(verse.getAttribute('data-ayah'));
        const btn = verse.querySelector('.verse-bookmark-btn');
        if (btn) {
            if (isBookmarked(surah, ayah)) {
                btn.classList.add('bookmarked');
                btn.textContent = '★';
            } else {
                btn.classList.remove('bookmarked');
                btn.textContent = '☆';
            }
        }
    });
}
