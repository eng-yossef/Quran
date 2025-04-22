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
    currentPageNumber = pageNumber;
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
        <div class="verse-container" data-surah="${verse.surahNumber}" data-ayah="${verse.numberInSurah}" data-surah-name="${verse.surahName}">
            <span class="verse-text">${verse.numberInSurah === 1 && pageNumber != 1 && pageNumber != 187 ? verse.text.substring(39) : verse.text}</span>
            <span class="verse-number">${toArabicNumber(verse.numberInSurah)}</span>
        </div>
    `;
    });

    quranPageEl.innerHTML = html;
    pageIndicatorEl.textContent = `الصفحة ${pageNumber}`;

    // Add click event to surah names
    document.querySelectorAll('.surah-name').forEach(surahName => {
        surahName.addEventListener('click', function() {
            const surahNumber = parseInt(this.getAttribute('data-surah'));
            playEntireSurah(surahNumber, {page: pageNumber});
        });
    });

    // Add click and hover events to verses
    document.querySelectorAll('.verse-container').forEach(verseContainer => {
        const surah = parseInt(verseContainer.getAttribute('data-surah'));
        const ayah = parseInt(verseContainer.getAttribute('data-ayah'));
        
        // Click event
        verseContainer.addEventListener('click', function(e) {
            // Highlight the clicked verse
            document.querySelectorAll('.verse-container').forEach(v => {
                v.style.backgroundColor = '';
            });
            this.style.backgroundColor = 'rgba(46, 139, 87, 0.1)';
            
            // Play from this verse through the rest of the surah
            playEntireSurah(surah, {verseNumber: ayah});
        });
        
        verseContainer.addEventListener('mouseenter', function() {
            const verse = this;
            
            // Set timer to show tafsir after 2 seconds
            verse._tafsirTimer = setTimeout(() => {
                // Hide all other tafsirs first
                document.querySelectorAll('.verse-tafsir').forEach(t => {
                    t.classList.remove('show');
                });
                
                // Show current verse tafsir
                showTafsir(verse, surah, ayah);
                verse._tafsirTimer = null;
            }, 2000);
        });
        
        
        verseContainer.addEventListener('mouseleave', function() {
            // Clear the tafsir timer if it exists
            if (this._tafsirTimer) {
                clearTimeout(this._tafsirTimer);
                this._tafsirTimer = null;
            }
            
            // Hide tafsir on mouse leave
            hideTafsir(this);
        });




        
    });

    // Disable/enable navigation buttons
    prevPageBtn.disabled = pageNumber <= 1;
    nextPageBtn.disabled = pageNumber >= totalPages;

    // Update browser history
    history.replaceState({ page: pageNumber }, '', `?page=${pageNumber}`);
    matchSidebarHeight();
}


// Add this function to fetch and display tafsir
// Update the showTafsir function with better positioning
async function showTafsir(verseElement, surahNumber, verseNumber) {
    // Create tooltip if it doesn't exist
    let tooltip = verseElement.querySelector('.verse-tafsir');
    
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'verse-tafsir';
      verseElement.appendChild(tooltip);
      
      // Add loading state
      tooltip.innerHTML = `
        <div class="verse-tafsir-header">تفسير المیسر</div>
        <div class="tafsir-content">جاري التحميل...</div>
      `;
      
      try {
        // Fetch tafsir from API
        const response = await fetch(`https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/ar-tafsir-muyassar/${surahNumber}/${verseNumber}.json`);
        const tafsirData = await response.json();
        
        // Display tafsir
        tooltip.innerHTML = `
          <div class="verse-tafsir-header">تفسير المیسر (${surahNumber}:${verseNumber})</div>
          <div class="tafsir-content">${tafsirData.text}</div>
        `;
      } catch (error) {
        tooltip.innerHTML = `
          <div class="verse-tafsir-header">تفسير المیسر</div>
          <div class="tafsir-content">لا يتوفر تفسير لهذه الآية حالياً</div>
        `;
      }
    }
    
    // Position the tooltip smartly
    positionTafsirTooltip(verseElement, tooltip);
  }
  
  function hideTafsir(verseElement) {
    document.querySelectorAll('.verse-tafsir').forEach(t => {
        t.style.display = 'none';
    });
  }


  function positionTafsirTooltip(verseElement, tooltip) {
    const verseRect = verseElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Show tooltip to calculate dimensions
    tooltip.style.display = 'block';
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;

    // ===== RESPONSIVE ADJUSTMENTS ===== //
    // Default values (mobile first)
    let horizontalOffset = 15;
    let maxTooltipWidth = Math.min(300, viewportWidth - 40);
    let verticalOffset = 0;
    const minMargin = 10;

    // Tablet adjustments (768px to 1023px)
    if (viewportWidth >= 768 && viewportWidth < 1024) {
        maxTooltipWidth = 200;
        horizontalOffset = 20;
    }
    // Phone adjustments (< 768px)
    else if (viewportWidth < 768) {
        maxTooltipWidth = viewportWidth - 50;
        horizontalOffset = 10;
    }
    // Desktop adjustments (≥ 1024px - preserved from original)
    else if (viewportWidth >= 1024) {
        maxTooltipWidth = 400;
        horizontalOffset = 25;
    }

    tooltip.style.maxWidth = `${maxTooltipWidth}px`;
    tooltip.style.width = 'auto';
    const effectiveTooltipWidth = Math.min(tooltipWidth, maxTooltipWidth);

    // ===== POSITIONING LOGIC ===== //
    // Calculate both possible positions
    const rightPosition = verseRect.right + horizontalOffset;
    const leftPosition = verseRect.left - horizontalOffset - effectiveTooltipWidth;

    // Check available space
    const spaceRight = viewportWidth - verseRect.right - horizontalOffset;
    const spaceLeft = verseRect.left - horizontalOffset;
    
    // Determine position - modified for mobile/tablet
    let useRightSide;
    
    // Desktop logic (preserved)
    if (viewportWidth >= 1024) {
        useRightSide = spaceRight >= effectiveTooltipWidth || 
                      (spaceRight >= spaceLeft && spaceRight >= minMargin);
    } 
    // Mobile/tablet logic
    else {
        // For mobile/tablet, prioritize left side for right-edge verses
        const isRightEdgeVerse = verseRect.right > viewportWidth * 0.7;
        useRightSide = !isRightEdgeVerse && spaceRight >= effectiveTooltipWidth;
    }

    // Edge case handling (applies to all devices)
    if (useRightSide && (rightPosition + effectiveTooltipWidth > viewportWidth - minMargin)) {
        useRightSide = (leftPosition >= minMargin);
    }

    // Apply position
    if (useRightSide) {
        tooltip.style.left = `${Math.min(rightPosition, viewportWidth - effectiveTooltipWidth - minMargin)-150}px`;
        tooltip.style.right = 'auto';
    } else {
        tooltip.style.left = `${Math.max(leftPosition, minMargin)-11}px`;
        tooltip.style.right = 'auto';
    }

    // ===== VERTICAL POSITIONING (unchanged) ===== //
    verticalOffset = (verseRect.height - tooltipHeight) / 2;
    
    if (verseRect.top + verticalOffset < minMargin) {
        verticalOffset = -verseRect.top + minMargin;
    }
    if (verseRect.bottom + verticalOffset + tooltipHeight > viewportHeight - minMargin) {
        verticalOffset = viewportHeight - verseRect.bottom - tooltipHeight - minMargin;
    }

    tooltip.style.top = `${verseRect.top + verticalOffset}px`;

    // ===== ARROW POSITIONING (unchanged) ===== //
    if (useRightSide) {
        tooltip.style.setProperty('--arrow-left', '-10px');
        tooltip.style.setProperty('--arrow-border', 
            '10px solid transparent 10px solid #d4af37 10px solid transparent');
    } else {
        tooltip.style.setProperty('--arrow-left', 'calc(100% - 1px)');
        tooltip.style.setProperty('--arrow-border', 
            '10px solid #d4af37 10px solid transparent 10px solid transparent');
    }
}






function toArabicNumber(num) {
    const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    return num
        .toString()
        .split('')
        .map(digit => /\d/.test(digit) ? arabicDigits[+digit] : digit)
        .join('');
}

function playEntireSurah(surahNumber, startFrom = {page: null, verseNumber: null}) {
    stopAudio();
    clearVerseHighlights();
    const verses = [];
    let currentPage = startFrom.page;
    
    // Find starting page if only verseNumber is provided
    if (!currentPage && startFrom.verseNumber) {
        for (let page = 1; page <= totalPages; page++) {
            const verseInPage = pagesData[page].find(v => 
                v.surahNumber == surahNumber && v.numberInSurah == startFrom.verseNumber
            );
            if (verseInPage) {
                currentPage = page;
                break;
            }
        }
        if (!currentPage) return;
    }
    
    // If no starting point specified, find first page of surah
    if (!currentPage) {
        for (let page = 1; page <= totalPages; page++) {
            if (pagesData[page].some(v => v.surahNumber == surahNumber)) {
                currentPage = page;
                break;
            }
        }
        if (!currentPage) return;
    }
    
    // Collect all verses from current page to end of surah
    let foundStartingVerse = !startFrom.verseNumber; // true if no specific verse to start from
    for (let page = currentPage; page <= totalPages; page++) {
        const pageVerses = pagesData[page].filter(v => v.surahNumber == surahNumber);
        
        if (pageVerses.length === 0) break; // No more verses in this surah
        
        for (const verse of pageVerses) {
            if (!foundStartingVerse) {
                if (verse.numberInSurah === startFrom.verseNumber) {
                    foundStartingVerse = true;
                    verses.push(verse);
                }
            } else {
                verses.push(verse);
            }
        }
        
        // Check if next page starts a new surah
        if (page < totalPages && pagesData[page+1].length > 0 && 
            pagesData[page+1][0].surahNumber !== surahNumber) {
            break;
        }
    }
    
    if (verses.length === 0) return;
    
    isPlayingEntireSurah = true;
    currentPlayingSurah = surahNumber;
    currentVerseSequence = verses;
    
    // Find starting index
    currentVerseIndex = 0;
    if (startFrom.verseNumber) {
        currentVerseIndex = verses.findIndex(v => v.numberInSurah === startFrom.verseNumber);
        if (currentVerseIndex < 0) currentVerseIndex = 0;
    }
    
    document.querySelector('.stop-audio-btn').style.display = 'block';
    document.querySelector('.stop-audio-btn').innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>`
    

    playNextVerseInSequence();

}



