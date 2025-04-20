// Global variables
let currentPage = 1;
const totalPages = 604; // Total pages in standard Quran mushaf
let pagesData = {}; // Will store organized verses by page
let surahData = []; // Will store surah information

// DOM elements
const quranPageEl = document.getElementById('quranPage');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageIndicatorEl = document.getElementById('pageIndicator');
const sidebarEl = document.getElementById('sidebar');
const menuButtonEl = document.getElementById('menuButton');
const closeSidebarEl = document.getElementById('closeSidebar');
const surahListEl = document.getElementById('surahList');

// Corrected implementation
function matchSidebarHeight() {
const quranPage = document.querySelector('.main-content');
const sidebar = document.querySelector('.surah-list');

if (quranPage && sidebar) {
// Get the computed height of the quran page
const quranPageHeight = quranPage.offsetHeight;

// Set sidebar height to match
sidebar.style.height = `${quranPageHeight-200}px`;


}
}

// Correct event listeners - use 'DOMContentLoaded' instead of 'load'
document.addEventListener('DOMContentLoaded', function() {
// Initial match
matchSidebarHeight();

// Also run after fonts and images are loaded
window.addEventListener('load', matchSidebarHeight);
});

// Add debounce to resize event
let resizeTimer;
window.addEventListener('resize', function() {
// clearTimeout(resizeTimer);
// resizeTimer = setTimeout(matchSidebarHeight, 250);
matchSidebarHeight();
});



// Fetch Quran data
async function fetchQuranData() {
    try {
        const response = await fetch('http://api.alquran.cloud/v1/quran/quran-uthmani');
        const data = await response.json();
        return data.data.surahs;
    } catch (error) {
        console.error('Error fetching Quran data:', error);
        return null;
    }
}

// Organize verses by page
function organizeVersesByPage(surahs) {
    const pages = {};
    
    // Initialize pages object
    for (let i = 1; i <= totalPages; i++) {
        pages[i] = [];
    }
    
    // Group verses by page
    surahs.forEach(surah => {
        surah.ayahs.forEach(ayah => {
            if (!pages[ayah.page]) {
                pages[ayah.page] = [];
            }
            pages[ayah.page].push({
                ...ayah,
                surahName: surah.name,
                surahNumber: surah.number,
                englishName: surah.englishName,
                revelationType: surah.revelationType
            });
        });
    });
    
    return pages;
}

// Render page
let currentAudio = null;

function renderPage(pageNumber) {
    const pageVerses = pagesData[pageNumber];
    if (!pageVerses) return;

    let html = '';
    let currentSurah = null;

    pageVerses.forEach(verse => {
        if (verse.surahNumber !== currentSurah) {
            if (verse.numberInSurah === 1) {
                html += `
                    <div class="surah-info">
                        <h2>${verse.surahName}</h2>
                        <p>${verse.englishName} - ${verse.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}</p>
                    </div>
                `;

                if (pageNumber != 1&& pageNumber != 187) {
                    html += `
                        <div class="bismillah-container">
                            <div class="bismillah-decoration left"></div>
                            <h1 class="bismillah-text">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</h1>
                            <div class="bismillah-decoration right"></div>
                        </div>
                    `;
                }
            }
            currentSurah = verse.surahNumber;
        }

        html += `
            <div class="verse-container" data-surah="${verse.surahNumber}" data-ayah="${verse.numberInSurah}">
            <span class="verse-text">${verse.numberInSurah === 1 && pageNumber != 1 && pageNumber != 187 ? verse.text.substring(39) : verse.text}</span>
                <span class="verse-number">${verse.numberInSurah}</span>
            </div>
        `;
    });

    quranPageEl.innerHTML = html;
    pageIndicatorEl.textContent = `الصفحة ${pageNumber}`;

    // Click event only on verse text
    document.querySelectorAll('.verse-text').forEach(span => {
        span.addEventListener('click', function (e) {
            const container = this.closest('.verse-container');
            const surah = container.getAttribute('data-surah');
            const ayah = container.getAttribute('data-ayah');

            // Highlight the clicked verse
            document.querySelectorAll('.verse-container').forEach(v => {
                v.style.backgroundColor = '';
            });
            container.style.backgroundColor = 'rgba(46, 139, 87, 0.1)';

            // Play verse
            playVerseAudio(surah, ayah);
        });
    });

    // Disable/enable navigation buttons
    prevPageBtn.disabled = pageNumber <= 1;
    nextPageBtn.disabled = pageNumber >= totalPages;

    // Update browser history
    history.replaceState({ page: pageNumber }, '', `?page=${pageNumber}`);
    matchSidebarHeight();
}

function playVerseAudio(surah, ayah) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }

    fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200 && data.data.audio) {
                currentAudio = new Audio(data.data.audio);
                currentAudio.play();

                currentAudio.addEventListener('ended', () => {
                    document.querySelectorAll('.verse-container').forEach(v => {
                        v.style.backgroundColor = '';
                    });
                });
            }
        })
        .catch(error => {
            console.error('Error fetching audio:', error);
        });
}


// Populate surah list in sidebar
function populateSurahList(surahs) {
    surahListEl.innerHTML = surahs.map(surah => `
        <li class="surah-item" data-surah="${surah.number}">
            <span class="surah-number">${surah.number}</span>
            ${surah.name} (${surah.englishName})
        </li>
    `).join('');
    
    // Add click event listeners to surah items
    document.querySelectorAll('.surah-item').forEach(item => {
        item.addEventListener('click', () => {
            const surahNumber = parseInt(item.getAttribute('data-surah'));
            goToSurah(surahNumber);
            closeSidebar();
        });
    });
}

// Go to first page of a surah
function goToSurah(surahNumber) {
    const surah = surahData.find(s => s.number === surahNumber);
    if (surah && surah.ayahs.length > 0) {
        currentPage = surah.ayahs[0].page;
        renderPage(currentPage);
        window.scrollTo(0, 0);
    }
    //resize the page 
    matchSidebarHeight();
    // Close sidebar
    closeSidebar();
    // Update browser history
    history.replaceState({ page: currentPage }, '', `?page=${currentPage}`);


}

// Toggle sidebar
function toggleSidebar() {
    sidebarEl.classList.toggle('open');
}

function closeSidebar() {
    sidebarEl.classList.remove('open');
}

// Initialize app
async function initApp() {
    const surahs = await fetchQuranData();
    if (!surahs) {
        quranPageEl.innerHTML = '<p style="text-align:center; padding:2rem;">تعذر تحميل القرآن الكريم. يرجى المحاولة لاحقاً.</p>';
        return;
    }
    
    surahData = surahs;
    pagesData = organizeVersesByPage(surahs);
    populateSurahList(surahs);
    
    // Check for page parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    if (pageParam && pageParam >= 1 && pageParam <= totalPages) {
        currentPage = parseInt(pageParam);
    }
    
    // Load current page
    renderPage(currentPage);
    
    // Navigation event listeners
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage(currentPage);
            window.scrollTo(0, 0);
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderPage(currentPage);
            window.scrollTo(0, 0);
        }
    });
    
    // Sidebar controls
    menuButtonEl.addEventListener('click', toggleSidebar);
    closeSidebarEl.addEventListener('click', closeSidebar);
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && currentPage < totalPages) {
            currentPage++;
            renderPage(currentPage);
            window.scrollTo(0, 0);
        } else if (e.key === 'ArrowRight' && currentPage > 1) {
            currentPage--;
            renderPage(currentPage);
            window.scrollTo(0, 0);
        }
    });
}


// Start the application
initApp();
