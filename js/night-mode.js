const nightModeToggle = document.getElementById('nightModeToggle');

function updateVerseNumbers() {
    const verseNumbers = document.querySelectorAll('.verse-number');
    verseNumbers.forEach(num => {
        if (isNightMode) {
            num.style.removeProperty('background-color');
            num.style.removeProperty('color');
            num.style.removeProperty('box-shadow');
        } else {
            num.style.removeProperty('background-color');
            num.style.removeProperty('color');
            num.style.removeProperty('box-shadow');
        }
    });
}

function applyNightMode() {
    document.body.classList.toggle('night-mode', isNightMode);
    nightModeToggle.textContent = isNightMode ? '☀️' : '🌙';
    updateVerseNumbers();
    setupVerseHoverEffects();
}

function onVersesLoaded() {
    updateVerseNumbers();
}
