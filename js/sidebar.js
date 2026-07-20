const sidebarEl = document.getElementById('sidebar');
const surahListEl = document.getElementById('surahList');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function populateSurahList(surahs) {
    surahListEl.innerHTML = surahs.map(surah => `
        <li class="surah-item" data-surah="${surah.number}" role="listitem" tabindex="0" aria-label="${surah.name} (${surah.englishName})">
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
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const surahNumber = parseInt(item.getAttribute('data-surah'));
                goToSurah(surahNumber);
                closeSidebar();
            }
        });
    });
}

function goToSurah(surahNumber) {
    if (typeof goToSurahWithLastRead === 'function' && goToSurahWithLastRead(surahNumber)) {
        return;
    }

    const surah = surahData.find(s => s.number === surahNumber);
    if (surah && surah.ayahs.length > 0) {
        currentPage = surah.ayahs[0].page;
        renderPage(currentPage);
        highlightActiveSurah(surahNumber);
        window.scrollTo(0, 0);
        history.replaceState({ page: currentPage }, '', `?page=${currentPage}`);
    }
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
    if (isMobile()) {
        const isOpen = sidebarEl.classList.contains('open');
        if (isOpen) {
            closeSidebar();
        } else {
            sidebarEl.classList.add('open');
            sidebarOverlay.classList.add('active');
            sidebarOverlay.setAttribute('aria-hidden', 'false');
            menuButtonEl.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
        }
    } else {
        const isCollapsed = sidebarEl.classList.contains('collapsed');
        if (isCollapsed) {
            sidebarEl.classList.remove('collapsed');
            menuButtonEl.setAttribute('aria-expanded', 'true');
        } else {
            sidebarEl.classList.add('collapsed');
            menuButtonEl.setAttribute('aria-expanded', 'false');
        }
    }
}

function closeSidebar() {
    if (isMobile()) {
        sidebarEl.classList.remove('open');
        sidebarOverlay.classList.remove('active');
        sidebarOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    } else {
        sidebarEl.classList.add('collapsed');
    }
    menuButtonEl.setAttribute('aria-expanded', 'false');
}

sidebarOverlay.addEventListener('click', closeSidebar);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebarEl.classList.contains('open')) {
        closeSidebar();
    }
});
