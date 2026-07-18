function matchSidebarHeight() {
    const quranPage = document.querySelector('.main-content');
    const sidebar = document.querySelector('.surah-list');

    if (quranPage && sidebar) {
        const quranPageHeight = quranPage.offsetHeight;
        sidebar.style.height = `${quranPageHeight - 200}px`;
    }
}

function setupSwipeNavigation() {
    const quranPage = document.getElementById('quranPage');
    const SWIPE_IGNORE_RADIUS = 40;

    quranPage.addEventListener('touchstart', (e) => {
        const closeBtn = e.target.closest('.close-tafsir-btn');
        if (closeBtn) {
            e.stopPropagation();
            return;
        }

        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    quranPage.addEventListener('touchend', (e) => {
        const closeBtn = e.target.closest('.close-tafsir-btn');
        if (closeBtn) return;

        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
}

function handleSwipe() {
    const deltaX = touchEndX - touchStartX;

    if (deltaX > SWIPE_THRESHOLD && currentPage < totalPages) {
        navigateToPage(currentPage + 1);
    }
    else if (deltaX < -SWIPE_THRESHOLD && currentPage > 1) {
        navigateToPage(currentPage - 1);
    }
}

function navigateToPage(newPage) {
    const direction = newPage > currentPage ? 5 : -5;
    currentPage = newPage;
    renderPage(currentPage);
    saveCurrentPage(currentPage);
    highlightSurahForCurrentPage();

    document.getElementById('quranPage').style.transform = `translateX(${direction}px)`;
    setTimeout(() => {
        document.getElementById('quranPage').style.transform = 'translateX(0)';
    }, 300);
}
