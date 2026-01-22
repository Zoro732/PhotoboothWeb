var touchstartX = 0;
var touchstartY = 0;
var touchendX = 0;
var touchendY = 0;
let currentLightboxPhoto = null; // chemin normalisé de l'image ouverte en lightbox
let tempPhotoFilename = null; // nom du fichier temporaire en cours de traitement

// ========== FONCTION NOTIFICATION DEBUG ==========
function showDebugNotification(message, duration = 2000) {
    const notification = document.getElementById('printNotification');
    if (!notification) {
        console.log('⚠️ Notification element not found');
        return;
    }

    console.log(message); // Garder aussi dans la console

    notification.textContent = message;
    notification.classList.remove('hide');
    notification.classList.add('show');

    // Auto-hide après le délai
    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
    }, duration);
}

// ========== FONCTION COUNTDOWN ==========
function startCountdown(overlayElement) {
    return new Promise((resolve) => {
        console.log('⏰ Element:', overlayElement);
        console.log('⏰ Parent:', overlayElement.parentElement);

        const numbers = [5, 4, 3, 2, 1];
        let currentIndex = 0;

        function showNumber() {
            if (currentIndex >= numbers.length) {
                overlayElement.textContent = '';
                overlayElement.classList.remove('show', 'shrink');
                overlayElement.style.display = 'none';
                resolve();
                return;
            }

            const num = numbers[currentIndex];
            overlayElement.style.display = 'flex';
            overlayElement.textContent = num;
            overlayElement.classList.remove('shrink');
            overlayElement.classList.add('show');

            // Forcer le reflow pour redémarrer l'animation
            void overlayElement.offsetWidth;

            // Ajouter la classe shrink pour l'animation
            setTimeout(() => {
                overlayElement.classList.add('shrink');
            }, 50);

            currentIndex++;
            setTimeout(showNumber, 1000);
        }

        showNumber();
    });
}

