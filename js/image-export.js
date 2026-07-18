async function saveVerseAsImage(selection) {
    try {
        const range = selection.getRangeAt(0);
        let container = range.startContainer;
        if (container.nodeType === Node.TEXT_NODE) {
            container = container.parentNode;
        }

        const verseContainer = findParentWithClass(container, 'verse-container');
        if (!verseContainer) {
            console.warn('No verse container found for selection');
            return;
        }

        const decoratedVerse = createDecoratedVerse(verseContainer, selection.toString());

        const html2canvas = await loadHtml2Canvas();

        html2canvas(decoratedVerse, {
            backgroundColor: null,
            scale: 2,
            logging: false,
            allowTaint: true,
            useCORS: true
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `quran-verse-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            document.body.removeChild(decoratedVerse);
        });
    } catch (error) {
        console.error('Error saving verse as image:', error);
    }
}

function createDecoratedVerse(verseContainer, selectedText) {
    const verseNumber = verseContainer.querySelector('.verse-number')?.textContent;
    const surahName = verseContainer.dataset.surahName || 'السورة';

    const decorated = document.createElement('div');
    decorated.className = 'qv-premium-container';
    decorated.innerHTML = `
        <div class="qv-premium-gold-accent"></div>
        <div class="qv-premium-pattern"></div>
        <div class="qv-premium-corner qv-premium-corner-tl"></div>
        <div class="qv-premium-corner qv-premium-corner-tr"></div>
        <div class="qv-premium-corner qv-premium-corner-bl"></div>
        <div class="qv-premium-corner qv-premium-corner-br"></div>
        
        <div class="qv-premium-header">
            <div class="qv-premium-meta">
                <div class="qv-premium-surah">${surahName}</div>
                <span class="qv-premium-number">آية  ${verseNumber}</span>
            </div>
        </div>
        
        <div class="qv-premium-text">${selectedText}</div>   
    `;

    document.body.appendChild(decorated);
    return decorated;
}

function loadHtml2Canvas() {
    return new Promise((resolve) => {
        if (window.html2canvas) {
            showSaveNotification();

            return resolve(window.html2canvas);
        }
        const script = document.createElement('script');
        script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
        script.onload = () => resolve(window.html2canvas);
        document.head.appendChild(script);
    });
}

function exportVerseFromButton(verseContainer) {
    if (!verseContainer) return;

    const verseText = verseContainer.querySelector('.verse-text')?.textContent || '';
    const verseNumber = verseContainer.querySelector('.verse-number')?.textContent || '';
    const surahName = verseContainer.getAttribute('data-surah-name') || 'السورة';

    if (!verseText) return;

    const decorated = document.createElement('div');
    decorated.className = 'qv-premium-container';
    decorated.innerHTML = `
        <div class="qv-premium-gold-accent"></div>
        <div class="qv-premium-pattern"></div>
        <div class="qv-premium-corner qv-premium-corner-tl"></div>
        <div class="qv-premium-corner qv-premium-corner-tr"></div>
        <div class="qv-premium-corner qv-premium-corner-bl"></div>
        <div class="qv-premium-corner qv-premium-corner-br"></div>
        <div class="qv-premium-header">
            <div class="qv-premium-meta">
                <div class="qv-premium-surah">${surahName}</div>
                <span class="qv-premium-number">آية ${verseNumber}</span>
            </div>
        </div>
        <div class="qv-premium-text">${verseText}</div>
    `;

    document.body.appendChild(decorated);

    loadHtml2Canvas().then(html2canvas => {
        html2canvas(decorated, {
            backgroundColor: null,
            scale: 2,
            logging: false,
            allowTaint: true,
            useCORS: true
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `quran-verse-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            document.body.removeChild(decorated);
            showToast('تم تصدير الصورة');
        }).catch(err => {
            console.error('Export error:', err);
            document.body.removeChild(decorated);
            showToast('فشل تصدير الصورة');
        });
    });
}
