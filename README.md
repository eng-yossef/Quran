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
- **Jump to Verse**: Click any bookmark to navigate directly to it

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

### Responsive Design
- **Mobile-first**: Optimized for phones (≤640px), small tablets (641–768px), large tablets (769–1024px), and desktops (≥1025px)
- **Overlay Sidebar**: Slide-out drawer on mobile with backdrop, ESC key, and outside-click close
- **Touch-friendly**: 40px minimum touch targets, tap-to-toggle verse actions
- **Compact Header**: Scrollable header controls on small screens
- **Body Scroll Lock**: Prevents background scrolling when sidebar is open on mobile

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
├── README.md               # This file
├── quran (1).png           # Favicon
├── tests.html              # Test page
│
├── css/                    # 19 CSS modules (load order matters)
│   ├── variables.css       # CSS custom properties: colors, fonts, layout, verse markers
│   ├── base.css            # Reset, body, app-container, touch scrolling
│   ├── sidebar.css         # Sidebar drawer, overlay, surah list
│   ├── header.css          # Header bar, controls, progress display
│   ├── main-content.css    # Quran page, verse containers, verse markers, surah headers, bismillah
│   ├── navigation.css      # Bottom nav bar, page indicator, juz label
│   ├── components.css      # Stop button, misc UI components
│   ├── tafsir.css          # Tafsir tooltip positioning and styling
│   ├── animations.css      # Verse pulse, current-playing glow, fade-in, night-mode effects
│   ├── image-export.css    # Premium image export container with ornamental borders
│   ├── night-mode.css      # Dark theme overrides for all components
│   ├── responsive.css      # Mobile-first breakpoints: ≤640px, 641–768px, 769–1024px, ≥1025px, ≥1280px
│   ├── search.css          # Search modal, results, highlight animations
│   ├── bookmarks.css       # Bookmarks panel, bookmark items, toggle icons
│   ├── controls.css        # Font size controls, audio speed, reciter select
│   ├── share.css           # Verse action toolbar (copy, share, tafsir, bookmark)
│   ├── reading-progress.css # Reading progress bar
│   ├── fullscreen.css      # Fullscreen mode styles
│   └── font-uthmanic.css   # Base64 Uthmanic font (unused, superseded by Amiri)
│
├── js/                     # 20 JS modules (loaded in dependency order)
│   ├── config.js           # API URLs, reciter configurations, default settings
│   ├── state.js            # Global state: currentPage, audioQueue, activeSurah
│   ├── utils.js            # cleanVerseText(), normalizeArabic(), toArabicNumber()
│   ├── storage.js          # localStorage helpers, organizeVersesByPage()
│   ├── share.js            # copyVerseText(), shareVerse(), fallbackCopy(), showToast()
│   ├── audio.js            # Audio playback engine, pre-fetch queue, verse sync
│   ├── audio-controls.js   # Play/pause, stop, speed control, repeat/loop logic
│   ├── render.js           # renderPage() — verse HTML generation, surah headers, bismillah
│   ├── tafsir.js           # Tafsir Al-Muyassar fetch and tooltip display
│   ├── verse-interactions.js # Verse hover/tap, action toolbar, copy/share/bookmark/tafsir
│   ├── navigation.js       # Page navigation, keyboard shortcuts, page input
│   ├── sidebar.js          # Sidebar toggle, surah list, overlay, ESC/outside-click close
│   ├── night-mode.js       # Theme toggle, localStorage persistence
│   ├── image-export.js     # html2canvas verse image generation
│   ├── search.js           # Full-text search engine, recent searches, result highlighting
│   ├── bookmarks.js        # Bookmark CRUD, panel UI, icon updates
│   ├── font-controls.js    # Font size increase/decrease, localStorage persistence
│   ├── reading-progress.js # Progress tracking, stats modal, streak calculation
│   ├── fullscreen.js       # Fullscreen API toggle, exit hint
│   └── app.js              # DOMContentLoaded init, event binding, click-outside handler
│
└── fonts/                  # Local font files
    ├── UthmanicHafs_V22.ttf       # Original Uthmanic font (unused, GDEF bug)
    └── UthmanicHafs_V22_FIXED.ttf # Attempted fix (unused)
```

## Architecture

### Modular Design
- **13 JS modules** split from a single monolithic `script.js`
- **19 CSS partials** split from a single `style.css`
- **No build system** — all files loaded via `<script>` and `<link>` tags
- **Dependency order** — JS modules loaded config → state → utils → storage → ... → app

### Data Flow
1. `config.js` defines API URLs and reciter base URLs
2. `storage.js` fetches Quran text from API, organizes into `pagesData` (keyed by page number)
3. `render.js` reads `pagesData[currentPage]` and generates verse HTML
4. `verse-interactions.js` attaches hover/tap handlers to rendered verses
5. `audio.js` fetches and plays audio, syncs with DOM via `current-playing-verse` class

### Font Choice
- **Amiri** (Google Fonts) — selected over KFGQPC Uthmanic V22 due to a GDEF class bug in the WOFF2/TTF files that broke combining marks
- Amiri has complete GPOS mark-to-base coverage for all 24 Quranic annotation signs
- Font stack: `'Amiri', serif`

### CSS Load Order
```
variables → base → sidebar → header → main-content → navigation →
components → tafsir → animations → image-export → night-mode →
responsive → search → bookmarks → controls → share →
reading-progress → fullscreen
```

### JS Load Order
```
config → state → utils → storage → share → audio → audio-controls →
render → tafsir → verse-interactions → navigation → sidebar →
night-mode → image-export → search → bookmarks → font-controls →
reading-progress → fullscreen → app
```

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
- **Inline verse layout** (`display: inline`) so verses flow naturally like printed Mushaf text
- **Gold gradient verse markers** with layered box-shadow for depth
- **Parchment page background** (`#FFFDF7`) with decorative inner border
- **Mobile overlay sidebar** with backdrop blur, ESC key close, and body scroll lock
- **Touch-first verse actions** — tap toggles toolbar on mobile, hover shows on desktop

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
