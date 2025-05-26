# المصحف الشريف - Digital Quran Application

## Overview
A modern, feature-rich web application for reading and listening to the Holy Quran. Built with vanilla JavaScript, focusing on performance, accessibility, and user experience.

## ✨ Features

### 📖 Reading Features
- **Page-based Navigation**: Authentic Uthmani script with page layout matching printed Mushaf
- **Dual-language Surah Names**: Arabic and English names for each Surah
- **Verse Numbering**: Clear Arabic numerical system for verse numbers
- **Responsive Design**: Adapts seamlessly to different screen sizes
- **Night Mode**: Eye-friendly dark theme for comfortable reading

### 🎧 Audio Features
- **Verse-by-Verse Audio**: Professional recitation by Sheikh Mishary Rashid Alafasy
- **Smart Audio Queue**: Pre-fetches upcoming verses for smooth playback
- **Continuous Playback**: Option to play entire Surahs continuously
- **Audio Controls**: Play, pause, and stop functionality
- **Visual Feedback**: Verse highlighting during playback

### 📚 Study Features
- **Tafsir Integration**: Access to Tafsir Al-Muyassar for verse explanations
- **Verse Selection**: Easy text selection and sharing
- **Image Export**: Save verses as beautifully formatted images
- **Quick Navigation**: Fast access to specific Surahs and verses

### 🛠 Technical Features
- **Offline Support**: Caches Quran text and audio for offline access
- **Performance Optimized**: Fast loading and smooth scrolling
- **State Persistence**: Remembers last read page
- **Multi-device Support**: Works on desktop and mobile devices

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for initial load and audio streaming

### Installation
1. Clone the repository:
```powershell
git clone https://github.com/eng-yossef/Quran
cd Quran
```

2. Open `Quran.html` in a web browser or serve using a local server:
```powershell
# Using Python
python -m http.server 8080

# Using Node.js
npx serve
```

## 📂 Project Structure
```
Quran/
├── Quran.html          # Main HTML file
├── style.css           # Global styles
├── script.js           # Main JavaScript file
├── quran (1).png      # Favicon
└── js/                # JavaScript modules
    ├── handlers/      # Event handlers
    ├── modules/       # Core functionality modules
    ├── services/      # Data and audio services
    └── utils/         # Utility functions
```

## 💻 Technical Details

### Services
- **audioService.js**: Handles audio playback and queue management
- **quranDataService.js**: Manages Quran text data and verse organization
- **navigationHandler.js**: Handles page navigation and state management

### User Interface
- Responsive design using CSS Grid and Flexbox
- CSS animations for smooth transitions
- Touch-friendly interface with swipe navigation
- Customizable typography for optimal readability

### Performance Optimizations
- Lazy loading of audio content
- Efficient DOM updates
- Debounced event handlers
- Resource caching
- Memory-efficient data structures

## 🤝 Contributing
Contributions are welcome! Please feel free to submit pull requests.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -m 'Add YourFeature'`
4. Push to the branch: `git push origin feature/YourFeature`
5. Submit a pull request

## 📱 Mobile Support
- Touch-optimized interface
- Swipe navigation
- Responsive layout
- Mobile-friendly audio controls
- Optimized performance on mobile devices

## 🔄 Updates and Maintenance
- Regular updates for bug fixes
- Performance improvements
- New feature additions
- Security updates
- Browser compatibility maintenance

## ⚙️ Configuration
The application includes several configurable options:
- Audio pre-fetch count
- Page transition animations
- Night mode colors
- Font sizes and styles
- Cache duration

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments
- Quran text source: [Tanzil Project](http://tanzil.net)
- Audio recitation: Sheikh Mishary Rashid Alafasy
- Tafsir Al-Muyassar source: King Fahd Complex
