<?php
// Liste les templates disponibles dans le dossier assets/templates/

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$templateDir = __DIR__ . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'templates';
$allowedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

if (!is_dir($templateDir)) {
    http_response_code(404);
    echo json_encode(['error' => 'Template directory not found', 'templates' => []]);
    exit;
}

$templates = [];

// Scanner le répertoire
if ($handle = opendir($templateDir)) {
    while (($file = readdir($handle)) !== false) {
        if ($file === '.' || $file === '..') continue;
        
        $filePath = $templateDir . DIRECTORY_SEPARATOR . $file;
        if (!is_file($filePath)) continue;
        
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExt, true)) continue;
        
        $templates[] = './assets/templates/' . basename($file);
    }
    closedir($handle);
}

// Trier par numéro si le fichier commence par un numéro
usort($templates, function($a, $b) {
    preg_match('/(\d+)/', basename($a), $matchA);
    preg_match('/(\d+)/', basename($b), $matchB);
    $numA = isset($matchA[1]) ? (int)$matchA[1] : 0;
    $numB = isset($matchB[1]) ? (int)$matchB[1] : 0;
    return $numA - $numB;
});

echo json_encode([
    'count' => count($templates),
    'templates' => $templates
]);
?>
