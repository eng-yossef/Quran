/* ===== Premium Quran Verse Export Engine — Canvas 2D API ===== */
/* Arabic text is rendered exclusively via the browser's native Canvas 2D    */
/* text shaping pipeline. No html2canvas, no AI image generation.           */
/* The original Unicode string is drawn character-for-character.            */

// ===========================
// Configuration
// ===========================

const QV_TEMPLATES = {
    classic: { id: 'classic', name: 'كلاسيكي', nameEn: 'Classic Mushaf', icon: '📜' },
    modern:  { id: 'modern',  name: 'عصري',    nameEn: 'Modern Minimal',  icon: '✨' },
    emerald: { id: 'emerald', name: 'زمردي',   nameEn: 'Emerald',         icon: '💎' },
    dark:    { id: 'dark',    name: 'داكن',    nameEn: 'Dark Gold',       icon: '🌑' },
    glass:   { id: 'glass',   name: 'زجاجي',   nameEn: 'Glassmorphism',   icon: '🔮' },
    night:   { id: 'night',   name: 'ليلي',    nameEn: 'Night Sky',       icon: '🌙' }
};

const QV_FORMATS = {
    'ig-post':   { label: 'Instagram',   sublabel: '1080×1080', w: 1080, h: 1080, icon: 'sq' },
    'ig-story':  { label: 'Story',       sublabel: '1080×1920', w: 1080, h: 1920, icon: 'story' },
    'facebook':  { label: 'Facebook',    sublabel: '1200×630',  w: 1200, h: 630,  icon: 'landscape' },
    'twitter':   { label: 'X / Twitter', sublabel: '1600×900',  w: 1600, h: 900,  icon: 'landscape' },
    'whatsapp':  { label: 'WhatsApp',    sublabel: '1080×1920', w: 1080, h: 1920, icon: 'story' },
    'telegram':  { label: 'Telegram',    sublabel: '1280×720',  w: 1280, h: 720,  icon: 'landscape' },
    'pinterest': { label: 'Pinterest',   sublabel: '1000×1500', w: 1000, h: 1500, icon: 'portrait' },
    'desktop':   { label: 'Desktop',     sublabel: '1920×1080', w: 1920, h: 1080, icon: 'wide' },
    'mobile':    { label: 'Mobile',      sublabel: '1080×1920', w: 1080, h: 1920, icon: 'portrait' },
    'a4':        { label: 'A4 Print',    sublabel: '2480×3508', w: 2480, h: 3508, icon: 'a4' }
};

const QV_EXPORT_OPTIONS = {
    showVerseNumber: true,
    showBismillah: false,
    showTranslation: false,
    showBranding: true,
    showWatermark: true,
    showBorder: true,
    showCorners: true,
    fontSize: 2.8,
    translationText: ''
};

const QV_FONT_FAMILY = "'Amiri', serif";
const QV_BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const QV_APP_NAME  = 'المصحف الشريف';

// ===========================
// Font Preloader
// ===========================

async function qvEnsureFonts() {
    if (document.fonts && document.fonts.check("16px 'Amiri'")) return;
    if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (_) { /* noop */ }
    }
    await new Promise(r => setTimeout(r, 150));
}

// ===========================
// Arabic Numeral Converter
// ===========================

function qvArabicNum(num) {
    const d = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    return num.toString().split('').map(c => /\d/.test(c) ? d[+c] : c).join('');
}

// ===========================
// Verse Data Extraction
// ===========================

function qvExtractVerseData(verseContainer) {
    if (!verseContainer) return null;
    const surahNum  = parseInt(verseContainer.getAttribute('data-surah')) || 1;
    const ayahNum   = parseInt(verseContainer.getAttribute('data-ayah')) || 1;
    const surahName = verseContainer.getAttribute('data-surah-name') || 'الفاتحة';
    const verseText = verseContainer.querySelector('.verse-text')?.textContent || '';

    let juz = '', page = '', englishName = '', revelationType = '';
    if (typeof pagesData !== 'undefined' && typeof currentPage !== 'undefined') {
        const pv = pagesData[currentPage];
        if (pv) {
            const v = pv.find(x => x.surahNumber === surahNum && x.numberInSurah === ayahNum);
            if (v) { juz = v.juz || ''; page = v.page || ''; }
        }
    }
    if (typeof surahData !== 'undefined') {
        const s = surahData.find(x => x.number === surahNum);
        if (s) { englishName = s.englishName || ''; revelationType = s.revelationType || ''; }
    }
    return { surahNum, ayahNum, surahName, englishName, verseText, juz, page, revelationType };
}

