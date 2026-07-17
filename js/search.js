const SEARCH_STORAGE_KEY = 'quran-search-recent';
const MAX_RECENT_SEARCHES = 5;

function initSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchOverlay = document.getElementById('searchOverlay');
    const searchCloseBtn = document.getElementById('searchCloseBtn');
    const searchInput = document.getElementById('searchInput');

    searchBtn.addEventListener('click', openSearch);
    searchCloseBtn.addEventListener('click', closeSearch);
    searchOverlay.addEventListener('click', (e) => {
        if (e.target === searchOverlay) closeSearch();
    });

    searchInput.addEventListener('input', debounce((e) => {
        performSearch(e.target.value.trim());
    }, 300));

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            openSearch();
        }
        if (e.key === 'Escape') {
            closeSearch();
        }
    });

    renderRecentSearches();
}

function openSearch() {
    const searchOverlay = document.getElementById('searchOverlay');
    const searchInput = document.getElementById('searchInput');
    searchOverlay.classList.add('active');
    searchInput.focus();
    searchInput.value = '';
    document.getElementById('searchResults').innerHTML = '';
    renderRecentSearches();
}

function closeSearch() {
    const searchOverlay = document.getElementById('searchOverlay');
    searchOverlay.classList.remove('active');
}

function performSearch(query) {
    const resultsContainer = document.getElementById('searchResults');

    if (!query || query.length < 2) {
        resultsContainer.innerHTML = '';
        renderRecentSearches();
        return;
    }

    const normalizedQuery = normalizeArabic(query);

    const results = [];
    for (let page in pagesData) {
        pagesData[page].forEach(verse => {
            if (verse.text && normalizeArabic(verse.text).includes(normalizedQuery)) {
                results.push({
                    surahNumber: verse.surahNumber,
                    surahName: verse.surahName,
                    englishName: verse.englishName,
                    numberInSurah: verse.numberInSurah,
                    text: verse.text,
                    page: parseInt(page)
                });
            }
        });
    }

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="search-no-results">لا توجد نتائج</div>';
        return;
    }

    saveRecentSearch(query);

    resultsContainer.innerHTML = results.slice(0, 50).map(result => {
        const highlightedText = highlightMatch(result.text, query);
        return `
            <div class="search-result-item" onclick="navigateToSearchResult(${result.page}, ${result.surahNumber}, ${result.numberInSurah})">
                <div class="search-result-surah">${result.surahName} (${result.englishName})</div>
                <div class="search-result-text">${highlightedText}</div>
                <div class="search-result-verse-num">آية ${toArabicNumber(result.numberInSurah)} - صفحة ${toArabicNumber(result.page)}</div>
            </div>
        `;
    }).join('');
}

function navigateToSearchResult(page, surahNumber, verseNumber) {
    closeSearch();
    navigateToPage(page);
    setTimeout(() => {
        const verseEl = document.querySelector(
            `.verse-container[data-surah="${surahNumber}"][data-ayah="${verseNumber}"]`
        );
        if (verseEl) {
            verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            verseEl.classList.add('search-highlight');
            setTimeout(() => verseEl.classList.remove('search-highlight'), 3000);
        }
    }, 500);
}

function saveRecentSearch(query) {
    let recent = JSON.parse(localStorage.getItem(SEARCH_STORAGE_KEY) || '[]');
    recent = recent.filter(r => r !== query);
    recent.unshift(query);
    recent = recent.slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(recent));
}

function renderRecentSearches() {
    const container = document.getElementById('searchResults');
    const recent = JSON.parse(localStorage.getItem(SEARCH_STORAGE_KEY) || '[]');

    if (recent.length === 0) {
        container.innerHTML = '<div class="search-no-results">اكتب للبحث في آيات القرآن الكريم</div>';
        return;
    }

    container.innerHTML = `
        <div class="search-recent">
            <div class="search-recent-title">عمليات البحث الأخيرة</div>
            ${recent.map(q => `
                <div class="search-recent-item" onclick="document.getElementById('searchInput').value='${q}'; performSearch('${q}');">${q}</div>
            `).join('')}
        </div>
    `;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
