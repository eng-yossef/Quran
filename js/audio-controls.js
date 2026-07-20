const AUDIO_SPEED_KEY = 'quran-audio-speed';
const REPEAT_COUNT_KEY = 'quran-repeat-count';

let currentAudioSpeed = parseFloat(localStorage.getItem(AUDIO_SPEED_KEY) || '1');
let currentRepeatCount = parseInt(localStorage.getItem(REPEAT_COUNT_KEY) || '1');
let repeatIteration = 0;

function initAudioControls() {
    const speedSelect = document.getElementById('audioSpeedSelect');
    const repeatSelect = document.getElementById('repeatSelect');

    if (speedSelect) {
        speedSelect.value = currentAudioSpeed;
        speedSelect.addEventListener('change', (e) => {
            currentAudioSpeed = parseFloat(e.target.value);
            localStorage.setItem(AUDIO_SPEED_KEY, currentAudioSpeed);
            if (currentAudio) {
                currentAudio.playbackRate = currentAudioSpeed;
            }
        });
    }

    if (repeatSelect) {
        repeatSelect.value = currentRepeatCount;
        repeatSelect.addEventListener('change', (e) => {
            currentRepeatCount = parseInt(e.target.value);
            localStorage.setItem(REPEAT_COUNT_KEY, currentRepeatCount);
        });
    }
}

function applyAudioSpeed(audio) {
    if (audio) {
        audio.playbackRate = currentAudioSpeed;
    }
}

function showRepeatControls() {
    const controls = document.getElementById('repeatControls');
    if (controls) {
        controls.classList.add('active');
        updateRepeatDisplay();
    }
}

function hideRepeatControls() {
    const controls = document.getElementById('repeatControls');
    if (controls) controls.classList.remove('active');
    repeatIteration = 0;
    updateRepeatDisplay();
}

function updateRepeatDisplay() {
    const display = document.getElementById('repeatCountDisplay');
    if (!display) return;
    if (currentRepeatCount === 0) {
        display.textContent = '∞';
    } else {
        display.textContent = `${repeatIteration}/${currentRepeatCount}`;
    }
}

function shouldRepeat() {
    if (currentRepeatCount === 0) return true;
    repeatIteration++;
    updateRepeatDisplay();
    return repeatIteration < currentRepeatCount;
}

function resetRepeatCount() {
    repeatIteration = 0;
    updateRepeatDisplay();
}