// ===========================
// SVG Decorations (loaded as images onto Canvas)
// ===========================

function qvCornerSVG(color) {
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M5,50 Q5,5 50,5" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.7"/>
        <path d="M15,50 Q15,15 50,15" fill="none" stroke="${color}" stroke-width="1" opacity="0.4"/>
        <circle cx="8" cy="8" r="2.5" fill="${color}" opacity="0.6"/>
        <path d="M5,35 Q10,25 20,20" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.35"/>
        <path d="M35,5 Q25,10 20,20" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.35"/>
    </svg>`;
}

function qvSVGToImage(svgStr, w, h) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
    });
}

// ===========================
// Text Shaping — Word Wrapping
// ===========================

/**
 * Wraps Arabic text into lines that fit within maxWidth.
 * Splits ONLY on whitespace — never breaks ligatures, combining marks, or words.
 * Each returned line is the EXACT original Unicode substring (zero mutation).
 */
function qvWrapText(ctx, text, maxWidth) {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    const lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
        const candidate = currentLine ? currentLine + ' ' + words[i] : words[i];
        const measured = ctx.measureText(candidate).width;
        if (measured > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine = candidate;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

/**
 * Wrap text that may contain explicit newline characters.
 * Each paragraph is word-wrapped independently.
 */
function qvWrapTextMulti(ctx, text, maxWidth) {
    const paragraphs = text.split('\n');
    const allLines = [];
    for (const para of paragraphs) {
        const trimmed = para.trim();
        if (trimmed) {
            allLines.push(...qvWrapText(ctx, trimmed, maxWidth));
        }
    }
    return allLines;
}

// ===========================
// Canvas Drawing — Backgrounds
// ===========================

function qvDrawGradient(ctx, w, h, stops) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    stops.forEach(([offset, color]) => g.addColorStop(offset, color));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
}

function qvDrawRadialGradient(ctx, cx, cy, r, stops) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    stops.forEach(([offset, color]) => g.addColorStop(offset, color));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function qvDrawDotPattern(ctx, w, h, spacing, color, radius) {
    ctx.fillStyle = color;
    for (let x = spacing / 2; x < w; x += spacing) {
        for (let y = spacing / 2; y < h; y += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function qvDrawDiamondPattern(ctx, w, h, size, color, lineWidth) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    for (let x = 0; x < w; x += size) {
        for (let y = 0; y < h; y += size) {
            ctx.beginPath();
            ctx.moveTo(x + size / 2, y);
            ctx.lineTo(x + size, y + size / 2);
            ctx.lineTo(x + size / 2, y + size);
            ctx.lineTo(x, y + size / 2);
            ctx.closePath();
            ctx.stroke();
        }
    }
}

// ===========================
// Canvas Drawing — Decorations
// ===========================

function qvDrawDoubleBorder(ctx, w, h, inset1, inset2, color1, color2, lw1, lw2) {
    ctx.strokeStyle = color2;
    ctx.lineWidth = lw2;
    ctx.strokeRect(inset2, inset2, w - inset2 * 2, h - inset2 * 2);
    ctx.strokeStyle = color1;
    ctx.lineWidth = lw1;
    ctx.strokeRect(inset1, inset1, w - inset1 * 2, h - inset1 * 2);
}

function qvDrawDivider(ctx, cx, y, halfWidth, color) {
    const g = ctx.createLinearGradient(cx - halfWidth, y, cx + halfWidth, y);
    g.addColorStop(0, 'transparent');
    g.addColorStop(0.5, color);
    g.addColorStop(1, 'transparent');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - halfWidth, y);
    ctx.lineTo(cx + halfWidth, y);
    ctx.stroke();
}

function qvDrawCornerOrnaments(ctx, w, h, color, cornerSize) {
    const imgPromises = [];
    for (let i = 0; i < 4; i++) {
        imgPromises.push(qvSVGToImage(qvCornerSVG(color), cornerSize, cornerSize));
    }
    return Promise.all(imgPromises).then(([tl, tr, bl, br]) => {
        const m = cornerSize * 0.3;
        ctx.drawImage(tl, m, m, cornerSize, cornerSize);
        ctx.save();
        ctx.translate(w - m, m);
        ctx.scale(-1, 1);
        ctx.drawImage(tr, 0, 0, cornerSize, cornerSize);
        ctx.restore();
        ctx.save();
        ctx.translate(m, h - m);
        ctx.scale(1, -1);
        ctx.drawImage(bl, 0, 0, cornerSize, cornerSize);
        ctx.restore();
        ctx.save();
        ctx.translate(w - m, h - m);
        ctx.scale(-1, -1);
        ctx.drawImage(br, 0, 0, cornerSize, cornerSize);
        ctx.restore();
    });
}

async function qvDrawNightSky(ctx, w, h) {
    const starCount = Math.floor((w * h) / 8000);
    for (let i = 0; i < starCount; i++) {
        const x = ((i * 7919 + 13) % w);
        const y = ((i * 6271 + 37) % h);
        const r = (i % 5 === 0) ? 1.5 : (i % 3 === 0) ? 1.0 : 0.6;
        const op = 0.2 + (i % 7) * 0.08;
        ctx.fillStyle = `rgba(255,255,255,${op})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    qvDrawRadialGradient(ctx, w * 0.82, h * 0.1, w * 0.2, [
        [0, 'rgba(255,213,79,0.25)'],
        [1, 'rgba(255,213,79,0)']
    ]);
    ctx.fillStyle = 'rgba(255,213,79,0.12)';
    ctx.beginPath();
    ctx.arc(w * 0.82, h * 0.1, w * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0c1445';
    ctx.beginPath();
    ctx.arc(w * 0.84, h * 0.09, w * 0.03, 0, Math.PI * 2);
    ctx.fill();
}

// ===========================
// Canvas Drawing — Text
// ===========================

/**
 * Draw centered text using the browser's native Canvas text shaping.
 * The original Unicode string is passed directly to fillText — zero mutation.
 */
function qvDrawText(ctx, text, cx, y, font, color, maxWidth) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, y, maxWidth);
}

