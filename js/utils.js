function toArabicNumber(num) {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num
        .toString()
        .split('')
        .map(digit => /\d/.test(digit) ? arabicDigits[+digit] : digit)
        .join('');
}

function findPageForVerse(surahNumber, ayahNumber) {
    for (let page in pagesData) {
        if (pagesData[page].some(v => v.surahNumber == surahNumber && v.numberInSurah == ayahNumber)) {
            return parseInt(page);
        }
    }
    return currentPageNumber;
}

function findParentWithClass(element, className, maxDepth = 5) {
    let current = element;
    let depth = 0;

    while (current && depth < maxDepth) {
        if (current.classList && current.classList.contains(className)) {
            return current;
        }
        current = current.parentNode;
        depth++;
    }
    return null;
}

function showSaveNotification() {
    const notification = document.createElement('div');
    notification.textContent = 'Preparing verse image...';
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 20px';
    notification.style.background = '#2E8B57';
    notification.style.color = 'white';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '1000';
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}
