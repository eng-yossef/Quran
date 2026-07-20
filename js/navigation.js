function matchSidebarHeight() {
    const sidebar = document.querySelector('.surah-list');
    if (!sidebar) return;

    if (isMobile()) {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            sidebar.style.height = `${mainContent.offsetHeight - 200}px`;
        }
    } else {
        sidebar.style.height = '';
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
    if (newPage === currentPage) return;

    const quranPage = document.getElementById('quranPage');
    const direction = newPage > currentPage ? 1 : -1;

    // Smooth transition: fade out, update, fade in
    quranPage.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
    quranPage.style.opacity = '0.4';
    quranPage.style.transform = `translateY(${direction * 4}px)`;

    setTimeout(() => {
        currentPage = newPage;
        renderPage(currentPage);
        saveCurrentPage(currentPage);
        highlightSurahForCurrentPage();

        // Fade in
        requestAnimationFrame(() => {
            quranPage.style.opacity = '1';
            quranPage.style.transform = 'translateY(0)';
        });

        // Clean up transition after animation
        setTimeout(() => {
            quranPage.style.transition = '';
        }, 200);
    }, 150);
}

/* ─── Layout recalculation on resize ──────────────────────────── */
let _layoutResizeTimer;
function recalcLayout() {
    clearTimeout(_layoutResizeTimer);
    _layoutResizeTimer = setTimeout(() => {
        LayoutEngine.invalidate();
        if (currentPage && pagesData[currentPage]) {
            renderPage(currentPage);
        }
    }, 250);
}
