async function playVerseAudioFromQueue(callback = null) {
    if (currentAudio && !audioPaused) {
        currentAudio.pause();
        currentAudio.removeEventListener('ended', currentAudio._endedHandler);
        currentAudio = null;
    }

    if (audioQueue.length === 0) {
        stopAudio();
        return;
    }

    const { audio, verse } = audioQueue.shift();
    currentAudio = audio;

    if (audioPaused) {
        audioPaused = false;
        document.querySelector('.stop-audio-btn').innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>`;
    }

    if (audio._endedHandler) {
        audio.removeEventListener('ended', audio._endedHandler);
    }

    audio._endedHandler = () => {
        audio.removeEventListener('ended', audio._endedHandler);
        delete audio._endedHandler;
        if (callback) callback();
    };

    currentAudio.addEventListener('ended', currentAudio._endedHandler);

    try {
        applyAudioSpeed(currentAudio);
        await currentAudio.play();
        
        if (isPlayingEntireSurah && currentVerseSequence) {
            currentVerseIndex = currentVerseSequence.findIndex(v => 
                v.surahNumber === verse.surahNumber && 
                v.numberInSurah === verse.numberInSurah
            );
            
            if (audioQueue.length < 2 && currentVerseIndex < currentVerseSequence.length - 1) {
                prefetchVerses(currentVerseIndex + 1, MAX_PREFETCH_COUNT);
            }
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('Playback aborted due to pause or interruption.');
        } else {
            console.error('Audio playback failed:', error);
        }
        return;
    }
}

async function prefetchVerses(startIndex, count) {
    for (let i = startIndex; i < Math.min(startIndex + count, currentVerseSequence.length); i++) {
        const verse = currentVerseSequence[i];

        try {
            const res = await fetch(`https://quranapi.pages.dev/api/audio/${verse.surahNumber}/${verse.numberInSurah}.json`);
            const data = await res.json();

            if (data[reciterId] && data[reciterId].url) {
                const audio = new Audio(data[reciterId].url);
                audioQueue.push({ audio, verse });
            }

        } catch (err) {
            console.error(
                `Error prefetching audio for ${verse.surahNumber}:${verse.numberInSurah}`,
                err
            );
        }
    }
}

async function playEntireSurah(surahNumber, startFrom = { page: null, verseNumber: null }) {
    stopAudio();
    clearVerseHighlights();

    const verses = [];
    let currentPage = startFrom.page;

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

    if (!currentPage) {
        for (let page = 1; page <= totalPages; page++) {
            if (pagesData[page].some(v => v.surahNumber == surahNumber)) {
                currentPage = page;
                break;
            }
        }
        if (!currentPage) return;
    }

    let foundStartingVerse = !startFrom.verseNumber;
    for (let page = currentPage; page <= totalPages; page++) {
        const pageVerses = pagesData[page].filter(v => v.surahNumber == surahNumber);
        if (pageVerses.length === 0) break;

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

        if (page < totalPages && pagesData[page + 1][0]?.surahNumber !== surahNumber) {
            break;
        }
    }

    if (verses.length === 0) return;

    isPlayingEntireSurah = true;
    currentPlayingSurah = surahNumber;
    currentVerseSequence = verses;
    currentVerseIndex = 0;

    if (startFrom.verseNumber) {
        currentVerseIndex = verses.findIndex(v => v.numberInSurah === startFrom.verseNumber);
        if (currentVerseIndex < 0) currentVerseIndex = 0;
    }

    document.querySelector('.stop-audio-btn').style.display = 'block';
    document.querySelector('.stop-audio-btn').innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>`;

    audioQueue = [];
    resetRepeatCount();
    showRepeatControls();
    await prefetchVerses(currentVerseIndex, MAX_PREFETCH_COUNT);
    playNextVerseInSequence();
}

function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    audioQueue = [];
    isPlayingEntireSurah = false;
    hideRepeatControls();
    document.querySelector('.stop-audio-btn').style.display = 'none';
}

async function playNextVerseInSequence() {
    if (currentVerseIndex >= currentVerseSequence.length || !isPlayingEntireSurah) {
        stopAudio();
        return;
    }

    const verse = currentVerseSequence[currentVerseIndex];

    document.querySelectorAll('.current-playing-verse').forEach(el => {
        el.classList.remove('current-playing-verse');
    });

    const versePage = findPageForVerse(verse.surahNumber, verse.numberInSurah);
    if (versePage !== currentPageNumber) {
        window._isAudioNavigation = true;
        try {
            await renderPage(versePage);
        } catch (error) {
            console.error("Error rendering page:", error);
            window._isAudioNavigation = false;
            stopAudio();
            return;
        }
        window._isAudioNavigation = false;
    }

    const verseElement = document.querySelector(
        `.verse-container[data-surah="${verse.surahNumber}"][data-ayah="${verse.numberInSurah}"]`
    );
    if (verseElement) {
        highlightCurrentVerse(verseElement);
    }

    playVerseAudioFromQueue(async () => {
        trackVerseListened(verse.surahNumber, verse.numberInSurah);

        if (shouldRepeat()) {
            playNextVerseInSequence();
            return;
        }
        resetRepeatCount();

        currentVerseIndex++;

        if (audioQueue.length < MAX_PREFETCH_COUNT - 1) {
            await prefetchVerses(currentVerseIndex + audioQueue.length, 1);
        }

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

    if (typeof onAudioVerseChange === 'function') {
        onAudioVerseChange(
            parseInt(verseElement.getAttribute('data-surah')),
            parseInt(verseElement.getAttribute('data-ayah'))
        );
    }

    setTimeout(() => {
        verseElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'start'
        });
    }, 100);

    verseElement.style.animation = 'verse-pulse 2s infinite';
}

function clearVerseHighlights() {
    document.querySelectorAll('.current-playing-verse').forEach(el => {
        el.classList.remove('current-playing-verse');
        el.style.animation = '';
    });
}

function toggleAudioPlayback() {
    const stopBtn = document.querySelector('.stop-audio-btn');

    if (currentAudio) {
        if (currentAudio.paused) {
            currentAudio.play();
            audioPaused = false;
            stopBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
            `;

            if (isPlayingEntireSurah && currentAudio.ended) {
                playNextVerseInSequence();
            }
        } else {
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