// ========== GESTION DU STREAM ET CAPTURE ==========
document.addEventListener('DOMContentLoaded', () => {

    // Bouton ouvrir stream
    const openStreamBtn = document.getElementById('openStreamBtn');
    if (openStreamBtn) {
        openStreamBtn.addEventListener('click', function () {
            const container = document.getElementById('streamContainer');
            const highlandbar = document.getElementById('highlandbar');

            if (!container) return;

            container.style.display = 'flex';
            container.classList.add('show');
            document.body.classList.add('streaming');
            if (highlandbar) highlandbar.classList.add('streaming');
            this.style.display = 'none';
        });
    }

    // Bouton fermer stream
    const closeStreamBtn = document.getElementById('closeStreamBtn');
    if (closeStreamBtn) {
        closeStreamBtn.addEventListener('click', function () {
            const container = document.getElementById('streamContainer');
            const highland = document.getElementById('highlandbar');
            const openBtn = document.getElementById('openStreamBtn');

            if (!container) return;

            container.classList.add('closing');
            document.body.classList.remove('streaming');
            document.body.classList.remove('photo-preview');
            container.classList.remove('show');
            if (highland) highland.classList.remove('streaming');

            setTimeout(() => {
                container.style.display = 'none';
                container.classList.remove('closing');
                if (openBtn) openBtn.style.display = 'flex';
            }, 400);
        });
    }

    // Bouton prendre une photo
    const shootBtn = document.getElementById('shootBtn');
    if (shootBtn) {

        // Fonction commune pour gérer la capture
        async function handleCapture(event) {
            event.preventDefault();
            event.stopPropagation();

            const flashOverlay = document.getElementById('flashOverlay');
            const countdownOverlay = document.getElementById('countdownOverlay');
            const stream = document.getElementById('stream');
            const canvas = document.getElementById('captureCanvas');
            const thumbnail = document.getElementById('photoThumbnail');

            // Vérifier quels éléments manquent
            const missing = [];
            if (!stream) missing.push('stream');
            if (!canvas) missing.push('canvas');
            if (!thumbnail) missing.push('thumbnail');
            if (!flashOverlay) missing.push('flashOverlay');
            if (!countdownOverlay) missing.push('countdownOverlay');

            if (missing.length > 0) {
                showDebugNotification('❌ Manquant: ' + missing.join(', '), 5000);
                console.error('Éléments manquants:', missing);
                return;
            }

            shootBtn.disabled = true;
            shootBtn.style.pointerEvents = 'none';
            shootBtn.style.opacity = '0';
            console.log('✅ Bouton désactivé pour capture');

            // Lancer le countdown de 5 secondes
            await startCountdown(countdownOverlay);

            // Effet de flash blanc immédiat
            flashOverlay.style.opacity = '1';

            try {
                const ctx = canvas.getContext('2d');

                // Capturer la frame actuelle dans le canvas
                canvas.width = stream.naturalWidth || stream.width || 640;
                canvas.height = stream.naturalHeight || stream.height || 480;

                // Dessiner l'image
                ctx.drawImage(stream, 0, 0, canvas.width, canvas.height);
                let capturedImage = canvas.toDataURL('image/jpeg', 0.95);

                // Si le canvas est vide (CORS), utiliser directement l'URL du stream
                if (!capturedImage || capturedImage === 'data:image/jpeg;base64,') {
                    capturedImage = `url('${stream.src}')`;
                }
                console.log('✅ Image capturée avec succès');

                setTimeout(() => {
                    flashOverlay.style.opacity = '0';

                    // Après le flash, afficher la prévisualisation et morphing des boutons
                    setTimeout(() => {
                        if (typeof capturedImage === 'string' && capturedImage.startsWith('url(')) {
                            thumbnail.style.backgroundImage = capturedImage;
                        } else {
                            thumbnail.style.backgroundImage = `url(${capturedImage})`;
                        }
                        // Rendre le thumbnail visible
                        thumbnail.classList.add('show');
                        // Activer le mode preview avec morphing
                        document.body.classList.add('photo-preview');
                        // Déclencher la prise de vue sur le serveur (RPI)
                        fetch('command.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'capture' })
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (data.ok) {
                                    tempPhotoFilename = data.filename;
                                } else {
                                    console.error('Erreur serveur capture:', data.error);
                                }
                            })
                            .catch(err => {
                                console.error('Erreur capture serveur:', err);
                            });
                    }, 100);
                }, 200);

            } catch (err) {
                console.error('❌ Erreur capture:', err);
                setTimeout(() => {
                    flashOverlay.style.opacity = '0';
                    alert('Impossible de capturer l\'image. Vérifiez que le serveur de stream est accessible.');
                }, 150);
            }

        }

        // Utiliser touchend au lieu de click pour le tactile
        let touchStartTime = 0;

        shootBtn.addEventListener('touchstart', function (event) {
            touchStartTime = Date.now();
            console.log('👆 Touch start détecté');
        }, { passive: true });

        shootBtn.addEventListener('touchend', function (event) {
            const touchDuration = Date.now() - touchStartTime;
            console.log('👆 Touch end détecté, durée:', touchDuration, 'ms');

            // Ignorer si c'était un swipe (touch trop long)
            if (touchDuration < 500) {
                handleCapture(event);
            }
        }, { passive: false });

        // Garder le click pour les souris/desktop
        shootBtn.addEventListener('click', function (event) {
            // Vérifier qu'il ne s'agit pas d'un événement synthétique après touch
            if (event.detail === 0) return; // Événement synthétique, ignorer
            console.log('🖱️ Click détecté');
            handleCapture(event);
        });
    }

    // Bouton refuser (X)
    const rejectPhotoBtn = document.getElementById('rejectPhotoBtn');
    if (rejectPhotoBtn) {
        rejectPhotoBtn.addEventListener('click', function () {
            const thumbnail = document.getElementById('photoThumbnail');

            // Si une photo temp existe, la supprimer
            if (tempPhotoFilename) {
                fetch('command.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'reject',
                        filename: tempPhotoFilename
                    })
                })
                    .then(res => res.json())
                    .then(data => {
                        console.log(data.ok ? 'Photo rejetée' : ('Erreur: ' + data.error));
                    })
                    .catch(err => console.error('Erreur reject:', err))
                    .finally(() => {
                        tempPhotoFilename = null;
                    });
            }

            // Retirer le mode preview
            document.body.classList.remove('photo-preview');
            if (thumbnail) thumbnail.classList.remove('show');

            shootBtn.disabled = false;
            shootBtn.style.pointerEvents = 'auto';
            shootBtn.style.opacity = '1';
            console.log('✅ Bouton réactivé');

            // Nettoyer
            if (thumbnail) {
                const bgImage = thumbnail.style.backgroundImage;
                if (bgImage.includes('blob:')) {
                    const url = bgImage.match(/url\("?(blob:[^")]+)"?\)/)?.[1];
                    if (url) URL.revokeObjectURL(url);
                }
                thumbnail.style.backgroundImage = '';
            }
        });
    }

    // Bouton valider (V)
    const acceptPhotoBtn = document.getElementById('acceptPhotoBtn');
    if (acceptPhotoBtn) {
        acceptPhotoBtn.addEventListener('click', function () {
            const thumbnail = document.getElementById('photoThumbnail');

            if (!thumbnail || !tempPhotoFilename) return;

            // Déplacer la photo du tmp vers photos
            fetch('command.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'accept',
                    filename: tempPhotoFilename
                })
            })
                .then(response => response.json())
                .then(data => {
                    console.log(data.ok ? "Photo acceptée !" : ("Erreur : " + (data.error || 'Inconnue')));
                })
                .catch(err => {
                    console.error('Erreur accept:', err);
                })
                .finally(() => {
                    tempPhotoFilename = null;
                });

            // Ajouter l'animation de disparition
            thumbnail.classList.add('animate');

            // Après l'animation, fermer le preview
            setTimeout(() => {
                document.body.classList.remove('photo-preview');
                thumbnail.classList.remove('show', 'animate');
                const bgImage = thumbnail.style.backgroundImage;
                if (bgImage.includes('blob:')) {
                    const url = bgImage.match(/url\("?(blob:[^")]+)"?\)/)?.[1];
                    if (url) URL.revokeObjectURL(url);
                }
                thumbnail.style.backgroundImage = '';

                shootBtn.disabled = false;
                shootBtn.style.pointerEvents = 'auto';
                shootBtn.style.opacity = '1';
                console.log('✅ Bouton réactivé');


            }, 1000);
        });
    }
});

