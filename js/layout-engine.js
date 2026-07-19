/* ================================================================
   LAYOUT ENGINE — Dynamic Quran Page Layout Calculator
   
   Measures verse heights, calculates pagination, and dynamically
   scales font size to ensure all content fits within the fixed
   page container without clipping or overflow.
   
   Architecture:
   1. Measure available viewport space (page height - chrome)
   2. Render all page content into a hidden measurement container
   3. If content overflows, binary-search for optimal font size
   4. Apply the optimal font size and render the final page
   ================================================================ */

const LayoutEngine = (function () {
    let _measurementEl = null;
    let _currentFontSize = null;
    let _cachedMeasurements = new Map();
    let _lastAvailableHeight = 0;

    const MIN_FONT_SCALE = 0.45;
    const MAX_FONT_SCALE = 1.0;
    const FIT_TOLERANCE = 4;
    const BINARY_SEARCH_PRECISION = 0.01;

    /* ─── Get or create the hidden measurement container ──────── */
    function _getMeasurementEl() {
        if (_measurementEl) return _measurementEl;

        _measurementEl = document.createElement('div');
        _measurementEl.className = 'quran-page quran-page--measure';
        _measurementEl.setAttribute('aria-hidden', 'true');
        _measurementEl.style.cssText = `
            position: fixed;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            pointer-events: none;
            z-index: -1;
            overflow: visible;
            height: auto !important;
            max-height: none !important;
        `;
        document.body.appendChild(_measurementEl);
        return _measurementEl;
    }

    /* ─── Calculate available reading height (viewport minus chrome) ── */
    function getAvailableHeight() {
        const vh = window.innerHeight;
        const header = document.querySelector('.header');
        const nav = document.querySelector('.navigation');
        const progress = document.querySelector('.reading-progress-bar');

        const headerH = header ? header.offsetHeight : 0;
        const navH = nav ? nav.offsetHeight : 0;
        const progressH = progress ? progress.offsetHeight : 0;
        const marginTop = parseFloat(getComputedStyle(document.documentElement)
            .getPropertyValue('--page-margin-top')) || 8;

        const available = vh - headerH - navH - progressH - marginTop * 2;
        _lastAvailableHeight = available;
        return available;
    }

    /* ─── Get current page CSS variables ──────────────────────── */
    function _getPageStyles() {
        const styles = getComputedStyle(document.documentElement);
        return {
            fontSize: parseFloat(styles.getPropertyValue('--quran-font-size')) || 1.75,
            lineHeight: parseFloat(styles.getPropertyValue('--quran-line-height')) || 2.4,
            wordSpacing: styles.getPropertyValue('--quran-word-spacing') || '0.15em',
            letterSpacing: styles.getPropertyValue('--quran-letter-spacing') || '0.02em',
            pagePadding: parseFloat(styles.getPropertyValue('--quran-page-padding')) || 2.5,
        };
    }

    /* ─── Build HTML for a set of page elements ───────────────── */
    function _buildPageHTML(pageElements) {
        let html = '';
        pageElements.forEach(el => {
            if (el.type === 'surah-header') {
                html += `
                    <div class="surah-info">
                        <span class="surah-corner surah-corner--tl"></span>
                        <span class="surah-corner surah-corner--tr"></span>
                        <span class="surah-corner surah-corner--bl"></span>
                        <span class="surah-corner surah-corner--br"></span>
                        <span class="surah-number-badge">${el.surahNumber}</span>
                        <h2 class="surah-name" data-surah="${el.surahNumber}">${el.surahName}</h2>
                        <p>${el.englishName} — ${el.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}</p>
                    </div>`;
            } else if (el.type === 'bismillah') {
                html += `
                    <div class="bismillah-container">
                        <div class="bismillah-decoration left"></div>
                        <h1 class="bismillah-text">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</h1>
                        <div class="bismillah-decoration right"></div>
                    </div>`;
            } else if (el.type === 'verse') {
                html += `
                    <div class="verse-container" data-surah="${el.surahNumber}" data-ayah="${el.numberInSurah}" data-surah-name="${el.surahName}">
                        <span class="verse-text">${el.displayText}</span>
                        <span class="verse-number">${toArabicNumber(el.numberInSurah)}</span>
                    </div>`;
            }
        });
        return html;
    }

    /* ─── Build page elements array from verse data ───────────── */
    function _buildPageElements(verses,pageNumber) {
        const elements = [];
        let currentSurah = null;

        verses.forEach(verse => {
            if (verse.surahNumber !== currentSurah) {
                if (verse.numberInSurah === 1) {
                    elements.push({
                        type: 'surah-header',
                        surahNumber: verse.surahNumber,
                        surahName: verse.surahName,
                        englishName: verse.englishName,
                        revelationType: verse.revelationType
                    });
                    if (pageNumber != 1 && pageNumber != 187) {
                        elements.push({ type: 'bismillah' });
                    }
                }
                currentSurah = verse.surahNumber;
            }

            const displayText = (verse.numberInSurah === 1 && pageNumber != 1 && pageNumber != 187)
                ? verse.text.substring(39)
                : verse.text;

            elements.push({
                type: 'verse',
                surahNumber: verse.surahNumber,
                numberInSurah: verse.numberInSurah,
                surahName: verse.surahName,
                displayText: displayText,
                verseData: verse
            });
        });

        return elements;
    }

    /* ─── Measure height of content at a given font size ──────── */
    function _measureContentHeight(html, fontSize, availableHeight) {
        const meas = _getMeasurementEl();
        const pageStyles = _getPageStyles();

        meas.innerHTML = html;
        meas.style.fontSize = fontSize + 'rem';
        meas.style.lineHeight = String(pageStyles.lineHeight);
        meas.style.wordSpacing = pageStyles.wordSpacing;
        meas.style.letterSpacing = pageStyles.letterSpacing;
        meas.style.width = '100%';
        meas.style.maxWidth = getComputedStyle(document.documentElement)
            .getPropertyValue('--quran-max-width') || '800px';
        meas.style.padding = pageStyles.pagePadding + 'rem ' + (pageStyles.pagePadding * 1.2) + 'rem';
        meas.style.textAlign = 'center';
        meas.style.direction = 'rtl';

        // Force layout recalculation
        meas.offsetHeight;

        return meas.scrollHeight;
    }

    /* ─── Binary search for optimal font size ─────────────────── */
    function findOptimalFontSize(html, targetFontSize, availableHeight) {
        const contentHeight = _measureContentHeight(html, targetFontSize, availableHeight);

        // Content fits at target size
        if (contentHeight <= availableHeight + FIT_TOLERANCE) {
            return {
                fontSize: targetFontSize,
                contentHeight: contentHeight,
                scale: 1.0,
                fits: true
            };
        }

        // Binary search for the largest font size that fits
        let low = targetFontSize * MIN_FONT_SCALE;
        let high = targetFontSize;
        let bestSize = low;
        let bestHeight = 0;

        for (let i = 0; i < 15; i++) {
            const mid = (low + high) / 2;
            const height = _measureContentHeight(html, mid, availableHeight);

            if (height <= availableHeight + FIT_TOLERANCE) {
                bestSize = mid;
                bestHeight = height;
                low = mid;
            } else {
                high = mid;
            }

            if (high - low < BINARY_SEARCH_PRECISION) break;
        }

        // Verify the best size actually fits
        const finalHeight = _measureContentHeight(html, bestSize, availableHeight);
        if (finalHeight > availableHeight + FIT_TOLERANCE) {
            bestSize = low;
        }

        return {
            fontSize: Math.round(bestSize * 100) / 100,
            contentHeight: _measureContentHeight(html, bestSize, availableHeight),
            scale: bestSize / targetFontSize,
            fits: true
        };
    }

    /* ─── Main layout calculation ─────────────────────────────── */
    function calculateLayout(pageElements, pageNumber) {
        const availableHeight = getAvailableHeight();
        const pageStyles = _getPageStyles();
        const targetFontSize = userFontSize || pageStyles.fontSize;

        // Build HTML for all elements on this page
        const html = _buildPageHTML(pageElements);

        // Find optimal font size
        const layout = findOptimalFontSize(html, targetFontSize, availableHeight);

        return {
            html: html,
            fontSize: layout.fontSize,
            availableHeight: availableHeight,
            contentHeight: layout.contentHeight,
            scale: layout.scale,
            fits: layout.fits,
            pageNumber: pageNumber
        };
    }

    /* ─── Public API ──────────────────────────────────────────── */
    return {
        getAvailableHeight,
        calculateLayout,
        findOptimalFontSize,
        _buildPageElements,
        _buildPageHTML,
        _measureContentHeight,

        /* Force re-measurement on resize */
        invalidate() {
            _lastAvailableHeight = 0;
        },

        /* Clean up measurement element */
        destroy() {
            if (_measurementEl && _measurementEl.parentNode) {
                _measurementEl.parentNode.removeChild(_measurementEl);
                _measurementEl = null;
            }
        }
    };
})();

/* User-set font size (from font controls), separate from layout scaling */
let userFontSize = null;
