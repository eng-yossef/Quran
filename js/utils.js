function toArabicNumber(num) {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num
        .toString()
        .split('')
        .map(digit => /\d/.test(digit) ? arabicDigits[+digit] : digit)
        .join('');
}

/**
 * Normalize Arabic text for diacritic-insensitive comparison.
 * Strips Tashkeel, normalizes Alef/Hamza variants, Teh Marbuta, and Alef Maqsura.
 * Does NOT mutate the original text — returns a new string.
 */
function normalizeArabic(text) {
    if (!text) return '';
    return text
        // 1. Remove all Arabic diacritics (Tashkeel)
        //    Fatha/Damma/Kasra/Tanween:  U+064B–U+065F, U+0670
        //    Shadda/Sukun:               U+0650–U+0658
        //    Quranic annotation marks:   U+06D6–U+06ED
        //    Combining marks:            U+0610–U+061A, U+08F0–U+08FF
        //    Tatweel:                    U+0640
        .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u06EF-\u06FF\u08F0-\u08FF]/g, '')
        // 2. Normalize Alef variants → ا
        .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
        // 3. Normalize Teh Marbuta ة → ه
        .replace(/\u0629/g, '\u0647')
        // 4. Normalize Alef Maqsura ى → ي
        .replace(/\u0649/g, '\u064A')
        // 5. Normalize Hamza-on-waw ؤ and Hamza-on-ya ئ → remove (base letter preserved)
        .replace(/[\u0624\u0626]/g, (m) => m === '\u0624' ? '\u0648' : '\u064A');
}

/**
 * Build a mapping from each index in the normalized string
 * back to the corresponding index in the original string.
 * Useful for finding highlight ranges in the original text.
 */
function buildNormalizationMap(original) {
    if (!original) return [];
    const map = [];
    const diacritics = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u06EF-\u06FF\u08F0-\u08FF]/;

    for (let i = 0; i < original.length; i++) {
        if (!diacritics.test(original[i])) {
            map.push(i);
        }
    }
    return map;
}

/**
 * Highlight a search match in the original (fully vocalized) text.
 * Uses the normalization map to find the correct character range to wrap
 * in <mark> tags, preserving all diacritics in the displayed text.
 */
function highlightMatch(originalText, query) {
    if (!query || !originalText) return originalText || '';

    const normalizedText = normalizeArabic(originalText);
    const normalizedQuery = normalizeArabic(query);
    const matchIndex = normalizedText.indexOf(normalizedQuery);

    if (matchIndex === -1) {
        // Fallback: return a trimmed snippet of the original
        const maxLen = 120;
        let snippet = originalText.substring(0, maxLen);
        if (originalText.length > maxLen) snippet += '...';
        return snippet;
    }

    const map = buildNormalizationMap(originalText);
    const start = map[matchIndex] !== undefined ? map[matchIndex] : 0;
    const end = map[matchIndex + normalizedQuery.length - 1];
    const matchEnd = end !== undefined ? end + 1 : start + normalizedQuery.length;

    // Build a snippet around the match for display context
    const contextBefore = 30;
    const contextAfter = 70;
    const snippetStart = Math.max(0, start - contextBefore);
    const snippetEnd = Math.min(originalText.length, matchEnd + contextAfter);

    let prefix = snippetStart > 0 ? '...' : '';
    let suffix = snippetEnd < originalText.length ? '...' : '';

    const before = originalText.substring(snippetStart, start);
    const match = originalText.substring(start, matchEnd);
    const after = originalText.substring(matchEnd, snippetEnd);

    return `${prefix}${before}<mark>${match}</mark>${after}${suffix}`;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