document.addEventListener('touchstart', function (event) {
    if (event.touches.length > 0) {
        touchstartX = event.touches[0].clientX;
        touchstartY = event.touches[0].clientY;
    }
}, { passive: false });

document.addEventListener('touchend', function (event) {
    if (event.changedTouches.length > 0) {
        // Bloquer le swipe si la lightbox est ouverte
        if (document.body.classList.contains('lightbox-open')) {
            return;
        }
        touchendX = event.changedTouches[0].clientX;
        touchendY = event.changedTouches[0].clientY;
        handleSwipe();
    }
}, { passive: false });

function handleSwipe() {
    // Ne pas traiter le swipe si le stream est ouvert ou si la lightbox est active
    if (document.body.classList.contains('streaming') || document.body.classList.contains('lightbox-open')) {
        return;
    }

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

document.addEventListener('keydown', function (event) {
    // Ne pas traiter les flèches si le stream est ouvert ou si la lightbox est active
    if (document.body.classList.contains('streaming') || document.body.classList.contains('lightbox-open')) {
        return;
    }

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
const GALLERY_LIST_URL = './get_photo.php';
const GALLERY_THUMB_URL = './thumbnail.php';
const GALLERY_THUMB_WIDTH = 480; // px, taille suffisante pour les vignettes
const USE_THUMBNAILS = true; // Mettre à false pour désactiver les thumbnails

// Fonction pour charger la liste des photos avec fallback
async function fetchPhotoList() {
    try {
        const res = await fetch(GALLERY_LIST_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error('PHP error');
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error('Empty array');
        console.log('✅ Photos chargées depuis PHP');
        return data;
    } catch (err) {
        console.log('⚠️ PHP failed, trying HTML listing...');
        try {
            const res = await fetch('./photos/', { cache: 'no-store' });
            if (!res.ok) throw new Error('HTML listing error');
            const html = await res.text();
            const files = extractImageLinksFromHtml(html);
            console.log('✅ Photos chargées depuis HTML listing');
            return files;
        } catch (err2) {
            console.error('❌ Tous les fallbacks ont échoué:', err2);
            throw err2;
        }
    }
}

function extractImageLinksFromHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = doc.querySelectorAll('a');
    const imageFiles = [];

    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && /\.(jpg|jpeg|png|gif|webp)$/i.test(href)) {
            imageFiles.push(href);
        }
    });

    return imageFiles;
}

