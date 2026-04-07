<?php
// api/auth.php
// Handles login, logout, send-otp, verify-otp

$route = $parts[0] ?? '';

if ($route === 'login' && $method === 'POST') {
    $username = $body['username'] ?? '';
    $password = $body['password'] ?? '';
    $role = $body['role'] ?? '';

    $stmt = $pdo->prepare("SELECT role, email FROM students WHERE username = ? AND password = ? AND role = ?");
    $stmt->execute([$username, $password, $role]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
        exit();
    }

    $token = bin2hex(random_bytes(32));
    $ip = $_SERVER['REMOTE_ADDR'];

    // Delete old sessions
    $del = $pdo->prepare("DELETE FROM sessions WHERE username = ?");
    $del->execute([$username]);

    // Insert new session
    $ins = $pdo->prepare("INSERT INTO sessions (username, token, ipaddress) VALUES (?, ?, ?)");
    $ins->execute([$username, $token, $ip]);

    // Set cookies
    setcookie('user', $username, time() + 86400, '/');
    setcookie('role', $user['role'], time() + 86400, '/');
    setcookie('token', $token, [
        'expires' => time() + 86400,
        'path' => '/',
        'samesite' => 'Lax',
        'httponly' => true
    ]);

    echo json_encode(['success' => true, 'role' => $user['role'], 'username' => $username, 'token' => $token]);
    exit();
}

if ($route === 'logout' && $method === 'POST') {
    $token = $_COOKIE['token'] ?? '';
    if ($token) {
        $del = $pdo->prepare("DELETE FROM sessions WHERE token = ?");
        $del->execute([$token]);
    }
    setcookie('user', '', time() - 3600, '/');
    setcookie('role', '', time() - 3600, '/');
    setcookie('token', '', time() - 3600, '/');
    echo json_encode(['success' => true]);
    exit();
}
// OTP APIs removed per strict instruction to delete new auth service
?>
