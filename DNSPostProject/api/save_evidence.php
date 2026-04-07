<?php
// api/save_evidence.php
// Production-ready evidence capture API for SAAS Proctoring
header('Content-Type: application/json');

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// Read the incoming JSON payload (screenshot, user id, reason, etc)
$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true);

if (!isset($data['userId']) || !isset($data['reason'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing critical violation data']);
    exit;
}

// Structure the violation log
$violation = [
    'id' => uniqid('v_'),
    'userId' => $data['userId'],
    'examId' => $data['examId'] ?? 'unknown',
    'type' => $data['type'] ?? 'GENERAL',
    'reason' => $data['reason'],
    'timestamp' => $data['timestamp'] ?? date('c'),
    'image' => $data['image'] ?? null // Base64 screenshot
];

// Filepath for JSON storage (acts as the lightweight database for InfinityFree)
$dataFile = '../violations.json';

// Read existing or create new array
$currentData = [];
if (file_exists($dataFile)) {
    $currentData = json_decode(file_get_contents($dataFile), true) ?? [];
}

// Prepend the newest violation (so it appears at the top of the admin dash)
array_unshift($currentData, $violation);

// Keep only the last 500 violations to prevent .json bloat
if (count($currentData) > 500) {
    array_pop($currentData);
}

// Write safely back to the disk
if (file_put_contents($dataFile, json_encode($currentData, JSON_PRETTY_PRINT))) {
    echo json_encode(['success' => true, 'message' => 'Evidence successfully recorded.']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to write to violations datastore.']);
}
?>
