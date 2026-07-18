# المصحف الشريف - Digital Quran Application

A modern, feature-rich web application for reading and listening to the Holy Quran. Built with vanilla JavaScript and no build system, focusing on performance, accessibility, and a premium Mushaf-style reading experience.

## Features

### Reading Experience
- **Premium Mushaf Layout**: Parchment-toned page with decorative border, centered RTL text, and ornamental gold verse markers
- **Page-based Navigation**: 604 pages matching the printed Uthmani Mushaf
- **Amiri Font**: Full GPOS mark-to-base coverage for all 24 Quranic diacritics (tashkeel)
- **Dual-language Surah Headers**: Arabic name, English name, and Meccan/Medinan classification
- **Bismillah Display**: Decorative divider with gold accents on every Surah except At-Tawbah
- **Juz Display**: Shows current Juz (Arabic numerals) in the page indicator
- **Customizable Font Size**: Increase/decrease Quran text size with header controls
- **Night Mode**: Dark theme with blue-toned verse markers and glow effects
- **Fullscreen Mode**: Distraction-free reading with ESC to exit

### Audio Playback
- **5 Reciters**: Mishary Rashid Alafasy, Abu Bakr Shatri, Nasser Al-Qatami, Yasser Al-Dosari, Hani Al-Rifai
- **Verse-by-Verse Sync**: Audio highlights the currently playing verse with green marker
- **Continuous Surah Mode**: Click any Surah header to play the entire Surah
- **Playback Speed**: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
- **Verse Repeat**: Repeat individual verses 1x, 3x, 5x, 10x, or infinite
- **Stop Audio**: Floating stop button for quick audio termination
- **Smart Pre-fetch**: Pre-loads upcoming verses for gapless playback

### Search
- **Full-text Search**: Search across all Quran verses with real-time results
- **Keyboard Shortcut**: Ctrl+F to open search
- **Recent Searches**: Saves last 5 searches for quick re-access
- **Search Highlighting**: Animated pulse on matched verses
- **Direct Navigation**: Click any result to jump to that page

### Bookmarks
- **Verse Bookmarking**: Bookmark any verse from the hover/tap action toolbar
- **Persistent Storage**: Bookmarks saved in localStorage, survive page reloads
- **Bookmarks Panel**: Slide-out panel with bookmark list, stats, and clear-all
- **Visual Indicators**: Gold bookmark icon on bookmarked verses
- **Jump to Verse**: Click any bookmark to navigate directly to it (MutationObserver-based, no fixed timeout)
- **Sort Controls**: Sort bookmarks by Newest, Oldest, or Surah order
- **Per-bookmark Actions**: Open, Share (Web Share API), Copy (clipboard), Note (prompt), Delete
- **Verse Key**: Each bookmark stores `surah:ayah` key for direct verse identification
- **Overlay Background**: Dimmed backdrop when panel is open, click to dismiss

### Verse Interactions
- **Action Toolbar**: Hover (desktop) or tap (mobile) any verse to reveal copy, share, tafsir, and bookmark buttons
- **Copy Verse**: Copy clean Arabic text to clipboard
- **Share Verse**: Native Web Share API with Surah name and verse number
- **Tafsir**: Tafsir Al-Muyassar tooltip with verse explanation
- **Image Export**: Save any verse as a premium-formatted image with ornamental borders, gold accents, and corner decorations

### Reading Progress
- **Progress Bar**: Tracks pages read out of 604 total
- **Reading Statistics**: Pages read, verses listened, streak days, Juz completed
- **Stats Modal**: Detailed progress overview with visual progress bar
- **State Persistence**: Remembers last read page across sessions

