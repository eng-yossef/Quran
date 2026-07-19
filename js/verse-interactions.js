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

    const gap = 10;
    const toolbarW = actionsDiv.offsetWidth || 200;
    const toolbarH = actionsDiv.offsetHeight || 40;

    let top = y - toolbarH - gap;
    let left = x;

    if (top < 0) {
        top = y + gap;
    }

    left = Math.max(toolbarW / 2 + 4, Math.min(window.innerWidth - toolbarW / 2 - 4, left));
    top = Math.max(4, Math.min(window.innerHeight - toolbarH - 4, top));

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

        let tafsirTimer = null;
        let touchStartTime = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        let touchMoved = false;
        let isPotentialScroll = false;

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

        function handleTouchStart(e) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchEndX = touchStartX;
            touchEndY = touchStartY;
            touchStartTime = Date.now();
            touchMoved = false;
            isPotentialScroll = false;

            tafsirTimer = setTimeout(() => {
                if (!touchMoved && !isPotentialScroll) {
                    clearSelection();
                    showTafsir(verseContainer, surahNumber, verseNumber);
                }
            }, 500);
        }

        function handleTouchMove(e) {
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;

            touchEndX = currentX;
            touchEndY = currentY;

            const xDiff = Math.abs(currentX - touchStartX);
            const yDiff = Math.abs(currentY - touchStartY);

            if (xDiff > 5 || yDiff > 5) {
                touchMoved = true;

                if (yDiff > xDiff) {
                    isPotentialScroll = true;
                }

                if (tafsirTimer) {
                    clearTimeout(tafsirTimer);
                    tafsirTimer = null;
                }
            }
        }

        function handleTouchEnd(e) {
            const touchDuration = Date.now() - touchStartTime;
            const isTap = !touchMoved && touchDuration < 300;

            const deltaX = Math.abs(touchEndX - touchStartX);
            const deltaY = Math.abs(touchEndY - touchStartY);
            const isHorizontalSwipe = deltaX > deltaY && deltaX > 30;

            if (tafsirTimer) {
                clearTimeout(tafsirTimer);
                tafsirTimer = null;
            }

            if (isTap && !isHorizontalSwipe) {
                const target = e.target;

                if (target.closest('.verse-actions')) {
                    return;
                }

                e.preventDefault();

                const isAlreadyActive = verseContainer.classList.contains('active-verse');

                document.querySelectorAll('.verse-container').forEach(v => {
                    v.classList.remove('active-verse');
                });

                if (isAlreadyActive) {
                    verseContainer.classList.remove('active-verse');
                } else {
                    _showToolbar(verseContainer);
                    _positionToolbarNearCursor(verseContainer, touchEndX, touchEndY);

                    const isCurrentVersePlaying = currentPlayingSurah === surahNumber &&
                        currentVerseSequence[currentVerseIndex]?.numberInSurah === verseNumber;

                    if (isCurrentVersePlaying && !audioPaused) {
                        toggleAudioPlayback();
                    } else {
                        playEntireSurah(surahNumber, { verseNumber: verseNumber });
                    }
                    clearSelection();
                }
            }

            touchMoved = false;
            isPotentialScroll = false;
        }

        function handleTouchCancel() {
            if (tafsirTimer) {
                clearTimeout(tafsirTimer);
                tafsirTimer = null;
            }
            touchMoved = false;
            isPotentialScroll = false;
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

    if (isTouchDevice) {
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