// ========== POLLING AUTO-REFRESH ==========
let currentPhotoCount = 0;
let pollingInterval;

function startPolling() {
    // Vérifier toutes les 2 secondes s'il y a de nouvelles photos
    pollingInterval = setInterval(() => {
        checkForNewPhotos();
    }, 30000); // 30000ms = 30 secondes
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
}

function checkForNewPhotos() {
    fetchPhotoList()
        .then(files => {
            if (currentPhotoCount === 0) {
                // Première fois, on initialise
                currentPhotoCount = files.length;
            } else if (files.length > currentPhotoCount) {
                // Nouvelles photos détectées !
                console.log(`🆕 ${files.length - currentPhotoCount} nouvelle(s) photo(s) détectée(s)`);
                currentPhotoCount = files.length;
                reloadGallery();
            }
        })
        .catch(err => console.error('Erreur polling:', err));
}

// Démarrer le polling au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    startPolling();

    // Gestion des clics sur les boutons de navigation
    document.getElementById('mainPageBtn').addEventListener('click', function () {
        console.log('Click sur Accueil - fermeture gallery');
        document.body.classList.remove('gallery-open');
    });

    document.getElementById('galleryBtn').addEventListener('click', function () {
        console.log('Click sur Galerie - ouverture gallery');
        document.body.classList.add('gallery-open');
        ensureGalleryLoaded();
    });


});

// ========== FONCTIONS GALERIE ==========
function ensureGalleryLoaded() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    if (grid.children.length > 0) return;

    loadGallery();
}

function loadGallery() {
    fetchPhotoList()
        .then(files => {
            currentPhotoCount = files.length;
            console.log('📷 Photos chargées:', files.length);
            addImagesToGallery(files);
        })
        .catch(err => console.error('Erreur chargement gallery:', err));
}

function reloadGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    // Vider la galerie
    grid.innerHTML = '';

    // Recharger les photos
    fetchPhotoList()
        .then(files => {
            console.log('🔄 Galerie rechargée:', files.length, 'photos');
            addImagesToGallery(files);
        })
        .catch(err => console.error('Erreur rechargement gallery:', err));
}

function addImagesToGallery(filenames) {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    // Créer un Intersection Observer pour charger les images visibles
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');
                if (src && !img.src) {
                    console.log('📥 Chargement image:', src);
                    img.src = src;
                    img.removeAttribute('data-src');
                    // Ne plus observer une fois chargée
                    observer.unobserve(img);
                }
            }
        });
    }, {
        root: document.getElementById('gallery'),
        rootMargin: '500px', // Charger les images 500px avant qu'elles soient visibles
        threshold: 0.01
    });

    filenames.forEach(file => {
        const fullUrl = GALLERY_BASE_URL + file;
        const thumbUrl = USE_THUMBNAILS
            ? `${GALLERY_THUMB_URL}?file=${encodeURIComponent(file)}&w=${GALLERY_THUMB_WIDTH}`
            : fullUrl;

        console.log('🖼️ Ajout image:', file);
        console.log('   Thumbnail:', thumbUrl);
        console.log('   Full:', fullUrl);

        const item = document.createElement('div');
        item.className = 'gallery-item';

        // Créer le loader
        const loader = document.createElement('div');
        loader.className = 'loader';

        // Créer l'image
        const img = document.createElement('img');
        img.setAttribute('data-src', thumbUrl);
        img.dataset.fullSrc = fullUrl;
        img.loading = 'lazy';
        img.decoding = 'async';

        // Masquer le loader quand l'image est chargée
        img.addEventListener('load', function () {
            this.classList.add('loaded');
        });

        // En cas d'erreur, essayer l'image originale
        img.addEventListener('error', function () {
            console.warn('Erreur chargement thumbnail, fallback vers image originale:', file);
            if (this.src !== fullUrl && this.src.includes('thumbnail.php')) {
                this.src = fullUrl;
            } else {
                this.classList.add('loaded'); // Masquer le loader même en cas d'erreur
            }
        });

        item.appendChild(img);
        item.appendChild(loader);
        grid.appendChild(item);

        // Observer l'image
        imageObserver.observe(img);

        // Ouvrir la lightbox sur clic
        img.addEventListener('click', function () {
            // S'assurer que l'image a une source
            if (!img.src) {
                const src = img.getAttribute('data-src');
                if (src) img.src = src;
            }
            openLightbox(img);
        });
    });
}