### Last Read (Continue Reading)
- **Smart Detection**: IntersectionObserver tracks which verse you're reading (40% center band, 0.5 threshold, 1s dwell time)
- **CSS-only Marker**: Green left-border indicator on the last-read verse via `.last-read-verse::before` pseudo-element (no DOM injection)
- **Card Banner**: Top card showing last-read position with Surah name, verse number, Arabic/English relative timestamps, and Continue/Dismiss buttons
- **Dual Storage**: IndexedDB primary (`QuranLastReadDB`) with localStorage fallback
- **Data Validation**: Validates surah (1–114) and verse (1–286) ranges before saving
- **Audio Integration**: Tracks position during audio playback via `onAudioVerseChange()` callback, suppresses observer during audio navigation
- **MutationObserver Navigation**: Waits for DOM render to complete before scrolling (no fixed setTimeout)
- **Dismiss Logic**: Per-verse-key dismissal — dismissing re-shows only when you reach a new verse position
- **Reduced Motion**: Respects `prefers-reduced-motion` (no animations)
- **High Contrast**: Supports `forced-colors` (Windows High Contrast Mode)

### Responsive Design
- **Mobile-first**: Optimized for phones (≤640px), small tablets (641–768px), large tablets (769–1024px), and desktops (≥1025px)
- **Overlay Sidebar**: Slide-out drawer on mobile with backdrop, ESC key, and outside-click close
- **Touch-friendly**: 40px minimum touch targets, tap-to-toggle verse actions
- **Compact Header**: Scrollable header controls on small screens
- **Body Scroll Lock**: Prevents background scrolling when sidebar is open on mobile

### Progressive Web App (PWA)
- **Installable**: Install on Android, iOS, Windows, macOS, and Linux
- **Offline Support**: Quran text, bookmarks, settings, and reading progress available offline
- **Service Worker**: Cache-first for static assets, network-first for API, cache-on-demand for audio
- **App Shortcuts**: Quick access to "Continue Reading" and "Search Quran"
- **Update Detection**: Automatic notification when a new version is available
- **Offline Indicator**: Banner when device loses connectivity
- **Splash Screen**: Standalone mode with themed background
- **iOS Support**: Apple Touch Icons, standalone mode, status bar styling
- **Safe Area Insets**: Respects notch and rounded corners via `viewport-fit=cover`

### Accessibility
- **Skip to Content**: Keyboard navigation skip link
- **ARIA Labels**: All interactive elements have proper labels
- **Keyboard Navigation**: Full keyboard support for all features
- **Reduced Motion**: Respects `prefers-reduced-motion` system setting
- **High Contrast**: Supports `forced-colors` (Windows High Contrast Mode)
- **Focus Visible**: Clear focus indicators for keyboard users
- **Screen Reader**: Semantic HTML with proper roles and landmarks

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for initial load, Quran data, audio streaming, and fonts

### Installation
```powershell
git clone https://github.com/eng-yossef/Quran.git
cd Quran
```

Serve using any local server:
```powershell
# Python
python -m http.server 8080

# Node.js
npx serve

# PHP
php -S localhost:8080
```

Open `http://localhost:8080` in your browser.

## Project Structure

