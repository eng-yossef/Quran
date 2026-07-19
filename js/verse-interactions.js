let _toolbarHideTimer = null;
const TOOLBAR_HIDE_DELAY = 300;

function _showToolbar(verseContainer) {
    clearTimeout(_toolbarHideTimer);
    document.querySelectorAll('.verse-container').forEach(v => {
        if (v !== verseContainer) v.classList.remove('active-verse');
    });
    verseContainer.classList.add('active-verse');
}

function _hideToolbar(verseContainer) {
    _toolbarHideTimer = setTimeout(() => {
        verseContainer.classList.remove('active-verse');
    }, TOOLBAR_HIDE_DELAY);
}

function _cancelHide() {
    clearTimeout(_toolbarHideTimer);
}

function _positionToolbarNearCursor(verseContainer, x, y) {
    const actionsDiv = verseContainer.querySelector('.verse-actions');
    if (!actionsDiv) return;

    const isMobile = window.innerWidth <= 768;
    const gap = 10;
    const toolbarW = actionsDiv.offsetWidth || 200;
    const toolbarH = actionsDiv.offsetHeight || 40;

    let top, left;

    if (isMobile) {
        const verseRect = verseContainer.getBoundingClientRect();
        left = verseRect.left + verseRect.width / 2;
        top = y + gap;

        if (top + toolbarH > window.innerHeight - 8) {
            top = y - toolbarH - gap;
        }

        left = Math.max(toolbarW / 2 + 4, Math.min(window.innerWidth - toolbarW / 2 - 4, left));
        top = Math.max(4, Math.min(window.innerHeight - toolbarH - 4, top));
    } else {
        top = y - toolbarH - gap;
        left = x;

        if (top < 0) {
            top = y + gap;
        }

        left = Math.max(toolbarW / 2 + 4, Math.min(window.innerWidth - toolbarW / 2 - 4, left));
        top = Math.max(4, Math.min(window.innerHeight - toolbarH - 4, top));
    }

    actionsDiv.style.top = top + 'px';
    actionsDiv.style.left = left + 'px';
    actionsDiv.style.transform = 'translateX(-50%)';
}