// ====== LIGHTBOX (zoom animé depuis la grille) ======
function openLightbox(img) {
    const overlay = document.getElementById('lightboxOverlay');
    const closeBtn = document.getElementById('lightboxClose');
    if (!overlay || !closeBtn) return;

    // Conserver le chemin de l'image affichée pour l'impression
    const rawSrc = img.dataset.fullSrc || img.src || img.getAttribute('data-src');
    currentLightboxPhoto = normalizePhotoPath(rawSrc);
    overlay.dataset.photo = currentLightboxPhoto;

    const rect = img.getBoundingClientRect();

    // Créer une image temporaire pour obtenir les dimensions réelles
    const tempImg = new Image();
    tempImg.onload = () => {
        const clone = img.cloneNode();
        clone.src = rawSrc; // forcer la version HD dans la lightbox
        clone.classList.add('zooming-image');
        clone.removeAttribute('data-src');
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';

        // Utiliser le ratio RÉEL de l'image (pas celui de la grille carrée)
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const realRatio = tempImg.naturalWidth / tempImg.naturalHeight;

        let targetW = Math.min(vw * 0.8, vh * 0.8 * realRatio);
        let targetH = targetW / realRatio;
        if (targetH > vh * 0.8) {
            targetH = vh * 0.8;
            targetW = targetH * realRatio;
        }
        const targetLeft = (vw - targetW) / 2;
        const targetTop = (vh - targetH) / 2;

        // Stocker les coordonnées d'origine pour l'animation inverse
        clone.dataset.origLeft = String(rect.left);
        clone.dataset.origTop = String(rect.top);
        clone.dataset.origWidth = String(rect.width);
        clone.dataset.origHeight = String(rect.height);

        // Afficher l'overlay et injecter le clone
        overlay.style.display = 'block';
        overlay.appendChild(clone);
        document.body.classList.add('lightbox-open');

        // Forcer un reflow pour que la transition se déclenche
        clone.offsetHeight;

        // Lancer l'animation vers le centre
        clone.style.left = targetLeft + 'px';
        clone.style.top = targetTop + 'px';
        clone.style.width = targetW + 'px';
        clone.style.height = targetH + 'px';

        requestAnimationFrame(() => overlay.classList.add('show'));

        // Fermeture via bouton
        closeBtn.onclick = () => closeLightbox();
        // Fermeture via clic overlay (hors image)
        overlay.onclick = (e) => {
            if (e.target === overlay) closeLightbox();
        };

        // Gestion du bouton d'impression et quantité
        const printBtn = document.getElementById('lightboxPrint');
        const printPanel = document.getElementById('printQuantityPanel');
        let printQuantity = 1;

        if (printBtn && printPanel) {
            printBtn.onclick = (e) => {
                e.stopPropagation();
                if (printPanel.style.display === 'none') {
                    printPanel.style.display = 'flex';
                } else {
                    printPanel.style.display = 'none';
                }
            };

            const incrementBtn = document.getElementById('printIncrement');
            const decrementBtn = document.getElementById('printDecrement');
            const quantityDisplay = document.getElementById('printQuantityDisplay');
            const validateBtn = document.getElementById('printValidate');

            const updateButtonStates = () => {
                quantityDisplay.textContent = String(printQuantity);
                incrementBtn.disabled = printQuantity >= 3;
                decrementBtn.disabled = printQuantity <= 1;
            };

            incrementBtn.onclick = (e) => {
                e.stopPropagation();
                if (printQuantity < 3) {
                    printQuantity++;
                    updateButtonStates();
                }
            };

            decrementBtn.onclick = (e) => {
                e.stopPropagation();
                if (printQuantity > 1) {
                    printQuantity--;
                    updateButtonStates();
                }
            };

            if (validateBtn) {
                validateBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (!currentLightboxPhoto) {
                        console.error('Aucune photo sélectionnée pour impression');
                        return;
                    }

                    // Appel serveur pour lancer l'impression via print_photo.sh
                    fetch('command.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'print',
                            photo: currentLightboxPhoto,
                            copies: printQuantity
                        })
                    })
                        .then(res => res.json())
                        .then(data => {
                            const notification = document.getElementById('printNotification');
                            if (data.ok) {
                                if (notification) {
                                    notification.textContent = `${printQuantity} impression${printQuantity > 1 ? 's' : ''} lancée${printQuantity > 1 ? 's' : ''} !`;
                                    notification.classList.remove('hide');
                                    notification.classList.add('show');
                                    setTimeout(() => {
                                        notification.classList.remove('show');
                                        notification.classList.add('hide');
                                    }, 3000);
                                }
                            } else {
                                console.error('Erreur impression:', data.error || 'Inconnue');
                                if (notification) {
                                    notification.textContent = `Erreur impression: ${data.error || 'Inconnue'}`;
                                    notification.classList.remove('hide');
                                    notification.classList.add('show');
                                    setTimeout(() => {
                                        notification.classList.remove('show');
                                        notification.classList.add('hide');
                                    }, 3000);
                                }
                            }
                        })
                        .catch(err => {
                            console.error('Erreur impression:', err);
                            const notification = document.getElementById('printNotification');
                            if (notification) {
                                notification.textContent = `Erreur impression: ${err.message}`;
                                notification.classList.remove('hide');
                                notification.classList.add('show');
                                setTimeout(() => {
                                    notification.classList.remove('show');
                                    notification.classList.add('hide');
                                }, 3000);
                            }
                        })
                        .finally(() => {
                            printPanel.style.display = 'none';
                        });
                };
            }

            updateButtonStates();
        }
    };

    tempImg.src = rawSrc;
}