// function clearVerseHighlights() {
//     document.querySelectorAll('.current-playing-verse').forEach(el => {
//         el.classList.remove('current-playing-verse');
//     });
// }



async function playNextVerseInSequence() {
    if (currentVerseIndex >= currentVerseSequence.length || !isPlayingEntireSurah) {
        stopAudio();
        return;
    }
    
    const verse = currentVerseSequence[currentVerseIndex];
    
    // Clear previous highlights
    document.querySelectorAll('.current-playing-verse').forEach(el => {
        el.classList.remove('current-playing-verse');
    });
    
    // Check if we need to change page
    const versePage = findPageForVerse(verse.surahNumber, verse.numberInSurah);
    if (versePage !== currentPageNumber) {
        try {
            await renderPage(versePage);
            
            // Find the verse element after page render
            const verseElement = document.querySelector(
                `.verse-container[data-surah="${verse.surahNumber}"][data-ayah="${verse.numberInSurah}"]`
            );
            
            if (verseElement) {
                highlightCurrentVerse(verseElement);
                
                // Play audio after highlighting
                playVerseAudio(verse.surahNumber, verse.numberInSurah, true, () => {
                    // Move to next verse only after audio completes
                    currentVerseIndex++;
                    if (currentVerseIndex < currentVerseSequence.length) {
                        playNextVerseInSequence();
                    } else {
                        stopAudio();
                    }
                });
            } else {
                // If verse element not found, move to next verse
                currentVerseIndex++;
                playNextVerseInSequence();
            }
        } catch (error) {
            console.error("Error rendering page:", error);
            stopAudio();
        }
        return;
    }
    
    // For same-page verses
    const verseElement = document.querySelector(
        `.verse-container[data-surah="${verse.surahNumber}"][data-ayah="${verse.numberInSurah}"]`
    );
    
    if (verseElement) {
        highlightCurrentVerse(verseElement);
    }
    
    playVerseAudio(verse.surahNumber, verse.numberInSurah, true, () => {
        // Move to next verse only after audio completes
        currentVerseIndex++;
        if (currentVerseIndex < currentVerseSequence.length) {
            playNextVerseInSequence();
        } else {
            stopAudio();
        }
    });
}

