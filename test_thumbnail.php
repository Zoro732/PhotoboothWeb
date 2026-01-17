<?php
// Test si l'extension GD est disponible

echo "PHP Version: " . PHP_VERSION . "\n";
echo "GD Extension: " . (extension_loaded('gd') ? 'OK' : 'NOT AVAILABLE') . "\n";

if (extension_loaded('gd')) {
    $info = gd_info();
    echo "GD Version: " . $info['GD Version'] . "\n";
    echo "JPEG Support: " . ($info['JPEG Support'] ? 'YES' : 'NO') . "\n";
    echo "PNG Support: " . ($info['PNG Support'] ? 'YES' : 'NO') . "\n";
    echo "GIF Support: " . ($info['GIF Create Support'] ? 'YES' : 'NO') . "\n";
    echo "WebP Support: " . ($info['WebP Support'] ?? 'NO') . "\n";
}

echo "\nTesting thumbnail generation...\n";

// Tester avec la première photo disponible
$photoDir = __DIR__ . DIRECTORY_SEPARATOR . 'photos';
$files = glob($photoDir . DIRECTORY_SEPARATOR . '*.{jpg,jpeg,JPG,JPEG}', GLOB_BRACE);

if (empty($files)) {
    echo "ERROR: No photos found in photos directory\n";
    exit;
}

$testFile = basename($files[0]);
echo "Test file: " . $testFile . "\n";

// Simuler une requête
$_GET['file'] = $testFile;
$_GET['w'] = '480';

echo "\nIncluding thumbnail.php...\n";
ob_start();
include 'thumbnail.php';
$output = ob_get_clean();

if ($output && strpos($output, 'Error') === false) {
    echo "SUCCESS: Thumbnail generated\n";
} else {
    echo "ERROR: " . $output . "\n";
}
