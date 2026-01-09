<?php
header('Content-Type: application/json; charset=utf-8');

$dir = __DIR__ . DIRECTORY_SEPARATOR . 'photos';
$allowed = ['jpg','jpeg','png','gif','webp','JPG','JPEG','PNG','GIF','WEBP'];

if (!is_dir($dir)) {
    echo json_encode([]);
    exit;
}

$files = scandir($dir);
$result = [];
foreach ($files as $f) {
    if ($f === '.' || $f === '..') continue;
    $path = $dir . DIRECTORY_SEPARATOR . $f;
    if (!is_file($path)) continue;
    $ext = pathinfo($f, PATHINFO_EXTENSION);
    if (!in_array($ext, $allowed, true)) continue;
    $result[] = $f;
}

// Tri décroissant par date de modification
usort($result, function($a, $b) use ($dir) {
    return filemtime($dir . DIRECTORY_SEPARATOR . $b) <=> filemtime($dir . DIRECTORY_SEPARATOR . $a);
});

echo json_encode($result);
?>