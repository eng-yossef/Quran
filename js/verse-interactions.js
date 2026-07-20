let _toolbarHideTimer = null;
const TOOLBAR_HIDE_DELAY = 300;
let _activeToolbarVerse = null;
let _scrollDismissHandler = null;

function _showToolbar(verseContainer) {
    clearTimeout(_toolbarHideTimer);
    document.querySelectorAll('.verse-container').forEach(v => {
        if (v !== verseContainer) v.classList.remove('active-verse');
    });
    verseContainer.classList.add('active-verse');
    _activeToolbarVerse = verseContainer;
}

function _hideToolbar(verseContainer) {
    _toolbarHideTimer = setTimeout(() => {
        if (verseContainer) verseContainer.classList.remove('active-verse');
        if (_activeToolbarVerse === verseContainer) _activeToolbarVerse = null;
    }, TOOLBAR_HIDE_DELAY);
}

function _cancelHide() {
    clearTimeout(_toolbarHideTimer);
}

function _hideAllToolbars() {
    clearTimeout(_toolbarHideTimer);
    document.querySelectorAll('.verse-container.active-verse').forEach(v => {
        v.classList.remove('active-verse');
    });
    _activeToolbarVerse = null;
}

function _setupScrollDismiss() {
    if (_scrollDismissHandler) return;
    _scrollDismissHandler = function () {
        if (_activeToolbarVerse) {
            _hideAllToolbars();
        }
    };
    window.addEventListener('scroll', _scrollDismissHandler, { passive: true });
}

function _positionToolbarNearCursor(verseContainer, x, y) {
    const actionsDiv = verseContainer.querySelector('.verse-actions');
    if (!actionsDiv) return;

    const isMobile = window.innerWidth <= 768;
    const gap = isMobile ? 12 : 10;
    const toolbarW = actionsDiv.offsetWidth || 200;
    const toolbarH = actionsDiv.offsetHeight || 44;

    let top, left;

    if (isMobile) {
        top = y - toolbarH - gap;
        left = x;

        if (top < 8) {
            top = y + gap;
        }

        if (top + toolbarH > window.innerHeight - 16) {
            top = y - toolbarH - gap;
        }

        if (top < 8) {
            top = Math.max(8, (window.innerHeight - toolbarH) / 2);
        }

        left = Math.max(toolbarW / 2 + 8, Math.min(window.innerWidth - toolbarW / 2 - 8, left));
        top = Math.max(8, Math.min(window.innerHeight - toolbarH - 8, top));
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

    _setupScrollDismiss();

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

            const lastReadData = (typeof getLastRead === 'function') ? getLastRead() : null;
            const isThisVerseLastRead = lastReadData && lastReadData.surahNumber === surahNumber && lastReadData.ayahNumber === verseNumber;
            const lastReadIcon = isThisVerseLastRead ? '❌' : '📍';
            const lastReadTitle = isThisVerseLastRead ? 'إزالة علامة آخر قراءة' : 'تعيين كآخر موضع قراءة';
            const lastReadAriaLabel = lastReadTitle;

            actionsDiv.innerHTML = `
                <button class="verse-action-btn verse-tafsir-btn" onclick="event.stopPropagation(); showTafsir(this.closest('.verse-container'), ${surahNumber}, ${verseNumber})" title="تفسير الآية" aria-label="تفسير الآية">📖</button>
                <button class="verse-action-btn verse-bookmark-btn" onclick="event.stopPropagation(); toggleBookmark(${surahNumber}, ${verseNumber}, '${surahName.replace(/'/g, "\\'")}', this.closest('.verse-container').querySelector('.verse-text').textContent)" title="إضافة للمفضلة" aria-label="إضافة للمفضلة">☆</button>
                <button class="verse-action-btn" onclick="event.stopPropagation(); copyVerseText(${surahNumber}, ${verseNumber})" title="نسخ" aria-label="نسخ الآية">📋</button>
                <button class="verse-action-btn" onclick="event.stopPropagation(); shareVerse(${surahNumber}, ${verseNumber})" title="مشاركة" aria-label="مشاركة الآية">⤴</button>
                <button class="verse-action-btn verse-export-btn" onclick="event.stopPropagation(); exportVerseFromButton(this.closest('.verse-container'))" title="تصدير صورة" aria-label="تصدير الآية كصورة">🖼</button>
                <button class="verse-action-btn verse-lastread-btn${isThisVerseLastRead ? ' is-lastread' : ''}" title="${lastReadTitle}" aria-label="${lastReadAriaLabel}">${lastReadIcon}</button>
            `;
            verseContainer.appendChild(actionsDiv);

            const lastReadBtn = actionsDiv.querySelector('.verse-lastread-btn');
            if (lastReadBtn && typeof _setupLastReadButtonAction === 'function') {
                _setupLastReadButtonAction(lastReadBtn, surahNumber, verseNumber);
            }

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
        let toolbarInteracting = false;
        const LONG_PRESS_DELAY = 400;
        const MOVE_THRESHOLD = 12;

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
                _activeToolbarVerse = null;
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
                _activeToolbarVerse = null;
            } else {
                _showToolbar(verseContainer);

                const actionsDiv = verseContainer.querySelector('.verse-actions');
                if (actionsDiv) {
                    void actionsDiv.offsetWidth;
                }

                _positionToolbarNearCursor(verseContainer, x, y);
                clearSelection();

                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }
        }

        function handleTouchStart(e) {
            if (e.target.closest('.verse-actions')) {
                toolbarInteracting = true;
                return;
            }

            toolbarInteracting = false;
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
            if (toolbarInteracting) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;

            touchEndX = currentX;
            touchEndY = currentY;

            const xDiff = Math.abs(currentX - touchStartX);
            const yDiff = Math.abs(currentY - touchStartY);

            if (xDiff > MOVE_THRESHOLD || yDiff > MOVE_THRESHOLD) {
                touchMoved = true;
                clearTimeout(longPressTimer);

                if (yDiff > xDiff) {
                    isPotentialScroll = true;
                }
            }
        }

        function handleTouchEnd(e) {
            if (toolbarInteracting) {
                toolbarInteracting = false;
                return;
            }

            clearTimeout(longPressTimer);

            if (longPressFired) {
                e.preventDefault();
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
            toolbarInteracting = false;
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
                _hideAllToolbars();
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
