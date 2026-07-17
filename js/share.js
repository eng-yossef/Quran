function copyVerseText(surahNumber, verseNumber) {
    let verseText = '';
    let surahName = '';

    for (let page in pagesData) {
        const verse = pagesData[page].find(v => v.surahNumber == surahNumber && v.numberInSurah == verseNumber);
        if (verse) {
            verseText = verse.text;
            surahName = verse.surahName;
            break;
        }
    }

    if (!verseText) return;

    const fullText = `${verseText}\n\n${surahName} - آية ${toArabicNumber(verseNumber)}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullText).then(() => {
            showToast('تم نسخ الآية');
        }).catch(() => {
            fallbackCopy(fullText);
        });
    } else {
        fallbackCopy(fullText);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('تم نسخ الآية');
    } catch (err) {
        showToast('فشل النسخ');
    }
    document.body.removeChild(textarea);
}

function shareVerse(surahNumber, verseNumber) {
    let verseText = '';
    let surahName = '';

    for (let page in pagesData) {
        const verse = pagesData[page].find(v => v.surahNumber == surahNumber && v.numberInSurah == verseNumber);
        if (verse) {
            verseText = verse.text;
            surahName = verse.surahName;
            break;
        }
    }

    if (!verseText) return;

    const shareData = {
        title: `${surahName} - آية ${verseNumber}`,
        text: `${verseText}\n\n${surahName} - آية ${toArabicNumber(verseNumber)}`
    };

    if (navigator.share) {
        navigator.share(shareData).catch(() => {
            copyVerseText(surahNumber, verseNumber);
        });
    } else {
        copyVerseText(surahNumber, verseNumber);
    }
}

function showToast(message) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 2500);
}
