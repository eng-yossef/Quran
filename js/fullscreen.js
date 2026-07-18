function initFullscreen() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    const exitBtn = document.querySelector('.fullscreen-exit-btn');
    if (exitBtn) {
        exitBtn.addEventListener('click', exitFullscreen);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('fullscreen-mode')) {
            exitFullscreen();
        }
    });

    document.addEventListener('mousemove', showFullscreenHint);
}

let fullscreenHintTimeout;

function toggleFullscreen() {
    if (document.body.classList.contains('fullscreen-mode')) {
        exitFullscreen();
    } else {
        enterFullscreen();
    }
}

function enterFullscreen() {
    document.body.classList.add('fullscreen-mode');
    document.getElementById('fullscreenBtn').classList.add('active');
    document.getElementById('fullscreenBtn').textContent = '✕';
    showFullscreenExitHint();
}

function exitFullscreen() {
    document.body.classList.remove('fullscreen-mode');
    document.getElementById('fullscreenBtn').classList.remove('active');
    document.getElementById('fullscreenBtn').textContent = '⛶';
}

function showFullscreenExitHint() {
    const hint = document.querySelector('.fullscreen-exit-hint');
    if (!hint) return;
    hint.classList.add('show');
    setTimeout(() => hint.classList.remove('show'), 3000);
}

function showFullscreenHint() {
    if (!document.body.classList.contains('fullscreen-mode')) return;
    const hint = document.querySelector('.fullscreen-exit-hint');
    if (!hint) return;
    hint.classList.add('show');
    clearTimeout(fullscreenHintTimeout);
    fullscreenHintTimeout = setTimeout(() => hint.classList.remove('show'), 2000);
}
