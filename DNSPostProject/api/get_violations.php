<?php
// api/get_violations.php
// Fetches the violations.json datastore for the Admin Dashboard
header('Content-Type: application/json');

$dataFile = '../violations.json';

if (!file_exists($dataFile)) {
    echo json_encode(['success' => true, 'violations' => []]);
    exit;
}

$contents = file_get_contents($dataFile);
$violations = json_decode($contents, true);

if ($violations === null) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not parse violations data.']);
    exit;
}

echo json_encode(['success' => true, 'violations' => $violations]);
?>
