function renderPage(pageNumber) {
    currentPageNumber = pageNumber;
    saveCurrentPage(pageNumber);
    if (typeof trackPageVisit === 'function') trackPageVisit(pageNumber);
    const pageVerses = pagesData[pageNumber];
    if (!pageVerses) return;

    // Build page elements array
    const elements = [];
    let currentSurah = null;

    pageVerses.forEach(verse => {
        if (verse.surahNumber !== currentSurah) {
            if (verse.numberInSurah === 1) {
                elements.push({
                    type: 'surah-header',
                    surahNumber: verse.surahNumber,
                    surahName: verse.surahName,
                    englishName: verse.englishName,
                    revelationType: verse.revelationType
                });
                if (pageNumber != 1 && pageNumber != 187) {
                    elements.push({ type: 'bismillah' });
                }
            }
            currentSurah = verse.surahNumber;
        }

        const displayText = (verse.numberInSurah === 1 && pageNumber != 1 && pageNumber != 187)
            ? verse.text.substring(39)
            : verse.text;

        elements.push({
            type: 'verse',
            surahNumber: verse.surahNumber,
            numberInSurah: verse.numberInSurah,
            surahName: verse.surahName,
            displayText: displayText,
            verseData: verse
        });
    });

    // Use a single consistent font size — no per-page scaling
    const targetFontSize = userFontSize || parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue('--quran-font-size')) || 1.75;

    // Apply fixed font size to the page
    quranPageEl.style.fontSize = targetFontSize + 'rem';

    // Build HTML
    const html = LayoutEngine._buildPageHTML(elements);

    // Wrap content in layout container and inject
    quranPageEl.innerHTML = `<div class="quran-page-content">${html}</div>`;

    const pageJuz = pageVerses[0]?.juz;
    const pageJuzEnd = pageVerses[pageVerses.length - 1]?.juz;
    
    let juzDisplayText = `الجزء ${toArabicNumber(pageJuz)}`;
    if (pageJuz !== pageJuzEnd) {
        juzDisplayText = `الجزء ${toArabicNumber(pageJuz)} - ${toArabicNumber(pageJuzEnd)}`;
    }

    pageIndicatorEl.innerHTML = `
        <div class="page-controls">
            <div class="juz-info-display">
                <span class="juz-label">${juzDisplayText}</span>
            </div>
            <div class="page-navigation">
                <input type="number" id="pageInput" min="1" max="${totalPages}" value="${pageNumber}" style="width: 55px;">
                <button id="goToPageBtn" class="go-btn">اذهب</button>
            </div>
        </div>
    `;

    const input = document.getElementById('pageInput');
    const button = document.getElementById('goToPageBtn');

    button.addEventListener('click', () => {
        const val = parseInt(input.value);
        if (!isNaN(val) && val >= 1 && val <= totalPages) {
            navigateToPage(val);
        } else {
            alert(`أدخل رقم صفحة من 1 إلى ${totalPages}`);
        }
    });

    input.addEventListener('keypress', e => {
        if (e.key === 'Enter') button.click();
    });

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
    if (typeof updateBookmarkIcons === 'function') updateBookmarkIcons();
    highlightSurahForCurrentPage();
    matchSidebarHeight();
    if (typeof trackReadingPosition === 'function') trackReadingPosition();
    if (typeof updateLastReadMarker === 'function') updateLastReadMarker();
}
