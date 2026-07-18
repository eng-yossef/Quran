/*
 * PWA Manager — Install prompt, update detection, offline indicator
 * Loaded as the last script before app.js
 */

let deferredInstallPrompt = null;
let swRegistration = null;

// ─── Service Worker Registration ───────────────────────────────
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('[PWA] Service workers not supported');
        return null;
    }

    try {
        swRegistration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
        console.log('[PWA] Service worker registered:', swRegistration.scope);

        if (swRegistration.installing) {
            console.log('[PWA] SW installing...');
            swRegistration.installing.addEventListener('statechange', (e) => {
                console.log('[PWA] SW state:', e.target.state);
            });
        }

        // Detect updates
        swRegistration.addEventListener('updatefound', () => {
            const newWorker = swRegistration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] New version available');
                    showUpdateBanner();
                }
            });
        });

        return swRegistration;
    } catch (error) {
        console.error('[PWA] SW registration failed:', error);
        return null;
    }
}

// ─── Install Prompt ────────────────────────────────────────────
function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        showInstallBanner();
    });

    window.addEventListener('appinstalled', () => {
        console.log('[PWA] App installed');
        deferredInstallPrompt = null;
        hideInstallBanner();
        localStorage.setItem('pwa-installed', 'true');
    });
}

async function promptInstall() {
    if (!deferredInstallPrompt) return;

    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);
    deferredInstallPrompt = null;
    hideInstallBanner();
}

// ─── Install Banner UI ─────────────────────────────────────────
function showInstallBanner() {
    if (localStorage.getItem('pwa-install-dismissed') === 'true') return;
    if (localStorage.getItem('pwa-installed') === 'true') return;

    let banner = document.getElementById('pwa-install-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.className = 'pwa-banner';
        banner.setAttribute('role', 'alert');
        banner.setAttribute('aria-label', 'Install Quran App');
        banner.innerHTML = `
            <div class="pwa-banner-content">
                <span class="pwa-banner-icon">&#x2726;</span>
                <div class="pwa-banner-text">
                    <strong>تثبيت التطبيق</strong>
                    <span>أضف المصحف الشريف إلى الشاشة الرئيسية</span>
                </div>
                <div class="pwa-banner-actions">
                    <button class="pwa-banner-btn pwa-install-btn" onclick="promptInstall()">تثبيت</button>
                    <button class="pwa-banner-btn pwa-dismiss-btn" onclick="dismissInstallBanner()">&times;</button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
    }
    requestAnimationFrame(() => banner.classList.add('visible'));
}

function hideInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
        banner.classList.remove('visible');
        setTimeout(() => banner.remove(), 400);
    }
}

function dismissInstallBanner() {
    localStorage.setItem('pwa-install-dismissed', 'true');
    hideInstallBanner();
}

// ─── Update Banner UI ──────────────────────────────────────────
function showUpdateBanner() {
    let banner = document.getElementById('pwa-update-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'pwa-update-banner';
        banner.className = 'pwa-banner pwa-update';
        banner.setAttribute('role', 'alert');
        banner.setAttribute('aria-label', 'Update available');
        banner.innerHTML = `
            <div class="pwa-banner-content">
                <span class="pwa-banner-icon">&#x21BB;</span>
                <div class="pwa-banner-text">
                    <strong>تحديث متاح</strong>
                    <span>إصدار جديد من التطبيق متوفر</span>
                </div>
                <div class="pwa-banner-actions">
                    <button class="pwa-banner-btn pwa-update-btn" onclick="applyUpdate()">تحديث</button>
                    <button class="pwa-banner-btn pwa-dismiss-btn" onclick="dismissUpdateBanner()">&times;</button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
    }
    requestAnimationFrame(() => banner.classList.add('visible'));
}

function hideUpdateBanner() {
    const banner = document.getElementById('pwa-update-banner');
    if (banner) {
        banner.classList.remove('visible');
        setTimeout(() => banner.remove(), 400);
    }
}

function dismissUpdateBanner() {
    hideUpdateBanner();
}

async function applyUpdate() {
    if (!swRegistration || !swRegistration.waiting) return;
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
}

// ─── Offline Indicator ─────────────────────────────────────────
function setupOfflineDetection() {
    updateOnlineStatus();
    window.addEventListener('online', () => {
        updateOnlineStatus();
        hideOfflineBanner();
    });
    window.addEventListener('offline', () => {
        updateOnlineStatus();
        showOfflineBanner();
    });
}

function updateOnlineStatus() {
    document.body.classList.toggle('offline', !navigator.onLine);
}

function showOfflineBanner() {
    let banner = document.getElementById('pwa-offline-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'pwa-offline-banner';
        banner.className = 'pwa-banner pwa-offline';
        banner.setAttribute('role', 'status');
        banner.setAttribute('aria-live', 'polite');
        banner.innerHTML = `
            <div class="pwa-banner-content">
                <span class="pwa-banner-icon">&#x26A0;</span>
                <div class="pwa-banner-text">
                    <strong>غير متصل</strong>
                    <span>أنت حالياً في وضع عدم الاتصال</span>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
    }
    requestAnimationFrame(() => banner.classList.add('visible'));
}

function hideOfflineBanner() {
    const banner = document.getElementById('pwa-offline-banner');
    if (banner) {
        banner.classList.remove('visible');
        setTimeout(() => banner.remove(), 400);
    }
}

// ─── Theme Color Sync ──────────────────────────────────────────
function syncThemeColor() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;

    const update = () => {
        const isNight = document.body.classList.contains('night-mode');
        meta.content = isNight ? '#1e1e1e' : '#2E8B57';
    };

    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

// ─── Init ──────────────────────────────────────────────────────
async function initPWA() {
    await registerServiceWorker();
    setupInstallPrompt();
    setupOfflineDetection();
    syncThemeColor();

    // Handle ?search=true param for app shortcuts
    const params = new URLSearchParams(window.location.search);
    if (params.get('search') === 'true') {
        setTimeout(() => {
            const searchBtn = document.getElementById('searchBtn');
            if (searchBtn) searchBtn.click();
        }, 500);
    }
}

// Initialize when DOM is ready (this script loads before app.js)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPWA);
} else {
    initPWA();
}
