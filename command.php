<?php
// Point d'entrée unique : capture et impression
date_default_timezone_set('Europe/Paris');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST; // fallback si le client envoie un form-url-encoded
}

$action = $input['action'] ?? 'capture';

if ($action === 'capture') {
    // Créer le répertoire tmp s'il n'existe pas
    $tmpDir = __DIR__ . DIRECTORY_SEPARATOR . 'tmp';
    if (!is_dir($tmpDir)) {
        mkdir($tmpDir, 0755, true);
    }
    
    // Prendre la photo avec gphoto2 directement dans tmp
    $filename = date('d-m-Y_H-i-s') . '.jpg';
    $tmpPath = $tmpDir . DIRECTORY_SEPARATOR . $filename;
    $cmd = sprintf(
        'sudo gphoto2 --capture-image-and-download --filename=%s 2>&1',
        escapeshellarg($tmpPath)
    );
    
    $output = shell_exec($cmd);
    
    // Vérifier si le fichier a été créé
    if (is_file($tmpPath)) {
        echo json_encode([
            'ok' => true,
            'filename' => $filename,
            'message' => 'Photo capturée'
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'ok' => false,
            'error' => 'Impossible de capturer la photo',
            'output' => trim((string)$output)
        ]);
    }
    exit;
}

if ($action === 'accept') {
    $filename = $input['filename'] ?? '';
    
    if (!$filename) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Filename manquant']);
        exit;
    }
    
    // Sécuriser le chemin (doit être dans tmp)
    $tmpPath = realpath(__DIR__ . DIRECTORY_SEPARATOR . 'tmp' . DIRECTORY_SEPARATOR . $filename);
    $tmpDir = realpath(__DIR__ . DIRECTORY_SEPARATOR . 'tmp');
    
    if (!$tmpPath || !$tmpDir || strpos($tmpPath, $tmpDir) !== 0 || !is_file($tmpPath)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Fichier tmp introuvable ou non autorisé']);
        exit;
    }
    
    // Déplacer vers photos
    $photosDir = __DIR__ . DIRECTORY_SEPARATOR . 'photos';
    if (!is_dir($photosDir)) {
        mkdir($photosDir, 0755, true);
    }
    
    $photoPath = $photosDir . DIRECTORY_SEPARATOR . $filename;
    if (rename($tmpPath, $photoPath)) {
        echo json_encode([
            'ok' => true,
            'message' => 'Photo acceptée et sauvegardée'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Impossible de déplacer la photo']);
    }
    exit;
}

if ($action === 'reject') {
    $filename = $input['filename'] ?? '';
    
    if (!$filename) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Filename manquant']);
        exit;
    }
    
    // Sécuriser le chemin (doit être dans tmp)
    $tmpPath = realpath(__DIR__ . DIRECTORY_SEPARATOR . 'tmp' . DIRECTORY_SEPARATOR . $filename);
    $tmpDir = realpath(__DIR__ . DIRECTORY_SEPARATOR . 'tmp');
    
    if (!$tmpPath || !$tmpDir || strpos($tmpPath, $tmpDir) !== 0 || !is_file($tmpPath)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Fichier tmp introuvable ou non autorisé']);
        exit;
    }
    
    // Supprimer le fichier
    if (unlink($tmpPath)) {
        echo json_encode([
            'ok' => true,
            'message' => 'Photo rejetée et supprimée'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Impossible de supprimer la photo']);
    }
    exit;
}

if ($action === 'print') {
    $photo = $input['photo'] ?? '';
    $copies = isset($input['copies']) ? (int)$input['copies'] : 1;
    if ($copies < 1) $copies = 1;
    if ($copies > 3) $copies = 3;

    if (!$photo) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Photo manquante']);
        exit;
    }

    // Sécuriser le chemin (doit être dans /photos)
    $photoPath = realpath(__DIR__ . DIRECTORY_SEPARATOR . $photo);
    $photosDir = realpath(__DIR__ . DIRECTORY_SEPARATOR . 'photos');
    if (!$photoPath || !$photosDir || strpos($photoPath, $photosDir) !== 0 || !is_file($photoPath)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Photo introuvable ou non autorisée']);
        exit;
    }

    // Script d'impression local
    $scriptPath = __DIR__ . DIRECTORY_SEPARATOR . 'print_photo.sh';
    if (!is_file($scriptPath)) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Script print_photo.sh introuvable']);
        exit;
    }

    $cmd = sprintf(
        'sudo %s %s %d 2>&1',
        escapeshellarg($scriptPath),
        escapeshellarg($photoPath),
        $copies
    );

    $output = shell_exec($cmd);
    if ($output === null) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => "Échec de l'exécution du script"]);
        exit;
    }

    echo json_encode([
        'ok' => true,
        'message' => trim($output)
    ]);
    exit;
}

http_response_code(400);
echo json_encode(['ok' => false, 'error' => 'Action inconnue']);
?>