```
Quran/
├── index.html              # Main HTML entry point
├── manifest.json           # PWA manifest with icons, shortcuts, display mode
├── sw.js                   # Service worker with caching strategies
├── generate-icons.html     # Tool to generate PNG icons from SVG
├── README.md               # This file
├── favicon-16x16.png       # Tab favicon (16px)
├── favicon-32x32.png       # Bookmark bar favicon (32px)
├── favicon-48x48.png       # Windows tile (48px)
├── tests.html              # Test page
│
├── icons/                  # PWA icons
│   ├── icon.svg            # Master SVG icon (source for all sizes)
│   ├── apple-touch-icon.png # Apple Touch Icon (180px)
│   └── icon-*.png          # Generated PNG icons (72–512px)
│
├── css/                    # 20 CSS modules (load order matters)
│   ├── variables.css       # CSS custom properties: colors, fonts, layout, verse markers, last-read
│   ├── base.css            # Reset, body, app-container, touch scrolling
│   ├── sidebar.css         # Sidebar drawer, overlay, surah list
│   ├── header.css          # Header bar, controls, progress display
│   ├── main-content.css    # Quran page, verse containers, verse markers, surah headers, bismillah
│   ├── navigation.css      # Bottom nav bar, page indicator, juz label
│   ├── components.css      # Stop button, PWA banners, skip-link, accessibility, reduced motion
│   ├── tafsir.css          # Tafsir tooltip positioning and styling
│   ├── animations.css      # Verse pulse, current-playing glow, fade-in, night-mode effects
│   ├── image-export.css    # Premium image export container with ornamental borders
│   ├── night-mode.css      # Dark theme overrides for all components
│   ├── responsive.css      # Mobile-first breakpoints: ≤640px, 641–768px, 769–1024px, ≥1025px, ≥1280px
│   ├── search.css          # Search modal, results, highlight animations
│   ├── bookmarks.css       # Bookmarks panel, sort controls, action buttons, overlay
│   ├── controls.css        # Font size controls, audio speed, reciter select
│   ├── share.css           # Verse action toolbar (copy, share, tafsir, bookmark)
│   ├── reading-progress.css # Reading progress bar
│   ├── fullscreen.css      # Fullscreen mode, centering, mobile exit button
│   ├── last-read.css       # Continue Reading card, CSS-only verse marker, pulse animation
│   └── font-uthmanic.css   # Base64 Uthmanic font (unused, superseded by Amiri)
│
├── js/                     # 20 JS modules (loaded in dependency order)
│   ├── config.js           # API URLs, reciter configurations, default settings
│   ├── state.js            # Global state: currentPage, audioQueue, activeSurah
│   ├── utils.js            # cleanVerseText(), normalizeArabic(), toArabicNumber(), findPageForVerse()
│   ├── storage.js          # IndexedDB (QuranCacheDB), localStorage helpers, organizeVersesByPage()
│   ├── share.js            # copyVerseText(), shareVerse(), fallbackCopy(), showToast()
│   ├── audio.js            # Audio playback engine, pre-fetch queue, verse sync, audio navigation flag
│   ├── audio-controls.js   # Play/pause, stop, speed control, repeat/loop logic
│   ├── render.js           # renderPage() — verse HTML generation, surah headers, bismillah, last-read marker
│   ├── tafsir.js           # Tafsir Al-Muyassar fetch and tooltip display
│   ├── verse-interactions.js # Verse hover/tap, action toolbar, copy/share/bookmark/tafsir
│   ├── navigation.js       # Page navigation, keyboard shortcuts, page input
│   ├── sidebar.js          # Sidebar toggle, surah list, overlay, ESC/outside-click close
│   ├── night-mode.js       # Theme toggle, localStorage persistence
│   ├── image-export.js     # html2canvas verse image generation
│   ├── search.js           # Full-text search engine, recent searches, result highlighting
│   ├── bookmarks.js        # Bookmark CRUD, sort, share/copy/note, MutationObserver navigation, overlay
│   ├── font-controls.js    # Font size increase/decrease, localStorage persistence
│   ├── reading-progress.js # Progress tracking, stats modal, streak calculation
│   ├── last-read.js        # IntersectionObserver tracking, IndexedDB+localStorage, CSS marker, card UI
│   ├── fullscreen.js       # Fullscreen API toggle, exit hint, mobile exit button
│   ├── pwa.js              # PWA: SW registration, install prompt, update detection, offline indicator
│   └── app.js              # DOMContentLoaded init, event binding, click-outside handler, flag init
│
└── fonts/                  # Local font files
    ├── UthmanicHafs_V22.ttf       # Original Uthmanic font (unused, GDEF bug)
    └── UthmanicHafs_V22_FIXED.ttf # Attempted fix (unused)
```

## Architecture

### Modular Design
- **20 JS modules** split from a single monolithic `script.js`
- **20 CSS partials** split from a single `style.css`
- **No build system** — all files loaded via `<script>` and `<link>` tags
- **Dependency order** — JS modules loaded config → state → utils → storage → ... → app

