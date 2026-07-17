function addToCache(key, value) {
    if (tafsirCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = tafsirCache.keys().next().value;
        tafsirCache.delete(oldestKey);
    }
    tafsirCache.set(key, value);
}

async function showTafsir(verseElement, surahNumber, verseNumber) {
    hideTafsir(verseElement);

    const tooltip = document.createElement('div');
    tooltip.className = 'verse-tafsir';
    verseElement.appendChild(tooltip);

    tooltip.innerHTML = `
        <div class="verse-tafsir-header">
            تفسير المیسر
            <button class="close-tafsir-btn" aria-label="إغلاق التفسير">×</button>
        </div>
        <div class="tafsir-content">جاري التحميل...</div>
    `;

    const closeButton = tooltip.querySelector('.close-tafsir-btn');
    addCloseButtonListener(closeButton, verseElement);

    const cacheKey = `${surahNumber}:${verseNumber}`;

    try {
        let tafsirData;

        if (tafsirCache.has(cacheKey)) {
            tafsirData = tafsirCache.get(cacheKey);
        } else {
            const response = await fetch(`https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/ar-tafsir-muyassar/${surahNumber}/${verseNumber}.json`);
            tafsirData = await response.json();
            addToCache(cacheKey, tafsirData);
        }

        tooltip.innerHTML = `
            <div class="verse-tafsir-header">
                تفسير المیسر (${surahNumber}:${verseNumber})
                <button class="close-tafsir-btn" aria-label="إغلاق التفسير">×</button>
            </div>
            <div class="tafsir-content">${tafsirData.text}</div>
        `;

        const newCloseButton = tooltip.querySelector('.close-tafsir-btn');
        addCloseButtonListener(newCloseButton, verseElement);

    } catch (error) {
        tooltip.innerHTML = `
            <div class="verse-tafsir-header">
                تفسير المیسر
                <button class="close-tafsir-btn" aria-label="إغلاق التفسير">×</button>
            </div>
            <div class="tafsir-content">لا يتوفر تفسير لهذه الآية حالياً</div>
        `;

        const newCloseButton = tooltip.querySelector('.close-tafsir-btn');
        addCloseButtonListener(newCloseButton, verseElement);
    }

    tooltip.style.display = 'block';
    positionTafsirTooltip(verseElement, tooltip);
}

function addCloseButtonListener(closeButton, verseElement) {
    const handleCloseClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideTafsir(verseElement);
    };

    closeButton.addEventListener('click', handleCloseClick);
    closeButton.addEventListener('touchstart', handleCloseClick);
}

function hideTafsir(verseElement) {
    document.querySelectorAll('.verse-tafsir').forEach(t => {
        t.style.display = 'none';
    });
}

function positionTafsirTooltip(verseElement, tooltip) {
    const verseRect = verseElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    tooltip.style.display = 'block';
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;

    let horizontalOffset = 15;
    let maxTooltipWidth = Math.min(300, viewportWidth - 40);
    let verticalOffset = 0;
    const minMargin = 10;

    if (viewportWidth >= 768 && viewportWidth < 1024) {
        maxTooltipWidth = 200;
        horizontalOffset = 20;
    } else if (viewportWidth < 768) {
        maxTooltipWidth = viewportWidth - 50;
        horizontalOffset = 10;
    } else if (viewportWidth >= 1024) {
        maxTooltipWidth = 400;
        horizontalOffset = 25;
    }

    tooltip.style.maxWidth = `${maxTooltipWidth}px`;
    tooltip.style.width = 'auto';
    const effectiveTooltipWidth = Math.min(tooltipWidth, maxTooltipWidth);

    const rightPosition = verseRect.right + horizontalOffset;
    const leftPosition = verseRect.left - horizontalOffset - effectiveTooltipWidth;
    const spaceRight = viewportWidth - verseRect.right - horizontalOffset;
    const spaceLeft = verseRect.left - horizontalOffset;

    let useRightSide;

    if (viewportWidth >= 1024) {
        useRightSide = spaceRight >= effectiveTooltipWidth ||
            (spaceRight >= spaceLeft && spaceRight >= minMargin);
    } else {
        const isRightEdgeVerse = verseRect.right > viewportWidth * 0.7;
        useRightSide = !isRightEdgeVerse && spaceRight >= effectiveTooltipWidth;
    }

    if (useRightSide && (rightPosition + effectiveTooltipWidth > viewportWidth - minMargin)) {
        useRightSide = (leftPosition >= minMargin);
    }

    if (viewportWidth < 768) {
        tooltip.style.left = `${(viewportWidth - effectiveTooltipWidth) / 5}px`;
        tooltip.style.right = 'auto';
    } else {
        if (useRightSide) {
            tooltip.style.left = `${Math.min(rightPosition, viewportWidth - effectiveTooltipWidth - minMargin) - 150}px`;
            tooltip.style.right = 'auto';
        } else {
            tooltip.style.left = `${Math.max(leftPosition, minMargin) - 11}px`;
            tooltip.style.right = 'auto';
        }
    }

    verticalOffset = (verseRect.height - tooltipHeight) / 2;

    if (verseRect.top + verticalOffset < minMargin) {
        verticalOffset = -verseRect.top + minMargin;
    }
    if (verseRect.bottom + verticalOffset + tooltipHeight > viewportHeight - minMargin) {
        verticalOffset = viewportHeight - verseRect.bottom - tooltipHeight - minMargin;
    }

    tooltip.style.top = `${verseRect.top + verticalOffset}px`;

    if (viewportWidth < 768) {
        tooltip.style.setProperty('--arrow-left', '50%');
        tooltip.style.setProperty('--arrow-border', '10px solid transparent 10px solid #d4af37 10px solid transparent');
    } else if (useRightSide) {
        tooltip.style.setProperty('--arrow-left', '-10px');
        tooltip.style.setProperty('--arrow-border',
            '10px solid transparent 10px solid #d4af37 10px solid transparent');
    } else {
        tooltip.style.setProperty('--arrow-left', 'calc(100% - 1px)');
        tooltip.style.setProperty('--arrow-border',
            '10px solid #d4af37 10px solid transparent 10px solid transparent');
    }
}

function setupTafsirCloseHandlers() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-tafsir-btn')) {
            e.stopImmediatePropagation();
            e.preventDefault();

            const tafsir = e.target.closest('.verse-tafsir');
            if (tafsir) {
                tafsir.style.display = 'none';
            }
        }
    }, true);
}

function setupTafsirClickHandlers() {
    document.addEventListener('click', function (e) {
        if (e.target.closest('.verse-tafsir')) {
            e.stopImmediatePropagation();
        }
    }, true);

    document.addEventListener('touchend', function (e) {
        if (e.target.closest('.verse-tafsir')) {
            e.stopImmediatePropagation();
        }
    }, true);
}

function setupTafsirHideOnScroll() {
    window.addEventListener('scroll', handleScroll, { passive: true });
}

function handleScroll() {
    if (scrollTimeout) {
        clearTimeout(scrollTimeout);
    }

    if (Math.abs(window.pageYOffset - lastScrollPosition) > 5) {
        scrollTimeout = setTimeout(() => {
            hideTafsir();
        }, 100);
    }

    lastScrollPosition = window.pageYOffset;
}