/**
 * Draw wrapped verse text — the critical function.
 * Uses word-level wrapping to never break Arabic shaping.
 * The original Unicode is preserved exactly.
 */
function qvDrawWrappedVerse(ctx, text, cx, startY, font, color, maxWidth, lineHeight) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = qvWrapTextMulti(ctx, text, maxWidth);
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], cx, startY + i * lineHeight, maxWidth);
    }
    return lines.length;
}

/**
 * Draw the verse number inside an ornamental circle.
 */
function qvDrawVerseNumber(ctx, num, cx, cy, radius, template) {
    const arabic = qvArabicNum(num);
    const fontSize = radius * 0.72;

    let bgGrad;
    if (template === 'modern') {
        ctx.fillStyle = '#111827';
    } else if (template === 'emerald') {
        bgGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
        bgGrad.addColorStop(0, '#d4af37');
        bgGrad.addColorStop(0.4, '#b8960e');
        bgGrad.addColorStop(0.6, '#d4af37');
        bgGrad.addColorStop(1, '#e8c84a');
        ctx.fillStyle = bgGrad;
    } else if (template === 'dark') {
        bgGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
        bgGrad.addColorStop(0, '#d4af37');
        bgGrad.addColorStop(0.4, '#b8960e');
        bgGrad.addColorStop(0.6, '#d4af37');
        bgGrad.addColorStop(1, '#e8c84a');
        ctx.fillStyle = bgGrad;
    } else if (template === 'night') {
        bgGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
        bgGrad.addColorStop(0, '#ffd54f');
        bgGrad.addColorStop(0.4, '#ffb300');
        bgGrad.addColorStop(0.6, '#ffd54f');
        bgGrad.addColorStop(1, '#ffe082');
        ctx.fillStyle = bgGrad;
    } else if (template === 'glass') {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
    } else {
        bgGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
        bgGrad.addColorStop(0, '#D4AF37');
        bgGrad.addColorStop(0.4, '#B8960E');
        bgGrad.addColorStop(0.6, '#D4AF37');
        bgGrad.addColorStop(1, '#E8C84A');
        ctx.fillStyle = bgGrad;
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    if (template === 'emerald' || template === 'dark' || template === 'classic') {
        ctx.strokeStyle = (template === 'emerald' || template === 'dark') ? '#b8960e' : '#B8860B';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
    if (template === 'glass') {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
    if (template === 'night') {
        ctx.strokeStyle = '#ffb300';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    let textColor;
    switch (template) {
        case 'modern':   textColor = '#ffffff'; break;
        case 'emerald':  textColor = '#065f46'; break;
        case 'dark':     textColor = '#1a1a1a'; break;
        case 'night':    textColor = '#1a237e'; break;
        case 'glass':    textColor = '#ffffff'; break;
        default:         textColor = '#ffffff'; break;
    }
    ctx.font = `bold ${fontSize}px ${QV_FONT_FAMILY}`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(arabic, cx, cy);
}

// ===========================
// Template Color Palettes
// ===========================

const QV_PALETTES = {
    classic: {
        bg: (ctx, w, h) => qvDrawGradient(ctx, w, h, [[0,'#f9f5e9'],[1,'#f2ecdb']]),
        surahColor: '#2a6e4f',
        metaColor: '#8b7355',
        verseColor: '#3a3a3a',
        dividerColor: '#c9a84c',
        cornerColor: '#c9a84c',
        brandColor: '#8b7355',
        watermarkColor: '#b5a88a',
        borderInner: 'rgba(201,168,76,0.35)',
        borderOuter: 'rgba(201,168,76,0.18)',
        transColor: '#6b5b45'
    },
    modern: {
        bg: (ctx, w, h) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); },
        surahColor: '#111827',
        metaColor: '#6b7280',
        verseColor: '#1f2937',
        dividerColor: '#d1d5db',
        brandColor: '#9ca3af',
        watermarkColor: '#d1d5db',
        transColor: '#6b7280'
    },
    emerald: {
        bg: (ctx, w, h) => qvDrawGradient(ctx, w, h, [[0,'#047857'],[0.5,'#065f46'],[1,'#047857']]),
        surahColor: '#d4af37',
        metaColor: '#a7f3d0',
        verseColor: '#ffffff',
        dividerColor: '#d4af37',
        cornerColor: '#d4af37',
        brandColor: '#d4af37',
        watermarkColor: 'rgba(167,243,208,0.5)',
        borderInner: 'rgba(212,175,55,0.4)',
        borderOuter: 'rgba(212,175,55,0.2)',
        transColor: '#bbf7d0',
        pattern: (ctx, w, h) => {
            ctx.globalAlpha = 0.07;
            qvDrawDiamondPattern(ctx, w, h, 24, '#d4af37', 0.5);
            ctx.globalAlpha = 1;
        }
    },
    dark: {
        bg: (ctx, w, h) => qvDrawGradient(ctx, w, h, [[0,'#1a1a1a'],[0.5,'#111111'],[1,'#1a1a1a']]),
        surahColor: '#d4af37',
        metaColor: '#a0936e',
        verseColor: '#f0f0f0',
        dividerColor: '#d4af37',
        cornerColor: '#d4af37',
        brandColor: '#d4af37',
        watermarkColor: '#6b7280',
        borderInner: 'rgba(212,175,55,0.25)',
        borderOuter: 'rgba(212,175,55,0.12)',
        transColor: '#9ca3af',
        pattern: (ctx, w, h) => {
            ctx.globalAlpha = 0.025;
            qvDrawDotPattern(ctx, w, h, 30, '#d4af37', 0.8);
            ctx.globalAlpha = 1;
        }
    },
    glass: {
        bg: (ctx, w, h) => {
            qvDrawGradient(ctx, w, h, [[0,'#1a3a2a'],[0.5,'#1e4d3a'],[1,'#1a3a2a']]);
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(0, 0, w, h);
        },
        surahColor: '#ffffff',
        metaColor: 'rgba(255,255,255,0.7)',
        verseColor: '#ffffff',
        dividerColor: 'rgba(255,255,255,0.4)',
        cornerColor: 'rgba(255,255,255,0.4)',
        brandColor: 'rgba(255,255,255,0.6)',
        watermarkColor: 'rgba(255,255,255,0.35)',
        borderInner: 'rgba(255,255,255,0.2)',
        borderOuter: 'rgba(255,255,255,0.08)',
        transColor: 'rgba(255,255,255,0.65)'
    },
    night: {
        bg: async (ctx, w, h) => {
            qvDrawGradient(ctx, w, h, [[0,'#0c1445'],[0.35,'#1a237e'],[0.6,'#283593'],[0.85,'#1a237e'],[1,'#0d1b3e']]);
            await qvDrawNightSky(ctx, w, h);
        },
        surahColor: '#ffd54f',
        metaColor: '#90caf9',
        verseColor: '#ffffff',
        dividerColor: '#ffd54f',
        cornerColor: '#ffd54f',
        brandColor: '#ffd54f',
        watermarkColor: 'rgba(144,202,249,0.4)',
        borderInner: 'rgba(255,213,79,0.2)',
        borderOuter: 'rgba(255,213,79,0.1)',
        transColor: '#90caf9'
    }
};

// ===========================
// Main Canvas Composition
// ===========================

/**
 * Render the complete verse card onto a canvas at full export resolution.
 * Arabic text is drawn character-for-character from the original Unicode
 * using the browser's Canvas 2D fillText — the same text shaping pipeline
 * that renders text on screen, guaranteeing identical output.
 */
async function qvRenderCanvas(w, h, data, opts) {
    await qvEnsureFonts();

    const palette = QV_PALETTES[opts.template];
    const t = opts.template;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.direction = 'rtl';

    const padX = w * 0.09;
    const padY = h * 0.08;
    const textMaxW = w - padX * 2;
    const cx = w / 2;

    // --- 1. Background ---
    const bgResult = palette.bg(ctx, w, h);
    if (bgResult && typeof bgResult.then === 'function') await bgResult;

    if (palette.pattern) palette.pattern(ctx, w, h);

    // --- 2. Decorative Border ---
    if (opts.showBorder && t !== 'modern') {
        qvDrawDoubleBorder(ctx, w, h, h * 0.04, h * 0.022,
            palette.borderInner || 'rgba(200,180,140,0.3)',
            palette.borderOuter || 'rgba(200,180,140,0.15)',
            1.5, 1);
    }

    // --- 3. Corner Ornaments ---
    if (opts.showCorners && t !== 'modern') {
        const cornerSize = Math.max(w, h) * 0.07;
        await qvDrawCornerOrnaments(ctx, w, h, palette.cornerColor || '#c9a84c', cornerSize);
    }

    // --- 4. Layout Calculations ---
    const surahFontSize = Math.round(w * 0.036);
    const metaFontSize  = Math.round(w * 0.022);
    const verseFontSize = Math.round(w * opts.fontSize * 0.039);
    const bismFontSize  = Math.round(w * 0.024);
    const brandFontSize = Math.round(w * 0.020);
    const transFontSize = Math.round(verseFontSize * 0.38);

    const verseLineHeight = verseFontSize * 2.1;
    const verseFont = `${verseFontSize}px ${QV_FONT_FAMILY}`;
    const verseLines = qvWrapText(ctx, data.verseText, textMaxW * 0.92);
    const verseBlockH = verseLines.length * verseLineHeight;

    const numRadius = Math.round(verseFontSize * 0.55);

    const bismillahH = opts.showBismillah && data.surahNum !== 1 && data.surahNum !== 9
        ? bismFontSize * 2.2 : 0;

    const verseNumH = opts.showVerseNumber ? numRadius * 2.8 : 0;

    let transLines = [];
    let transBlockH = 0;
    if (opts.showTranslation && opts.translationText) {
        ctx.font = `italic ${transFontSize}px Georgia, 'Times New Roman', serif`;
        transLines = qvWrapText(ctx, opts.translationText, textMaxW * 0.85);
        transBlockH = transLines.length * transFontSize * 2.0 + transFontSize;
    }

    const contentBlockH = surahFontSize * 1.5 + metaFontSize * 1.8 + surahFontSize * 0.6
        + bismillahH + verseBlockH + verseNumH + transBlockH;
    const brandBottom = h - padY;
    const contentStartMin = padY;
    const contentStartMax = brandBottom - contentBlockH;
    const availTop = contentStartMin + (contentStartMax - contentStartMin) * 0.5;

    // --- 5. Surah Header ---
    let cursorY = availTop;
    qvDrawText(ctx, data.surahName, cx, cursorY,
        `bold ${surahFontSize}px ${QV_FONT_FAMILY}`, palette.surahColor, textMaxW);
    cursorY += surahFontSize * 1.5;

    qvDrawDivider(ctx, cx, cursorY, textMaxW * 0.22, palette.dividerColor);
    cursorY += surahFontSize * 0.6;

    const metaText = data.englishName + '  \u00B7  ' + 'الآية ' + qvArabicNum(data.ayahNum);
    qvDrawText(ctx, metaText, cx, cursorY,
        `${metaFontSize}px ${QV_FONT_FAMILY}`, palette.metaColor, textMaxW);
    cursorY += metaFontSize * 1.8;

    // --- 6. Bismillah ---
    if (bismillahH > 0) {
        qvDrawText(ctx, QV_BISMILLAH, cx, cursorY,
            `${bismFontSize}px ${QV_FONT_FAMILY}`, palette.metaColor, textMaxW);
        cursorY += bismillahH;
    }

    // --- 7. Verse Text (the critical rendering step) ---
    const verseStartY = cursorY + verseLineHeight * 0.5;
    qvDrawWrappedVerse(ctx, data.verseText, cx, verseStartY,
        verseFont, palette.verseColor, textMaxW * 0.92, verseLineHeight);
    cursorY = verseStartY + verseBlockH;

    // --- 8. Verse Number ---
    if (opts.showVerseNumber) {
        cursorY += numRadius * 1.2;
        qvDrawVerseNumber(ctx, data.ayahNum, cx, cursorY, numRadius, t);
        cursorY += numRadius * 1.6;
    }

    // --- 9. Translation ---
    if (transLines.length > 0) {
        cursorY += transFontSize * 0.5;
        ctx.font = `italic ${transFontSize}px Georgia, 'Times New Roman', serif`;
        ctx.fillStyle = palette.transColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const line of transLines) {
            ctx.fillText(line, cx, cursorY, textMaxW * 0.85);
            cursorY += transFontSize * 2.0;
        }
    }

    // Safety: push content up if it would overlap branding
    if (opts.showBranding && cursorY + brandFontSize * 5 > h - padY) {
        const overflow = cursorY + brandFontSize * 5 - (h - padY);
        cursorY -= overflow;
    }

    // --- 10. Branding ---
    if (opts.showBranding) {
        const brandY = h - padY - brandFontSize * 2;
        ctx.font = `${brandFontSize * 1.6}px sans-serif`;
        ctx.fillStyle = palette.brandColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☪', cx, brandY);

        ctx.font = `${brandFontSize}px ${QV_FONT_FAMILY}`;
        ctx.fillText(QV_APP_NAME, cx, brandY + brandFontSize * 1.4);

        if (opts.showWatermark) {
            const metaBits = [];
            if (data.juz) metaBits.push('الجزء ' + qvArabicNum(data.juz));
            if (data.page) metaBits.push('صفحة ' + qvArabicNum(data.page));
            if (metaBits.length) {
                ctx.globalAlpha = 0.5;
                ctx.font = `${brandFontSize * 0.85}px ${QV_FONT_FAMILY}`;
                ctx.fillStyle = palette.watermarkColor;
                ctx.fillText(metaBits.join('  \u00B7  '), cx, brandY + brandFontSize * 2.6);
                ctx.globalAlpha = 1;
            }
        }
    }

    return canvas;
}

// ===========================
// Preview
// ===========================

async function qvUpdatePreview() {
    const frame = document.querySelector('.qv-export-preview-inner');
    if (!frame || !window._qvCurrentData) return;

    const opts = window._qvExportOpts;
    const previewW = 580;
    const previewH = Math.round(previewW * (opts.aspectH / opts.aspectW));

    try {
        const canvas = await qvRenderCanvas(previewW, previewH, window._qvCurrentData, opts);
        canvas.style.borderRadius = '4px';
        canvas.style.maxWidth = '100%';
        canvas.style.maxHeight = '100%';
        canvas.style.height = 'auto';
        frame.innerHTML = '';
        frame.appendChild(canvas);
    } catch (e) {
        console.error('Preview render error:', e);
    }
}

// ===========================
// Export / Download
// ===========================

async function qvExportImage() {
    const loadingEl = document.querySelector('.qv-export-loading');
    if (loadingEl) loadingEl.classList.add('active');

    try {
        const opts = window._qvExportOpts;
        const data = window._qvCurrentData;
        if (!data) throw new Error('No verse data');

        const exportW = opts.aspectW;
        const exportH = opts.aspectH;
        const canvas = await qvRenderCanvas(exportW, exportH, data, opts);

        const format = opts.exportFormat || 'png';
        const mime = format === 'jpeg' ? 'image/jpeg'
                   : format === 'webp' ? 'image/webp'
                   : 'image/png';
        const quality = format === 'png' ? undefined : 0.95;

        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `quran-verse-${data.surahNum}-${data.ayahNum}-${Date.now()}.${format}`;
            link.href = url;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            if (loadingEl) loadingEl.classList.remove('active');
            if (typeof showToast === 'function') showToast('تم تصدير الصورة بنجاح');
        }, mime, quality);

    } catch (err) {
        console.error('Export error:', err);
        if (loadingEl) loadingEl.classList.remove('active');
        if (typeof showToast === 'function') showToast('فشل تصدير الصورة');
    }
}

