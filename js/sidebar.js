const sidebarEl = document.getElementById('sidebar');
const surahListEl = document.getElementById('surahList');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function populateSurahList(surahs) {
    surahListEl.innerHTML = surahs.map(surah => `
        <li class="surah-item" data-surah="${surah.number}">
            <span class="surah-number">${toArabicNumber(surah.number)}</span>
            <span class="surah-name">${surah.name} (${surah.englishName})</span>
        </li>
    `).join('');

    document.querySelectorAll('.surah-item').forEach(item => {
        item.addEventListener('click', () => {
            const surahNumber = parseInt(item.getAttribute('data-surah'));
            goToSurah(surahNumber);
            closeSidebar();
        });
    });
}

function goToSurah(surahNumber) {
    const surah = surahData.find(s => s.number === surahNumber);
    if (surah && surah.ayahs.length > 0) {
        currentPage = surah.ayahs[0].page;
        renderPage(currentPage);
        highlightActiveSurah(surahNumber);
        window.scrollTo(0, 0);
        history.replaceState({ page: currentPage }, '', `?page=${currentPage}`);
    }
    matchSidebarHeight();
    closeSidebar();
}

function highlightSurahForCurrentPage() {
    if (!pagesData[currentPage] || pagesData[currentPage].length === 0) return;

    const firstVerse = pagesData[currentPage][0];
    highlightActiveSurah(firstVerse.surahNumber);
}

function highlightActiveSurah(surahNumber) {
    document.querySelectorAll('.surah-item').forEach(item => {
        item.classList.remove('active-surah');
    });

    const activeSurahItem = document.querySelector(`.surah-item[data-surah="${surahNumber}"]`);
    if (activeSurahItem) {
        activeSurahItem.classList.add('active-surah');

        activeSurahItem.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }
}

function isMobile() {
    return window.innerWidth <= 768;
}

function toggleSidebar() {
    const isOpen = sidebarEl.classList.contains('open');
    if (isOpen) {
        closeSidebar();
    } else {
        sidebarEl.classList.add('open');
        sidebarOverlay.classList.add('active');
        if (isMobile()) {
            document.body.style.overflow = 'hidden';
        }
    }
}

function closeSidebar() {
    sidebarEl.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

sidebarOverlay.addEventListener('click', closeSidebar);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebarEl.classList.contains('open')) {
        closeSidebar();
    }
});
