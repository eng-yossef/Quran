function addToCache(key, value) {
    if (tafsirCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = tafsirCache.keys().next().value;
        tafsirCache.delete(oldestKey);
    }
    tafsirCache.set(key, value);
}

async function showTafsir(verseElement, surahNumber, verseNumber) {
    hideTafsir();

    const overlay = document.createElement('div');
    overlay.className = 'tafsir-overlay';

    const modal = document.createElement('div');
    modal.className = 'tafsir-modal';
    modal.innerHTML = `
        <div class="tafsir-modal-header">
            <span class="tafsir-modal-title">تفسير الميسر (${surahNumber}:${verseNumber})</span>
            <button class="close-tafsir-btn" aria-label="إغلاق التفسير">×</button>
        </div>
        <div class="tafsir-modal-body">
            <div class="tafsir-loading">جاري التحميل...</div>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close button
    const closeBtn = modal.querySelector('.close-tafsir-btn');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideTafsir();
    });

    // Click overlay backdrop to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            hideTafsir();
        }
    });

    // Prevent clicks inside modal from closing
    modal.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Escape key to close
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            hideTafsir();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // Fetch tafsir data
    const cacheKey = `${surahNumber}:${verseNumber}`;
    const bodyEl = modal.querySelector('.tafsir-modal-body');

    try {
        let tafsirData;

        if (tafsirCache.has(cacheKey)) {
            tafsirData = tafsirCache.get(cacheKey);
        } else {
            const response = await fetch(`https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/ar-tafsir-muyassar/${surahNumber}/${verseNumber}.json`);
            tafsirData = await response.json();
            addToCache(cacheKey, tafsirData);
        }

        bodyEl.innerHTML = tafsirData.text;

    } catch (error) {
        bodyEl.innerHTML = '<p style="color:#8A7E6A; text-align:center;">لا يتوفر تفسير لهذه الآية حالياً</p>';
    }
}

function hideTafsir() {
    const overlay = document.querySelector('.tafsir-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function setupTafsirCloseHandlers() {
    // Handled inline in showTafsir via overlay click and close button
}

function setupTafsirClickHandlers() {
    // Close button and overlay click handlers are set up in showTafsir().
    // No global capturing listeners needed here.
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