// ===========================
// Modal Builder
// ===========================

function qvBuildModal() {
    if (document.querySelector('.qv-export-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'qv-export-overlay';
    overlay.innerHTML = `
    <div class="qv-export-sidebar">
        <div class="qv-export-sidebar-header">
            <div class="qv-export-sidebar-title">تصدير الآية</div>
            <button class="qv-export-close" aria-label="إغلاق">&times;</button>
        </div>
        <div class="qv-export-sidebar-body">
            <div class="qv-export-section">
                <div class="qv-export-section-title">القالب</div>
                <div class="qv-template-grid">
                    ${Object.values(QV_TEMPLATES).map(t =>
                        `<button class="qv-template-thumb t-${t.id}" data-template="${t.id}" title="${t.nameEn}">
                            <span class="qv-template-thumb-icon">${t.icon}</span>
                            <span class="qv-template-thumb-label">${t.name}</span>
                        </button>`
                    ).join('')}
                </div>
            </div>
            <div class="qv-export-section">
                <div class="qv-export-section-title">المقاس</div>
                <div class="qv-aspect-grid">
                    ${Object.entries(QV_FORMATS).map(([k, f]) =>
                        `<button class="qv-aspect-btn" data-format="${k}" title="${f.label}">
                            <div class="qv-aspect-btn-preview ${f.icon}"></div>
                            <span class="qv-aspect-btn-label">${f.label}</span>
                            <span class="qv-aspect-btn-size">${f.sublabel}</span>
                        </button>`
                    ).join('')}
                </div>
            </div>
            <div class="qv-export-section">
                <div class="qv-export-section-title">الإعدادات</div>
                <div class="qv-range-row">
                    <div class="qv-range-header">
                        <span class="qv-range-label">حجم الخط</span>
                        <span class="qv-range-value" id="qvFontSizeVal">2.8</span>
                    </div>
                    <input type="range" class="qv-range-slider" id="qvFontSize" min="0.1" max="5" step="0.1" value="2.8">
                </div>
                <div class="qv-toggle-row">
                    <span class="qv-toggle-label">رقم الآية</span>
                    <label class="qv-toggle-switch"><input type="checkbox" id="qvShowVerseNum" checked><span class="qv-toggle-slider"></span></label>
                </div>
                <div class="qv-toggle-row">
                    <span class="qv-toggle-label">بسم الله</span>
                    <label class="qv-toggle-switch"><input type="checkbox" id="qvShowBismillah"><span class="qv-toggle-slider"></span></label>
                </div>
                <div class="qv-toggle-row">
                    <span class="qv-toggle-label">الترجمة</span>
                    <label class="qv-toggle-switch"><input type="checkbox" id="qvShowTranslation"><span class="qv-toggle-slider"></span></label>
                </div>
                <div class="qv-toggle-row">
                    <span class="qv-toggle-label">الحدود والزخارف</span>
                    <label class="qv-toggle-switch"><input type="checkbox" id="qvShowBorder" checked><span class="qv-toggle-slider"></span></label>
                </div>
                <div class="qv-toggle-row">
                    <span class="qv-toggle-label">العلامة المائية</span>
                    <label class="qv-toggle-switch"><input type="checkbox" id="qvShowWatermark" checked><span class="qv-toggle-slider"></span></label>
                </div>
                <div class="qv-select-row" id="qvTranslationRow" style="display:none;">
                    <label class="qv-select-label">الترجمة</label>
                    <input type="text" class="qv-select" id="qvTranslationInput" placeholder="أدخل الترجمة (اختياري)" dir="ltr" style="text-align:left;">
                </div>
                <div class="qv-select-row">
                    <label class="qv-select-label">صيغة الملف</label>
                    <select class="qv-select" id="qvExportFormat">
                        <option value="png">PNG (بدون فقدان)</option>
                        <option value="jpeg">JPEG (حجم أصغر)</option>
                        <option value="webp">WebP (حديث)</option>
                    </select>
                </div>
            </div>
        </div>
        <div class="qv-export-sidebar-footer">
            <button class="qv-download-btn" id="qvDownloadBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                تحميل الصورة
            </button>
        </div>
    </div>
    <div class="qv-export-preview-area">
        <div class="qv-export-preview-wrapper">
            <div class="qv-export-preview-frame">
                <div class="qv-export-preview-inner"></div>
            </div>
        </div>
    </div>
    <div class="qv-export-loading">
        <div class="qv-export-spinner"></div>
        <div class="qv-export-loading-text">جاري التصدير...</div>
    </div>`;

    document.body.appendChild(overlay);
    qvBindModalEvents(overlay);
}

// ===========================
// Modal Events
// ===========================

function qvBindModalEvents(overlay) {
    overlay.querySelector('.qv-export-close').addEventListener('click', qvCloseModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) qvCloseModal(); });

    overlay.querySelectorAll('.qv-template-thumb').forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.querySelectorAll('.qv-template-thumb').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            window._qvExportOpts.template = btn.dataset.template;
            qvUpdatePreview();
        });
    });

    overlay.querySelectorAll('.qv-aspect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.querySelectorAll('.qv-aspect-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const fmt = QV_FORMATS[btn.dataset.format];
            window._qvExportOpts.aspectW = fmt.w;
            window._qvExportOpts.aspectH = fmt.h;
            window._qvExportOpts.formatKey = btn.dataset.format;
            qvUpdatePreview();
        });
    });

    const fontSlider = overlay.querySelector('#qvFontSize');
    const fontVal = overlay.querySelector('#qvFontSizeVal');
    fontSlider.addEventListener('input', () => {
        window._qvExportOpts.fontSize = parseFloat(fontSlider.value);
        fontVal.textContent = fontSlider.value;
        qvUpdatePreview();
    });

    const toggles = {
        qvShowVerseNum: 'showVerseNumber',
        qvShowBismillah: 'showBismillah',
        qvShowTranslation: 'showTranslation',
        qvShowBorder: 'showBorder',
        qvShowWatermark: 'showWatermark'
    };
    Object.entries(toggles).forEach(([elId, optKey]) => {
        const el = overlay.querySelector('#' + elId);
        el.addEventListener('change', () => {
            window._qvExportOpts[optKey] = el.checked;
            if (elId === 'qvShowBorder') window._qvExportOpts.showCorners = el.checked;
            qvUpdatePreview();
        });
    });

    const transRow = overlay.querySelector('#qvTranslationRow');
    const transInput = overlay.querySelector('#qvTranslationInput');
    const transToggle = overlay.querySelector('#qvShowTranslation');
    transToggle.addEventListener('change', () => {
        transRow.style.display = transToggle.checked ? 'block' : 'none';
    });
    transInput.addEventListener('input', () => {
        window._qvExportOpts.translationText = transInput.value;
        qvUpdatePreview();
    });

    overlay.querySelector('#qvExportFormat').addEventListener('change', e => {
        window._qvExportOpts.exportFormat = e.target.value;
    });

    overlay.querySelector('#qvDownloadBtn').addEventListener('click', qvExportImage);

    document.addEventListener('keydown', qvEscHandler);
}