### Data Flow
1. `config.js` defines API URLs and reciter base URLs
2. `storage.js` fetches Quran text from API, organizes into `pagesData` (keyed by page number)
3. `render.js` reads `pagesData[currentPage]` and generates verse HTML, marks `.last-read-verse` if applicable
4. `verse-interactions.js` attaches hover/tap handlers to rendered verses
5. `audio.js` fetches and plays audio, syncs with DOM via `current-playing-verse` class
6. `last-read.js` observes visible verses via IntersectionObserver, saves position to IndexedDB/localStorage, shows card banner on page load

### Font Choice
- **Amiri** (Google Fonts) — selected over KFGQPC Uthmanic V22 due to a GDEF class bug in the WOFF2/TTF files that broke combining marks
- Amiri has complete GPOS mark-to-base coverage for all 24 Quranic annotation signs
- Font stack: `'Amiri', serif`

### CSS Load Order
```
variables → base → sidebar → header → main-content → navigation →
components → tafsir → animations → image-export → night-mode →
responsive → search → bookmarks → controls → share →
reading-progress → last-read → fullscreen
```

### JS Load Order
```
config → state → utils → storage → share → audio → audio-controls →
render → tafsir → verse-interactions → navigation → sidebar →
night-mode → image-export → search → bookmarks → font-controls →
reading-progress → last-read → fullscreen → pwa → app
```

### PWA Architecture
- **Service Worker** (`sw.js` v1.1.0): Pre-caches all static assets on install using individual `cache.add()` per asset (one failure doesn't kill the entire install). Routes requests to cache-first (CSS/JS/fonts), network-first (API), or cache-on-demand (audio) strategies.
- **PWA Manager** (`js/pwa.js`): Registers service worker, handles `beforeinstallprompt` event, detects updates via `updatefound`, syncs theme color, shows offline/install/update banners.
- **Offline Support**: Layered approach — service worker caches network responses, IndexedDB caches Quran data, localStorage caches user preferences. Quran text, bookmarks, settings, and reading progress all survive offline.
- **Icons**: Custom `quran.png` source icon. All required PNG sizes (72–512px) generated from it.

## Responsive Breakpoints

| Breakpoint | Target | Quran Font Size | Line Height |
|---|---|---|---|
| ≤360px | Very small phones | 1.1rem | 1.8 |
| ≤640px | Phones | 1.2rem | 1.9 |
| 641–768px | Small tablets | 1.35rem | 2.0 |
| 769–1024px | Large tablets | 1.5rem | 2.15 |
| ≥1025px | Desktops | 1.65rem | 2.2 |
| ≥1280px | Large desktops | 1.65rem (wider page) | 2.2 |

## Key Design Decisions

- **Vanilla JS** — no frameworks, no bundlers, zero dependencies
- **localStorage** for persistence (bookmarks, font size, night mode, reading progress, last page)
- **IndexedDB** for large data (Quran cache, last-read position) with localStorage fallback
- **Inline verse layout** (`display: inline`) so verses flow naturally like printed Mushaf text
- **Gold gradient verse markers** with layered box-shadow for depth
- **Parchment page background** (`#FFFDF7`) with decorative inner border
- **Mobile overlay sidebar** with backdrop blur, ESC key close, and body scroll lock
- **Touch-first verse actions** — tap toggles toolbar on mobile, hover shows on desktop
- **IntersectionObserver** for last-read tracking — no scroll event listeners, no performance overhead
- **CSS-only verse marker** via `::before` pseudo-element — no DOM injection during scroll
- **MutationObserver navigation** — waits for actual DOM render before scrolling, no fixed timeouts
- **Individual SW caching** — `cache.add()` per asset prevents one failure from breaking the entire install

## Browser Support
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License
This project is licensed under the MIT License.

## Acknowledgments
- Quran text: [Tanzil Project](http://tanzil.net)
- Audio reciters: Mishary Rashid Alafasy, Abu Bakr Shatri, Nasser Al-Qatami, Yasser Al-Dosari, Hani Al-Rifai
- Tafsir: Tafsir Al-Muyassar (King Fahd Complex)
- Font: [Amiri](https://fonts.google.com/specimen/Amiri) by Khaled Hosny
- Image export: [html2canvas](https://html2canvas.hertzen.com/)
