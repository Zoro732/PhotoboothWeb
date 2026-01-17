<?php
// Génère (et met en cache) une vignette JPEG allégée pour la galerie

$photoDir = __DIR__ . DIRECTORY_SEPARATOR . 'photos';
$cacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'tmp' . DIRECTORY_SEPARATOR . 'thumbs';
$allowedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'];

// Paramètres d'entrée
$file = $_GET['file'] ?? '';
$maxWidth = isset($_GET['w']) ? (int) $_GET['w'] : 480;
$maxWidth = max(120, min($maxWidth, 2000));

if ($file === '') {
    http_response_code(400);
    echo 'Missing file parameter';
    exit;
}

$ext = pathinfo($file, PATHINFO_EXTENSION);
if (!in_array($ext, $allowedExt, true)) {
    http_response_code(400);
    echo 'Invalid file extension: ' . $ext;
    exit;
}

$sourcePath = realpath($photoDir . DIRECTORY_SEPARATOR . basename($file));
$photoRoot = realpath($photoDir);
if ($sourcePath === false || $photoRoot === false || strpos($sourcePath, $photoRoot) !== 0) {
    http_response_code(404);
    echo 'File not found or invalid path: ' . htmlspecialchars($file);
    exit;
}

if (!file_exists($sourcePath)) {
    http_response_code(404);
    echo 'File does not exist: ' . htmlspecialchars($sourcePath);
    exit;
}

// Préparer le cache
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}
$cacheFile = $cacheDir . DIRECTORY_SEPARATOR . pathinfo($file, PATHINFO_FILENAME) . "_w{$maxWidth}.jpg";

// Servir le cache si à jour
if (file_exists($cacheFile) && filemtime($cacheFile) >= filemtime($sourcePath)) {
    header('Content-Type: image/jpeg');
    header('Cache-Control: public, max-age=604800, immutable');
    readfile($cacheFile);
    exit;
}

// Charger la source
$ext = strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION));
$createMap = [
    'jpg'  => 'imagecreatefromjpeg',
    'jpeg' => 'imagecreatefromjpeg',
    'png'  => 'imagecreatefrompng',
    'gif'  => 'imagecreatefromgif',
    'webp' => 'imagecreatefromwebp',
];

if (!isset($createMap[$ext]) || !function_exists($createMap[$ext])) {
    http_response_code(415);
    echo 'Unsupported media type: ' . $ext;
    exit;
}

$imageInfo = @getimagesize($sourcePath);
if ($imageInfo === false) {
    http_response_code(500);
    echo 'Cannot get image dimensions';
    exit;
}

[$width, $height] = $imageInfo;
if (!$width || !$height) {
    http_response_code(500);
    echo 'Invalid image dimensions';
    exit;
}

$newWidth = $width <= $maxWidth ? $width : $maxWidth;
$newHeight = (int) round($height * ($newWidth / $width));

$src = @$createMap[$ext]($sourcePath);
if ($src === false) {
    http_response_code(500);
    echo 'Failed to load source image';
    exit;
}

$thumb = imagecreatetruecolor($newWidth, $newHeight);
if ($thumb === false) {
    imagedestroy($src);
    http_response_code(500);
    echo 'Failed to create thumbnail';
    exit;
}

// Préserver l'alpha pour PNG/GIF
if (in_array($ext, ['png', 'gif', 'webp'], true)) {
    imagealphablending($thumb, false);
    imagesavealpha($thumb, true);
}

imagecopyresampled($thumb, $src, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

// Sauvegarder en JPEG compressé pour une petite taille
imagejpeg($thumb, $cacheFile, 80);

imagedestroy($src);
imagedestroy($thumb);

header('Content-Type: image/jpeg');
header('Cache-Control: public, max-age=604800, immutable');
readfile($cacheFile);