function closeLightbox() {
    const overlay = document.getElementById('lightboxOverlay');
    const printPanel = document.getElementById('printQuantityPanel');
    if (!overlay) return;

    // Fermer le panel d'impression
    if (printPanel) printPanel.style.display = 'none';
    currentLightboxPhoto = null;
    delete overlay.dataset.photo;

    const clone = overlay.querySelector('.zooming-image');
    if (!clone) {
        overlay.classList.remove('show');
        overlay.style.display = 'none';
        document.body.classList.remove('lightbox-open');
        return;
    }

    // Animer retour vers la position d'origine
    clone.style.left = clone.dataset.origLeft + 'px';
    clone.style.top = clone.dataset.origTop + 'px';
    clone.style.width = clone.dataset.origWidth + 'px';
    clone.style.height = clone.dataset.origHeight + 'px';

    // Après la transition, nettoyer
    const onEnd = () => {
        clone.removeEventListener('transitionend', onEnd);
        overlay.classList.remove('show');
        overlay.style.display = 'none';
        if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
        document.body.classList.remove('lightbox-open');
    };
    clone.addEventListener('transitionend', onEnd);
}

// Normalise un src d'image pour obtenir un chemin relatif sans query (photos/...)
function normalizePhotoPath(src) {
    if (!src) return '';
    try {
        const url = new URL(src, window.location.href);
        const cleanPath = url.pathname.replace(/^\/+/, '');
        return cleanPath;
    } catch (e) {
        // fallback si URL invalide
        return src.split('?')[0];
    }
}