function setupVerseInteractions() {
    const isTouchDevice = ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0);

    document.querySelectorAll('.verse-container').forEach(verseContainer => {
        verseContainer.classList.add('no-text-select');

        const surahNumber = parseInt(verseContainer.getAttribute('data-surah'));
        const verseNumber = parseInt(verseContainer.getAttribute('data-ayah'));
        const surahName = verseContainer.getAttribute('data-surah-name') || '';

        if (!verseContainer.querySelector('.verse-actions')) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'verse-actions';
            actionsDiv.setAttribute('role', 'toolbar');
            actionsDiv.setAttribute('aria-label', 'إجراءات الآية');
            actionsDiv.innerHTML = `
                <button class="verse-action-btn verse-tafsir-btn" onclick="event.stopPropagation(); showTafsir(this.closest('.verse-container'), ${surahNumber}, ${verseNumber})" title="تفسير الآية" aria-label="تفسير الآية">📖</button>
                <button class="verse-action-btn verse-bookmark-btn" onclick="event.stopPropagation(); toggleBookmark(${surahNumber}, ${verseNumber}, '${surahName.replace(/'/g, "\\'")}', this.closest('.verse-container').querySelector('.verse-text').textContent)" title="إضافة للمفضلة" aria-label="إضافة للمفضلة">☆</button>
                <button class="verse-action-btn" onclick="event.stopPropagation(); copyVerseText(${surahNumber}, ${verseNumber})" title="نسخ" aria-label="نسخ الآية">📋</button>
                <button class="verse-action-btn" onclick="event.stopPropagation(); shareVerse(${surahNumber}, ${verseNumber})" title="مشاركة" aria-label="مشاركة الآية">⤴</button>
                <button class="verse-action-btn verse-export-btn" onclick="event.stopPropagation(); exportVerseFromButton(this.closest('.verse-container'))" title="تصدير صورة" aria-label="تصدير الآية كصورة">🖼</button>
            `;
            verseContainer.appendChild(actionsDiv);

            actionsDiv.addEventListener('mouseenter', () => {
                _cancelHide();
            });

            actionsDiv.addEventListener('mouseleave', () => {
                _hideToolbar(verseContainer);
            });
        }

        let touchStartTime = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        let touchMoved = false;
        let isPotentialScroll = false;
        let longPressTimer = null;
        let longPressFired = false;
        const LONG_PRESS_DELAY = 400;

        const highlightVerse = () => {
            document.querySelectorAll('.verse-container').forEach(v => {
                v.classList.remove('active-verse');
            });
            verseContainer.classList.add('active-verse');
        };

        if (isTouchDevice) {
            verseContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
            verseContainer.addEventListener('touchmove', handleTouchMove, { passive: true });
            verseContainer.addEventListener('touchend', handleTouchEnd);
            verseContainer.addEventListener('touchcancel', handleTouchCancel);
        } else {
            verseContainer.addEventListener('click', handleDesktopClick);
            verseContainer.addEventListener('mouseenter', handleMouseEnter);
            verseContainer.addEventListener('mouseleave', handleMouseLeave);
        }

        function playVerse() {
            const isCurrentVersePlaying = currentPlayingSurah === surahNumber &&
                currentVerseSequence[currentVerseIndex]?.numberInSurah === verseNumber;

            if (isCurrentVersePlaying && !audioPaused) {
                toggleAudioPlayback();
            } else {
                document.querySelectorAll('.verse-container').forEach(v => {
                    v.classList.remove('active-verse');
                });
                verseContainer.style.opacity = '0.7';
                setTimeout(() => { verseContainer.style.opacity = ''; }, 300);
                playEntireSurah(surahNumber, { verseNumber: verseNumber });
            }
            clearSelection();
        }

        function showControls(x, y) {
            const isAlreadyActive = verseContainer.classList.contains('active-verse');

            document.querySelectorAll('.verse-container').forEach(v => {
                v.classList.remove('active-verse');
            });

            if (isAlreadyActive) {
                verseContainer.classList.remove('active-verse');
            } else {
                _showToolbar(verseContainer);
                _positionToolbarNearCursor(verseContainer, x, y);
                clearSelection();
            }
        }

        function handleTouchStart(e) {
            if (e.target.closest('.verse-actions')) {
                return;
            }
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchEndX = touchStartX;
            touchEndY = touchStartY;
            touchStartTime = Date.now();
            touchMoved = false;
            isPotentialScroll = false;
            longPressFired = false;

            clearTimeout(longPressTimer);
            longPressTimer = setTimeout(() => {
                if (!touchMoved) {
                    longPressFired = true;
                    showControls(touchStartX, touchStartY);
                }
            }, LONG_PRESS_DELAY);
        }

        function handleTouchMove(e) {
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;

            touchEndX = currentX;
            touchEndY = currentY;

            const xDiff = Math.abs(currentX - touchStartX);
            const yDiff = Math.abs(currentY - touchStartY);

            if (xDiff > 8 || yDiff > 8) {
                touchMoved = true;
                clearTimeout(longPressTimer);

                if (yDiff > xDiff) {
                    isPotentialScroll = true;
                }
            }
        }

        function handleTouchEnd(e) {
            clearTimeout(longPressTimer);

            if (longPressFired) {
                longPressFired = false;
                touchMoved = false;
                isPotentialScroll = false;
                return;
            }

            const touchDuration = Date.now() - touchStartTime;
            const isTap = !touchMoved && touchDuration < 250;

            const deltaX = Math.abs(touchEndX - touchStartX);
            const deltaY = Math.abs(touchEndY - touchStartY);
            const isHorizontalSwipe = deltaX > deltaY && deltaX > 30;

            if (isTap && !isHorizontalSwipe) {
                const target = e.target;

                if (target.closest('.verse-actions')) {
                    return;
                }

                e.preventDefault();
                playVerse();
            }

            touchMoved = false;
            isPotentialScroll = false;
        }

        function handleTouchCancel() {
            clearTimeout(longPressTimer);
            touchMoved = false;
            isPotentialScroll = false;
            longPressFired = false;
        }

        function handleDesktopClick(e) {
            if (!e.target.closest('.tafsir-modal') && !e.target.closest('.verse-actions')) {
                const isCurrentVersePlaying = currentPlayingSurah === surahNumber &&
                    currentVerseSequence[currentVerseIndex]?.numberInSurah === verseNumber;

                if (isCurrentVersePlaying && !audioPaused) {
                    toggleAudioPlayback();
                } else {
                    highlightVerse();
                    _positionToolbarNearCursor(verseContainer, e.clientX, e.clientY);
                    playEntireSurah(surahNumber, { verseNumber: verseNumber });
                    clearSelection();
                }
            }
        }

        function handleMouseEnter(e) {
            if (!verseContainer.classList.contains('active-verse')) {
                _showToolbar(verseContainer);
                _positionToolbarNearCursor(verseContainer, e.clientX, e.clientY);
            }
        }

        function handleMouseLeave() {
            _hideToolbar(verseContainer);
        }
    });

    function clearSelection() {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        } else if (document.selection) {
            document.selection.empty();
        }
    }

    if (isTouchDevice && !window._verseDismissListenerAdded) {
        window._verseDismissListenerAdded = true;
        document.addEventListener('touchend', function (e) {
            if (!e.target.closest('.verse-container')) {
                document.querySelectorAll('.verse-container').forEach(v => {
                    v.classList.remove('active-verse');
                });
            }
        }, { passive: true });
    }
}

function setupVerseHoverEffects() {
    const verses = document.querySelectorAll('.verse-container');

    verses.forEach(verse => {
        verse.addEventListener('mouseenter', function () {
            if (document.body.classList.contains('night-mode')) {
                this.style.setProperty('--glow-intensity', '0.6');
            }
        });

        verse.addEventListener('mouseleave', function () {
            this.style.setProperty('--glow-intensity', '0');
        });
    });
}