function highlightCurrentVerse(verseElement) {
    if (!verseElement) return;
    
    verseElement.classList.add('current-playing-verse');
    
    // Scroll to the verse with smooth behavior
    setTimeout(() => {
        verseElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'start'
        });
    }, 100);
    
    // Add visual pulse effect
    verseElement.style.animation = 'verse-pulse 2s infinite';
}

function clearVerseHighlights() {
    document.querySelectorAll('.current-playing-verse').forEach(el => {
        el.classList.remove('current-playing-verse');
        el.style.animation = '';
    });
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
        if (currentAudio.paused) {
            // Resume playback from where it was paused
            currentAudio.play();
            audioPaused = false;
            stopBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
            `;
            
            // Only play next verse if we're in sequence mode AND we reached the end
            if (isPlayingEntireSurah && currentAudio.ended) {
                playNextVerseInSequence();
            }
        } else {
            // Pause playback (without resetting position)
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



// Populate surah list in sidebar
function populateSurahList(surahs) {
    surahListEl.innerHTML = surahs.map(surah => `
        <li class="surah-item" data-surah="${surah.number}">
            <span class="surah-number">${toArabicNumber(surah.number)}</span>
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
        else if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            toggleAudioPlayback();
        }else if (e.ctrlKey && e.key === 's' ) {
            e.preventDefault();
            const selection = window.getSelection();
            if (selection && selection.toString().trim() !== '') {
                // Check if selection is within Quran content
                if (document.getElementById('quranPage').contains(selection.anchorNode)) {
                    saveVerseAsImage(selection);
                }
            }
        }
        
    });
    setupVerseHoverEffects();


    
}



