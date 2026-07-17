const nightModeToggle = document.getElementById('nightModeToggle');

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

function onVersesLoaded() {
    updateVerseNumbers();
}
