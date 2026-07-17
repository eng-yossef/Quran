const FONT_SIZE_KEY = 'quran-font-size';
const DEFAULT_FONT_SIZE = 1.5;
const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 3;
const FONT_STEP = 0.1;

let currentFontSize = parseFloat(localStorage.getItem(FONT_SIZE_KEY) || DEFAULT_FONT_SIZE);

function initFontControls() {
    const fontIncrease = document.getElementById('fontIncrease');
    const fontDecrease = document.getElementById('fontDecrease');

    fontIncrease.addEventListener('click', () => changeFontSize(FONT_STEP));
    fontDecrease.addEventListener('click', () => changeFontSize(-FONT_STEP));

    applyFontSize();
}

function changeFontSize(delta) {
    const newSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, currentFontSize + delta));
    if (newSize !== currentFontSize) {
        currentFontSize = newSize;
        localStorage.setItem(FONT_SIZE_KEY, currentFontSize);
        applyFontSize();
    }
}

function applyFontSize() {
    const quranPage = document.getElementById('quranPage');
    if (quranPage) {
        quranPage.style.fontSize = currentFontSize + 'rem';
    }
}

function getFontSize() {
    return currentFontSize;
}
