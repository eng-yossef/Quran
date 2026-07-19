const quranPageEl = document.getElementById('quranPage');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageIndicatorEl = document.getElementById('pageIndicator');
const menuButtonEl = document.getElementById('menuButton');
const closeSidebarEl = document.getElementById('closeSidebar');

document.addEventListener("DOMContentLoaded", () => {
    const reciterSelect = document.getElementById("reciterSelect");
    if (reciterSelect) {
        reciterSelect.value = reciterId;

        reciterSelect.addEventListener("change", (e) => {
            reciterId = e.target.value;
            localStorage.setItem("reciterId", reciterId);
            console.log("Reciter saved:", reciterId);
        });
    }
});

document.addEventListener('DOMContentLoaded', function () {
    matchSidebarHeight();
    window.addEventListener('load', matchSidebarHeight);
});

let resizeTimer;
window.addEventListener('resize', function () {
    matchSidebarHeight();
    recalcLayout();
});

window._isAudioNavigation = false;

const stopBtnContainer = document.createElement('div');
stopBtnContainer.className = 'stop-btn-container';
stopBtnContainer.innerHTML = `
    <button class="stop-audio-btn" style="display: none; opacity: 0.7;">
        <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
    </button>
`;
document.body.appendChild(stopBtnContainer);

document.querySelector('.stop-audio-btn').addEventListener('click', function () {
    toggleAudioPlayback();
});

applyNightMode();

nightModeToggle.addEventListener('click', () => {
    isNightMode = !isNightMode;
    localStorage.setItem('nightMode', isNightMode);
    applyNightMode();
});

async function initApp() {
    try {
        // Set user font size for layout engine before first render
        userFontSize = parseFloat(localStorage.getItem('quran-font-size') || '1.75');

        const surahs = await fetchQuranData();
        if (!surahs) {
            quranPageEl.innerHTML = '<p style="text-align:center; padding:2rem;">تعذر تحميل القرآن الكريم. يرجى المحاولة لاحقاً.</p>';
            return;
        }

        surahData = surahs;
        pagesData = organizeVersesByPage(surahs);
        populateSurahList(surahs);

        const urlParams = new URLSearchParams(window.location.search);
        const pageParam = urlParams.get('page');

        currentPage = (function () {
            try {
                if (pageParam && !isNaN(pageParam)) {
                    const page = parseInt(pageParam);
                    if (page >= 1 && page <= totalPages) {
                        return page;
                    }
                }

                const saved = localStorage.getItem('lastVisitedPage');
                if (saved) {
                    if (saved.startsWith('{')) {
                        const data = JSON.parse(saved);
                        if (new Date().getTime() - data.timestamp < 30 * 24 * 60 * 60 * 1000) {
                            return Math.max(1, Math.min(data.page, totalPages));
                        }
                    } else {
                        const page = parseInt(saved);
                        if (!isNaN(page)) {
                            return Math.max(1, Math.min(page, totalPages));
                        }
                    }
                }

                return 1;
            } catch (e) {
                console.error('Error initializing page:', e);
                return 1;
            }
        })();

        await renderPage(currentPage);
        saveCurrentPage(currentPage);

        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) navigateToPage(currentPage - 1);
        });

        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) navigateToPage(currentPage + 1);
        });

        menuButtonEl.addEventListener('click', toggleSidebar);
        closeSidebarEl.addEventListener('click', closeSidebar);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && currentPage < totalPages) {
                e.preventDefault();
                navigateToPage(currentPage + 1);
            } else if (e.key === 'ArrowRight' && currentPage > 1) {
                e.preventDefault();
                navigateToPage(currentPage - 1);
            } else if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                toggleAudioPlayback();
            } else if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                const selection = window.getSelection();
                if (selection && selection.toString().trim() !== '') {
                    if (document.getElementById('quranPage').contains(selection.anchorNode)) {
                        saveVerseAsImage(selection);
                    }
                }
            }
        });

        document.addEventListener('click', function (e) {
            const isInsideVerse = e.target.closest('.verse-container');
            const isInsideTafsir = e.target.closest('.verse-tafsir');

            if (!isInsideVerse && !isInsideTafsir) {
                document.querySelectorAll('.verse-tafsir').forEach(tooltip => {
                    tooltip.remove();
                });

                document.querySelectorAll('.verse-container').forEach(v => {
                    v.classList.remove('active-verse');
                });
            }
        });

        setupTafsirCloseHandlers();
        setupVerseInteractions();
        setupVerseHoverEffects();
        setupTafsirHideOnScroll();
        setupSwipeNavigation();
        setupTafsirClickHandlers();

        initSearch();
        initBookmarks();
        initFontControls();
        initAudioControls();
        initReadingProgress();
        initLastRead();
        initFullscreen();
        updateBookmarkIcons();

    } catch (error) {
        console.error('App initialization failed:', error);
        quranPageEl.innerHTML = '<p style="text-align:center; padding:2rem;">حدث خطأ أثناء تحميل التطبيق. يرجى تحديث الصفحة.</p>';
    }
}

initApp();
