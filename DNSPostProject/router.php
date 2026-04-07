<?php
// router.php
// A simple routing script for PHP built-in web server.
// Usage: php -S localhost:8000 router.php

$method = $_SERVER['REQUEST_METHOD'];
$uriParam = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Normalize URI
$uriStr = rtrim($uriParam, '/');
if (empty($uriStr)) {
    $uriStr = '/';
}

// 1. API routes mapping to api/index.php
if (preg_match('#^/api/(.*)$#', $uriStr, $matches)) {
    $_GET['request'] = $matches[1];
    require_once __DIR__ . '/api/index.php';
    return true; // Request handled
}

// 2. Frontend routes mapping to static HTML files
$routes = [
    '/login' => '/public/index.html',
    '/student/dashboard' => '/public/student.html',
    '/instructor/dashboard' => '/public/admin.html',
    '/student' => '/public/student.html',
    '/exam' => '/public/exam.html',
    '/result' => '/public/result.html',
    '/admin' => '/public/admin.html',
    '/create-exam' => '/public/create-exam.html',
    '/results' => '/public/results.html',
    '/' => '/public/index.html',
];

if (array_key_exists($uriStr, $routes)) {
    include __DIR__ . $routes[$uriStr];
    return true; // Request handled
}

// 3. Serve other static files directly from /public directory
// Translate URI to actual file path
$filePath = __DIR__ . '/public' . $uriStr;

if (file_exists($filePath) && is_file($filePath)) {
    $pathInfo = pathinfo($filePath);
    $ext = isset($pathInfo['extension']) ? strtolower($pathInfo['extension']) : '';

    $mime_types = [
        'css' => 'text/css',
        'js' => 'application/javascript',
        'html' => 'text/html',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
        'json' => 'application/json'
    ];

    if (isset($mime_types[$ext])) {
        header('Content-Type: ' . $mime_types[$ext]);
    }
    
    readfile($filePath);
    return true;
}

// 4. Default fallback
http_response_code(404);
echo "404 Not Found";
return true;
