function renderPage(pageNumber) {
    currentPageNumber = pageNumber;
    saveCurrentPage(pageNumber);
    if (typeof trackPageVisit === 'function') trackPageVisit(pageNumber);
    const pageVerses = pagesData[pageNumber];
    if (!pageVerses) return;

    let html = '';
    let currentSurah = null;

    const pageJuz = pageVerses[0]?.juz;
    const pageJuzEnd = pageVerses[pageVerses.length - 1]?.juz;
    
    let juzDisplayText = `الجزء ${toArabicNumber(pageJuz)}`;
    if (pageJuz !== pageJuzEnd) {
        juzDisplayText = `الجزء ${toArabicNumber(pageJuz)} - ${toArabicNumber(pageJuzEnd)}`;
    }

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
                            <h1 class="bismillah-text">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</h1>
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
}
