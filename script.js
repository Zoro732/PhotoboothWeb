var touchstartX = 0;
var touchstartY = 0;
var touchendX = 0;
var touchendY = 0;

document.addEventListener('touchstart', function(event) {
    if (event.touches.length > 0) {
        touchstartX = event.touches[0].clientX;
        touchstartY = event.touches[0].clientY;
    }
}, { passive: false });

document.addEventListener('touchend', function(event) {
    if (event.changedTouches.length > 0) {
        touchendX = event.changedTouches[0].clientX;
        touchendY = event.changedTouches[0].clientY;
        handleSwipe();
    }
}, { passive: false });

function handleSwipe() {
    var diffX = touchstartX - touchendX;
    var diffY = touchstartY - touchendY;
    var threshold = 50;
    
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > threshold) {
            console.log('Swipe vers la gauche - ouverture gallery');
            document.body.classList.add('gallery-open');
            ensureGalleryLoaded();
        } else if (diffX < -threshold) {
            console.log('Swipe vers la droite - fermeture gallery');
            document.body.classList.remove('gallery-open');
        }
    }
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'ArrowLeft') {
        console.log('Flèche gauche - ouverture gallery');
        document.body.classList.add('gallery-open');
        ensureGalleryLoaded();
    } else if (event.key === 'ArrowRight') {
        console.log('Flèche droite - fermeture gallery');
        document.body.classList.remove('gallery-open');
    }
});

const GALLERY_BASE_URL = './photos/';
const GALLERY_LIST_URLS = [
    './get_photo.php',
    './get_photos.php',
    './photos_list.json',
    './photos/'
];

// ========== POLLING AUTO-REFRESH ==========
let currentPhotoCount = 0;
let pollingInterval;

function startPolling() {
    // Vérifier toutes les 2 secondes s'il y a de nouvelles photos
    pollingInterval = setInterval(() => {
        checkForNewPhotos();
    }, 2000); // 2000ms = 2 secondes
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
}

function checkForNewPhotos() {
    fetchFirstList(GALLERY_LIST_URLS)
        .then(files => {
            if (currentPhotoCount === 0) {
                currentPhotoCount = files.length;
            } else if (files.length > currentPhotoCount) {
                console.log(`🆕 ${files.length - currentPhotoCount} nouvelle(s) photo(s)`);
                currentPhotoCount = files.length;
                reloadGallery();
            }
        })
        .catch(err => console.error('Erreur polling:', err));
}

// Démarrer le polling au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    startPolling();
});

// ========== FONCTIONS GALERIE ==========
function ensureGalleryLoaded() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    if (grid.children.length > 0) return;
    
    loadGallery();
}

function loadGallery() {
    fetchFirstList(GALLERY_LIST_URLS)
        .then(files => {
            currentPhotoCount = files.length;
            console.log('📷 Photos chargées:', files.length);
            addImagesToGallery(files.map(f => GALLERY_BASE_URL + f));
        })
        .catch(err => console.error('Erreur chargement gallery:', err));
}

function reloadGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    grid.innerHTML = '';
    fetchFirstList(GALLERY_LIST_URLS)
        .then(files => {
            console.log('🔄 Galerie rechargée:', files.length, 'photos');
            addImagesToGallery(files.map(f => GALLERY_BASE_URL + f));
        })
        .catch(err => console.error('Erreur rechargement gallery:', err));
}

function addImagesToGallery(urls) {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    
    urls.forEach(url => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        const img = document.createElement('img');
        img.src = url + '?t=' + Date.now();
        img.alt = 'Photo';
        img.loading = 'lazy';
        item.appendChild(img);
        grid.appendChild(item);
    });
}

// ========= utilitaires liste multi-sources =========
function fetchFirstList(urls) {
    return new Promise((resolve, reject) => {
        const tryNext = (i) => {
            if (i >= urls.length) {
                return reject(new Error('Aucune source valide'));
            }
            const url = urls[i];
            fetch(url, { cache: 'no-store' })
                .then(res => res.text())
                .then(text => {
                    // JSON direct
                    try {
                        const parsed = JSON.parse(text);
                        const files = Array.isArray(parsed) ? parsed : (parsed.files || null);
                        if (files) return resolve(files);
                    } catch (_) {}
                    // Listing HTML du dossier /photos/
                    if (url.endsWith('/')) {
                        const files = extractImageLinksFromHtml(text);
                        if (files && files.length) return resolve(files);
                    }
                    tryNext(i + 1);
                })
                .catch(() => tryNext(i + 1));
        };
        tryNext(0);
    });
}

function extractImageLinksFromHtml(htmlText) {
    const tmp = document.createElement('div');
    tmp.innerHTML = htmlText;
    const anchors = tmp.querySelectorAll('a[href]');
    const exts = ['.jpg','.jpeg','.png','.gif','.webp'];
    const files = [];
    anchors.forEach(a => {
        const href = a.getAttribute('href') || '';
        const lower = href.toLowerCase();
        if (exts.some(ext => lower.endsWith(ext))) {
            try {
                const u = new URL(href, window.location.origin);
                const name = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
                if (name && !files.includes(name)) files.push(name);
            } catch {
                const parts = href.split('?')[0].split('#')[0].split('/');
                const name = decodeURIComponent(parts.pop() || '');
                if (name && !files.includes(name)) files.push(name);
            }
        }
    });
    return files;
}