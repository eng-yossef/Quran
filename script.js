// Global variables
let currentPage = 1;
const totalPages = 604; // Total pages in standard Quran mushaf
let pagesData = {}; // Will store organized verses by page
let surahData = []; // Will store surah information
let currentAudio = null;
let currentPlayingSurah = null;
let isPlayingEntireSurah = false;
let currentVerseHighlight = null;
let audioPaused = false;
let currentVerseSequence = [];
let currentVerseIndex = 0;
let currentPageNumber = 1; // Track current page number


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


// Add stop button container to HTML body
const stopBtnContainer = document.createElement('div');
stopBtnContainer.className = 'stop-btn-container';
stopBtnContainer.innerHTML = `
    <button class="stop-audio-btn" style="display: none;">
        <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
    </button>
`;
document.body.appendChild(stopBtnContainer);

function renderPage(pageNumber) {
    currentPageNumber = pageNumber; // Update current page
    const pageVerses = pagesData[pageNumber];
    if (!pageVerses) return;

    let html = '';
    let currentSurah = null;

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

    // Add click event to surah names
    document.querySelectorAll('.surah-name').forEach(surahName => {
        surahName.addEventListener('click', function() {
            const surahNumber = this.getAttribute('data-surah');
            playEntireSurah(surahNumber, pageNumber);
        });
    });

    // Click event on verse text
    document.querySelectorAll('.verse-text').forEach(span => {
        span.addEventListener('click', function(e) {
            const container = this.closest('.verse-container');
            const surah = container.getAttribute('data-surah');
            const ayah = container.getAttribute('data-ayah');

            // Highlight the clicked verse
            document.querySelectorAll('.verse-container').forEach(v => {
                v.style.backgroundColor = '';
            });
            container.style.backgroundColor = 'rgba(46, 139, 87, 0.1)';

            // Play verse
            playVerseAudio(surah, ayah, false);
            
        });
    });

    // Disable/enable navigation buttons
    prevPageBtn.disabled = pageNumber <= 1;
    nextPageBtn.disabled = pageNumber >= totalPages;

    // Update browser history
    history.replaceState({ page: pageNumber }, '', `?page=${pageNumber}`);
    matchSidebarHeight();
}

function playEntireSurah(surahNumber, currentPage) {
    stopAudio();
    
    const verses = [];
    let startPlaying = false;
    let currentPageVerses = [];
    
    // First collect all verses from current page onwards
    for (let page = currentPage; page <= totalPages; page++) {
        pagesData[page].forEach(verse => {
            if (verse.surahNumber == surahNumber) {
                verses.push(verse);
                if (page == currentPage) {
                    currentPageVerses.push(verse);
                }
            }
        });
        // If we found any verses and moved to next page, break if surah changes
        if (verses.length > 0 && page > currentPage) {
            if (pagesData[page][0].surahNumber !== surahNumber) break;
        }
    }
    
    if (verses.length === 0) return;
    
    isPlayingEntireSurah = true;
    currentPlayingSurah = surahNumber;
    currentVerseSequence = verses;
    currentVerseIndex = currentPageVerses.findIndex(v => v.numberInSurah === verses[0].numberInSurah);
    if (currentVerseIndex < 0) currentVerseIndex = 0;
    
    // Show stop button
    document.querySelector('.stop-audio-btn').style.display = 'block';
    
    playNextVerseInSequence();
}

function playNextVerseInSequence() {
    if (currentVerseIndex >= currentVerseSequence.length || !isPlayingEntireSurah) {
        stopAudio();
        return;
    }
    
    const verse = currentVerseSequence[currentVerseIndex];
    const verseElement = document.querySelector(`.verse-container[data-surah="${verse.surahNumber}"][data-ayah="${verse.numberInSurah}"]`);
    
    // Check if we need to change page
    const versePage = findPageForVerse(verse.surahNumber, verse.numberInSurah);
    if (versePage !== currentPageNumber) {
        renderPage(versePage);
    }
    
    if (verseElement) {
        // Highlight and scroll to verse
        document.querySelectorAll('.verse-container').forEach(v => {
            v.style.backgroundColor = '';
        });
        verseElement.style.backgroundColor = 'rgba(46, 139, 87, 0.1)';
        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    playVerseAudio(verse.surahNumber, verse.numberInSurah, true);
}

function findPageForVerse(surahNumber, ayahNumber) {
    for (let page in pagesData) {
        if (pagesData[page].some(v => v.surahNumber == surahNumber && v.numberInSurah == ayahNumber)) {
            return parseInt(page);
        }
    }
    return currentPageNumber;
}

function playVerseAudio(surah, ayah, isSequence = false) {
    if (currentAudio && !audioPaused) {
        currentAudio.pause();
        currentAudio = null;
    }

    fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200 && data.data.audio) {
                currentAudio = new Audio(data.data.audio);
                
                if (audioPaused) {
                    audioPaused = false;
                    document.querySelector('.stop-audio-btn').innerHTML = `
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                    `;
                }
                
                currentAudio.play();

                currentAudio.addEventListener('ended', () => {
                    if (isSequence) {
                        currentVerseIndex++;
                        if (currentVerseIndex < currentVerseSequence.length) {
                            playNextVerseInSequence();
                        } else {
                            stopAudio();
                        }
                    } else {
                        document.querySelectorAll('.verse-container').forEach(v => {
                            v.style.backgroundColor = '';
                        });
                    }
                });
            }
        })
        .catch(error => {
            console.error('Error fetching audio:', error);
            if (isSequence) {
                currentVerseIndex++;
                playNextVerseInSequence();
            }
        });
}

function toggleAudioPlayback() {
    const stopBtn = document.querySelector('.stop-audio-btn');
    
    if (currentAudio) {
        if (audioPaused) {
            // Resume playback
            currentAudio.play();
            audioPaused = false;
            stopBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
            `;
            
            if (isPlayingEntireSurah) {
                playNextVerseInSequence();
            }
        } else {
            // Pause playback
            currentAudio.pause();
            audioPaused = true;
            stopBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M8 5v14l11-7z"/>
                </svg>
            `;
        }
    }
}

function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    isPlayingEntireSurah = false;
    audioPaused = false;
    document.querySelectorAll('.verse-container').forEach(v => {
        v.style.backgroundColor = '';
    });
    document.querySelector('.stop-audio-btn').style.display = 'none';
}

// Add event listener to stop button
document.querySelector('.stop-audio-btn').addEventListener('click', function() {
    toggleAudioPlayback();
});

// Minimal CSS for stop button (won't affect existing styles)
const style = document.createElement('style');
style.textContent = `
    .stop-btn-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
    }
    .stop-audio-btn {
        background: white;
        border: 1px solid #ddd;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
`;
document.head.appendChild(style);

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
