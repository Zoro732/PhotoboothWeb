<?php
// Point d'entrée unique : capture et impression
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
    $cmd = 'gphoto2 --capture-image-and-download --filename=/var/www/html/photos/%d-%m-%Y_%H-%M-%S.%C';
    $output = shell_exec("sudo $cmd 2>&1");
    echo json_encode([
        'ok' => true,
        'message' => trim((string)$output)
    ]);
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