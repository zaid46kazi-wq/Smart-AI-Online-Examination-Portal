<?php
// api/index.php
// Main API Router for InfinityFree PHP Backend

require_once 'db.php';

$request = isset($_GET['request']) ? $_GET['request'] : '';
$method = $_SERVER['REQUEST_METHOD'];

// Parse JSON Body
$json_body = file_get_contents('php://input');
$body = json_decode($json_body, true) ?? [];
if (empty($body) && !empty($_POST)) {
    $body = $_POST;
}

// Extract path and variables (e.g. exam-questions/5)
$parts = explode('/', trim($request, '/'));
$route = $parts[0];
$param1 = isset($parts[1]) ? $parts[1] : null;
$param2 = isset($parts[2]) ? $parts[2] : null;

switch ($route) {
    // Auth Routes
    case 'login':
    case 'logout':
    case 'send-otp':
    case 'verify-otp':
        require_once 'auth.php';
        break;

    // Admin Routes
    case 'subjects':
    case 'students':
    case 'questions':
    case 'results':
    case 'analytics':
        require_once 'admin.php';
        break;

    // Mixed & Params Routes
    case 'exams':
        if ($method === 'GET' && !isset($_COOKIE['token'])) {
             // Let it fail in auth check
             require_once 'admin.php';
        } else {
             require_once 'admin.php'; 
        }
        break;

    // Student Routes
    case 'exam-questions':
    case 'submit':
    case 'my-results':
    case 'proctor-status':
        require_once 'student.php';
        break;

    // Shared / Extras
    case 'rank-list':
    case 'leaderboard':
    case 'result-pdf':
    case 'hall-ticket':
        require_once 'shared.php';
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'API route not found: ' . $route]);
        break;
}
?>