function qvEscHandler(e) {
    if (e.key === 'Escape') qvCloseModal();
}

function qvCloseModal() {
    const overlay = document.querySelector('.qv-export-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    }
    document.removeEventListener('keydown', qvEscHandler);
}

// ===========================
// Public API
// ===========================

function exportVerseFromButton(verseContainer) {
    if (!verseContainer) return;

    const data = qvExtractVerseData(verseContainer);
    if (!data || !data.verseText) return;

    const isNight = document.body.classList.contains('night-mode');

    window._qvCurrentData = data;
    window._qvExportOpts = {
        ...QV_EXPORT_OPTIONS,
        template: isNight ? 'dark' : 'classic',
        aspectW: 1080,
        aspectH: 1080,
        formatKey: 'ig-post',
        exportFormat: 'png'
    };

    qvBuildModal();

    const overlay = document.querySelector('.qv-export-overlay');
    requestAnimationFrame(() => {
        overlay.classList.add('active');
        const initTemplate = window._qvExportOpts.template;
        const initThumb = overlay.querySelector(`.qv-template-thumb[data-template="${initTemplate}"]`);
        if (initThumb) initThumb.classList.add('active');
        const initFormat = overlay.querySelector('.qv-aspect-btn[data-format="ig-post"]');
        if (initFormat) initFormat.classList.add('active');
        qvUpdatePreview();
    });
}

function saveVerseAsImage(selection) {
    try {
        const range = selection.getRangeAt(0);
        let container = range.startContainer;
        if (container.nodeType === Node.TEXT_NODE) container = container.parentNode;
        const verseContainer = findParentWithClass(container, 'verse-container');
        if (!verseContainer) return;
        exportVerseFromButton(verseContainer);
    } catch (e) {
        console.error('Export error:', e);
    }
}