async function saveVerseAsImage(selection) {    
    try {
        const range = selection.getRangeAt(0);
        // Get the parent element that contains the selected text
        let container = range.startContainer;
        if (container.nodeType === Node.TEXT_NODE) {
            container = container.parentNode;
        }
        
        // Find the nearest verse container
        const verseContainer = findParentWithClass(container, 'verse-container');
        if (!verseContainer) {
            console.warn('No verse container found for selection');
            return;
        }

        // Create a decorated container
        const decoratedVerse = createDecoratedVerse(verseContainer, selection.toString());
        
        // Use html2canvas to convert to image
        const html2canvas = await loadHtml2Canvas();
        
        html2canvas(decoratedVerse, {
            backgroundColor: null,
            scale: 2,
            logging: false,
            allowTaint: true,
            useCORS: true
        }).then(canvas => {
            // Trigger download
            const link = document.createElement('a');
            link.download = `quran-verse-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            // Clean up
            document.body.removeChild(decoratedVerse);
        });
    } catch (error) {
        console.error('Error saving verse as image:', error);
    }
}


function createDecoratedVerse(verseContainer, selectedText) {
    const verseNumber = verseContainer.querySelector('.verse-number')?.textContent;
    const surahName = verseContainer.dataset.surahName || 'السورة';
    
    
    const decorated = document.createElement('div');
    decorated.className = 'qv-premium-container';
    decorated.innerHTML = `
        <div class="qv-premium-gold-accent"></div>
        <div class="qv-premium-pattern"></div>
        <div class="qv-premium-corner qv-premium-corner-tl"></div>
        <div class="qv-premium-corner qv-premium-corner-tr"></div>
        <div class="qv-premium-corner qv-premium-corner-bl"></div>
        <div class="qv-premium-corner qv-premium-corner-br"></div>
        
        <div class="qv-premium-header">
            <div class="qv-premium-meta">
                <div class="qv-premium-surah">${surahName}</div>
                <span class="qv-premium-number">آية  ${verseNumber}</span>
            </div>
        </div>
        
        <div class="qv-premium-text">${selectedText}</div>
        
        <div class="qv-premium-footer">
            <div class="qv-premium-decoration"></div>
            <div class="qv-premium-watermark">${new Date().toLocaleDateString('ar-EG')}</div>
        </div>
    `;
    
    document.body.appendChild(decorated);
    return decorated;
}



function loadHtml2Canvas() {
    return new Promise((resolve) => {
        if (window.html2canvas) {
            showSaveNotification();

            return resolve(window.html2canvas);
        }
        const script = document.createElement('script');
        script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
        script.onload = () => resolve(window.html2canvas);
        document.head.appendChild(script);
    });
}

// Helper function to find parent with specific class
function findParentWithClass(element, className, maxDepth = 5) {
    let current = element;
    let depth = 0;
    
    while (current && depth < maxDepth) {
        if (current.classList && current.classList.contains(className)) {
            return current;
        }
        current = current.parentNode;
        depth++;
    }
    return null;
}


function showSaveNotification() {
    const notification = document.createElement('div');
    notification.textContent = 'Preparing verse image...';
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 20px';
    notification.style.background = '#2E8B57';
    notification.style.color = 'white';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '1000';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}





// Night Mode Toggle with better verse number handling
const nightModeToggle = document.getElementById('nightModeToggle');
let isNightMode = localStorage.getItem('nightMode') === 'true';

function updateVerseNumbers() {
    const verseNumbers = document.querySelectorAll('.verse-number');
    verseNumbers.forEach(num => {
        if (isNightMode) {
            num.style.backgroundColor = '#01579b';
            num.style.color = '#b3e5fc';
            num.style.boxShadow = '0 0 0 1px #0288d1';
        } else {
            num.style.backgroundColor = '#e0f7fa';
            num.style.color = '#006064';
            num.style.boxShadow = 'none';
        }
    });
}

function applyNightMode() {
    document.body.classList.toggle('night-mode', isNightMode);
    nightModeToggle.textContent = isNightMode ? '☀️' : '🌙';
    updateVerseNumbers();
    setupVerseHoverEffects();

}

// Initialize
applyNightMode();

// Toggle handler
nightModeToggle.addEventListener('click', () => {
    isNightMode = !isNightMode;
    localStorage.setItem('nightMode', isNightMode);
    applyNightMode();
});

// Call this after loading new verses
function onVersesLoaded() {
    updateVerseNumbers();
}



function setupVerseHoverEffects() {
    const verses = document.querySelectorAll('.verse');
    
    verses.forEach(verse => {
        verse.addEventListener('mouseenter', function() {
            if (document.body.classList.contains('night-mode')) {
                this.style.setProperty('--glow-intensity', '0.6');
            }
        });
        
        verse.addEventListener('mouseleave', function() {
            this.style.setProperty('--glow-intensity', '0');
        });
    });
}


// Start the application
initApp();
