<?php
// api/db.php
// InfinityFree MySQL Database Connection
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Update these with actual InfinityFree database credentials
$host = 'localhost';
$dbname = 'online_exam_db'; // Change to actual InfinityFree DB Name (e.g., epiz_12345678_db)
$username = 'root';         // Change to actual InfinityFree Username
$password = '';             // Change to actual InfinityFree Password

try {
    // Attempt MySQL Connection First
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    // FALLBACK TO SQLITE FOR LOCAL TESTING
    $sqlitePath = __DIR__ . '/../database.sqlite';
    if (file_exists($sqlitePath)) {
        try {
            $pdo = new PDO("sqlite:" . $sqlitePath);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $ex) {
            echo json_encode(['error' => 'Database connection failed for both MySQL and SQLite: ' . $ex->getMessage()]);
            exit();
        }
    } else {
        echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
        exit();
    }
}

// Helper to check session
function verifySession($requiredRole = null) {
    global $pdo;

    // Check cookie
    $token = isset($_COOKIE['token']) ? $_COOKIE['token'] : null;
    
    // Also check Bearer token if cookie is not set
    if (!$token && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'];
        if (preg_match('/Bearer\s(\S+)/', $auth, $matches)) {
            $token = $matches[1];
        }
    }

    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized: No token']);
        exit();
    }

    $stmt = $pdo->prepare("SELECT * FROM sessions WHERE token = ?");
    $stmt->execute([$token]);
    $session = $stmt->fetch();

    if (!$session) {
        http_response_code(401);
        echo json_encode(['error' => 'Session Invalid']);
        exit();
    }

    $stmt = $pdo->prepare("SELECT id, role, name, email, usn, username FROM students WHERE username = ?");
    $stmt->execute([$session['username']]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'User not found']);
        exit();
    }

    if ($requiredRole && $user['role'] !== $requiredRole) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden: Requires ' . $requiredRole . ' role']);
        exit();
    }

    return $user;
}
?>
