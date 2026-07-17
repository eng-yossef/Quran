const PROGRESS_KEY = 'quran-reading-progress';

function initReadingProgress() {
    updateProgressBar();
}

function getProgress() {
    const defaultProgress = {
        pagesVisited: [],
        versesListened: [],
        dailyStreak: 0,
        lastReadDate: null,
        totalPages: totalPages,
        totalListeningTime: 0,
        sessionStart: Date.now()
    };

    try {
        const saved = localStorage.getItem(PROGRESS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                ...defaultProgress,
                ...parsed,
                pagesVisited: parsed.pagesVisited || [],
                versesListened: parsed.versesListened || []
            };
        }
    } catch (e) {}

    return defaultProgress;
}

function saveProgress(progress) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function trackPageVisit(pageNumber) {
    const progress = getProgress();
    if (!progress.pagesVisited.includes(pageNumber)) {
        progress.pagesVisited.push(pageNumber);
    }
    updateDailyStreak(progress);
    saveProgress(progress);
    updateProgressBar();
}

function trackVerseListened(surahNumber, verseNumber) {
    const progress = getProgress();
    const key = `${surahNumber}:${verseNumber}`;
    if (!progress.versesListened.includes(key)) {
        progress.versesListened.push(key);
    }
    saveProgress(progress);
}

function updateDailyStreak(progress) {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (progress.lastReadDate === today) {
        return;
    } else if (progress.lastReadDate === yesterday) {
        progress.dailyStreak++;
    } else if (progress.lastReadDate !== today) {
        progress.dailyStreak = 1;
    }
    progress.lastReadDate = today;
}

function updateProgressBar() {
    const progress = getProgress();
    const pagesRead = progress.pagesVisited.length;
    const percentage = Math.round((pagesRead / progress.totalPages) * 100);

    const fill = document.getElementById('progressBarFill');
    const text = document.getElementById('progressText');
    const topBar = document.getElementById('readingProgressFill');

    if (fill) fill.style.width = percentage + '%';
    if (text) text.textContent = percentage + '%';
    if (topBar) topBar.style.width = percentage + '%';
}

function getReadingStats() {
    const progress = getProgress();
    return {
        pagesRead: progress.pagesVisited.length,
        totalPages: progress.totalPages,
        percentage: Math.round((progress.pagesVisited.length / progress.totalPages) * 100),
        versesRead: progress.versesListened.length,
        dailyStreak: progress.dailyStreak,
        juzRead: calculateJuzRead(progress.pagesVisited)
    };
}

function calculateJuzRead(pagesVisited) {
    const juzPages = {
        1: [1, 22], 2: [22, 42], 3: [42, 62], 4: [62, 82], 5: [82, 102],
        6: [102, 122], 7: [122, 142], 8: [142, 162], 9: [162, 182], 10: [182, 202],
        11: [202, 222], 12: [222, 242], 13: [242, 262], 14: [262, 282], 15: [282, 302],
        16: [302, 322], 17: [322, 342], 18: [342, 362], 19: [362, 382], 20: [382, 402],
        21: [402, 422], 22: [422, 442], 23: [442, 462], 24: [462, 482], 25: [482, 502],
        26: [502, 522], 27: [522, 542], 28: [542, 562], 29: [562, 582], 30: [582, 604]
    };

    let juzRead = 0;
    for (let juz = 1; juz <= 30; juz++) {
        const [start, end] = juzPages[juz];
        const pagesInJuz = [];
        for (let p = start; p <= end; p++) pagesInJuz.push(p);
        const readCount = pagesInJuz.filter(p => pagesVisited.includes(p)).length;
        if (readCount >= pagesInJuz.length * 0.8) juzRead++;
    }
    return juzRead;
}

function openStatsModal() {
    const stats = getReadingStats();
    const overlay = document.getElementById('statsOverlay');

    document.getElementById('statsPagesRead').textContent = stats.pagesRead;
    document.getElementById('statsVersesRead').textContent = stats.versesRead;
    document.getElementById('statsStreak').textContent = stats.dailyStreak;
    document.getElementById('statsJuz').textContent = stats.juzRead + '/30';

    document.getElementById('statsProgressFill').style.width = stats.percentage + '%';
    document.getElementById('statsProgressText').textContent = stats.percentage + '%';

    overlay.classList.add('active');
}

function closeStatsModal() {
    document.getElementById('statsOverlay').classList.remove('active');
}
