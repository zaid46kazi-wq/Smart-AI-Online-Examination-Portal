<?php
// api/shared.php
// Handles Rank List, Leaderboard, and PDF Generation (HTML Print)

$user = verifySession(); // Requires at least student or admin for all these endpoints

if ($route === 'rank-list' && $param1) {
    if ($method === 'GET') {
        $exam_id = (int)$param1;
        
        $stmt = $pdo->prepare("SELECT r.score, r.total_marks, s.name, s.username, s.usn FROM results r JOIN students s ON r.student_id = s.id WHERE r.exam_id = ? ORDER BY r.score DESC");
        $stmt->execute([$exam_id]);
        $data = $stmt->fetchAll();

        $ranked = [];
        foreach ($data as $i => $r) {
            $ranked[] = [
                'rank' => $i + 1,
                'name' => $r['name'] ?: $r['username'],
                'usn' => $r['usn'],
                'score' => $r['score'],
                'totalMarks' => $r['total_marks']
            ];
        }
        echo json_encode($ranked);
        exit();
    }
}

if ($route === 'leaderboard') {
    if ($method === 'GET') {
        // Group by student and find max
        $stmt = $pdo->query("SELECT r.score, s.name, s.username FROM results r JOIN students s ON r.student_id = s.id ORDER BY r.score DESC");
        $data = $stmt->fetchAll();

        $map = [];
        foreach ($data as $r) {
            $name = $r['name'] ?: $r['username'];
            if (!isset($map[$name]) || $r['score'] > $map[$name]) {
                $map[$name] = $r['score'];
            }
        }
        arsort($map);
        $leaders = array_slice($map, 0, 5, true);

        $result = [];
        foreach ($leaders as $uname => $score) {
            $result[] = ['Username' => $uname, 'Score' => $score];
        }
        echo json_encode($result);
        exit();
    }
}

if ($route === 'result-pdf' && $param1) {
    if ($method === 'GET') {
        $result_id = (int)$param1;
        $stmt = $pdo->prepare("SELECT r.*, s.name, s.usn, s.username, e.name as exam_name, sub.subject_name 
                                FROM results r 
                                JOIN students s ON r.student_id = s.id 
                                JOIN exams e ON r.exam_id = e.id 
                                LEFT JOIN subjects sub ON e.subject_id = sub.id 
                                WHERE r.id = ?");
        $stmt->execute([$result_id]);
        $data = $stmt->fetch();

        if (!$data) {
            http_response_code(404);
            echo "Result not found";
            exit();
        }

        $sName = $data['name'] ?: $data['username'];
        $pct = $data['total_marks'] > 0 ? round(($data['score'] / $data['total_marks']) * 100) : 0;
        $status = $pct >= 40 ? 'PASS' : 'FAIL';
        $subName = $data['subject_name'] ?: 'General';
        $date = date('d F Y', strtotime($data['exam_date']));
        $generated = date('d/m/Y H:i A');

        // Instead of pure PDF binary (which needs FPDF), we return an HTML view rigged nicely to print as PDF
        header('Content-Type: text/html');
        echo <<<HTML
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Result: {$data['exam_name']}</title>
            <style>
                body { font-family: Helvetica, Arial, sans-serif; color: #000; margin: 0; padding: 40px; }
                .container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .center { text-align: center; }
                h1 { color: #2f56c8; margin-bottom: 5px; }
                h2 { color: #2f56c8; margin-top: 30px; letter-spacing: 2px; }
                hr { border: 0; height: 1px; background: #2f56c8; margin: 20px 0; }
                table { width: 100%; margin-top: 30px; border-collapse: collapse; }
                td { padding: 12px 0; font-size: 16px; border-bottom: 1px dashed #eee; }
                .label { font-weight: bold; width: 40%; color: #444; }
                .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
                @media print {
                    .container { border: none; box-shadow: none; padding: 0; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body onload="window.print();">
            <div class="container">
                <div class="center">
                    <h1>AGMR College of Engineering</h1>
                    <div style="font-size: 14px; color: #555;">(Affiliated to VTU, Approved by AICTE)</div>
                </div>
                <hr>
                <div class="center">
                    <h2>EXAMINATION RESULT CERTIFICATE</h2>
                </div>
                <table>
                    <tr><td class="label">Student Name:</td><td>{$sName}</td></tr>
                    <tr><td class="label">USN:</td><td>{$data['usn']}</td></tr>
                    <tr><td class="label">Exam Name:</td><td>{$data['exam_name']}</td></tr>
                    <tr><td class="label">Subject:</td><td>{$subName}</td></tr>
                    <tr><td class="label">Score:</td><td><strong>{$data['score']} / {$data['total_marks']}</strong></td></tr>
                    <tr><td class="label">Percentage:</td><td>{$pct}%</td></tr>
                    <tr><td class="label">Status:</td><td><strong>{$status}</strong></td></tr>
                    <tr><td class="label">Date:</td><td>{$date}</td></tr>
                </table>
                <div class="footer">
                    Computer-generated document. No signature required.<br>
                    Generated: {$generated}<br>
                    Developer: Sayed Zaid Kazi
                </div>
            </div>
        </body>
        </html>
        HTML;
        exit();
    }
}

if ($route === 'hall-ticket' && $param1) {
    if ($method === 'GET') {
        $exam_id = (int)$param1;
        $stmt = $pdo->prepare("SELECT e.*, sub.subject_name, sub.subject_code FROM exams e LEFT JOIN subjects sub ON e.subject_id = sub.id WHERE e.id = ?");
        $stmt->execute([$exam_id]);
        $exam = $stmt->fetch();

        if (!$exam) {
            http_response_code(404);
            echo "Exam not found";
            exit();
        }

        $sName = $user['name'] ?: $user['username'];
        $subject = $exam['subject_code'] ? "{$exam['subject_code']} - {$exam['subject_name']}" : ($exam['subject_name'] ?: 'General');

        header('Content-Type: text/html');
        echo <<<HTML
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Hall Ticket: {$exam['name']}</title>
            <style>
                body { font-family: Helvetica, Arial, sans-serif; color: #000; margin: 0; padding: 40px; }
                .container { max-width: 800px; margin: 0 auto; border: 2px solid #2f56c8; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .center { text-align: center; }
                h1 { color: #2f56c8; margin-bottom: 5px; }
                h2 { color: #2f56c8; margin-top: 30px; letter-spacing: 2px; }
                hr { border: 0; height: 1px; background: #2f56c8; margin: 20px 0; }
                table { width: 100%; margin-top: 20px; border-collapse: collapse; }
                td { padding: 12px 0; font-size: 16px; border-bottom: 1px dashed #eee; }
                .label { font-weight: bold; width: 40%; color: #444; }
                .instructions { margin-top: 40px; background: #f9f9f9; padding: 20px; border-left: 4px solid #2f56c8; }
                .instructions h3 { margin-top: 0; color: #2f56c8; }
                .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
                @media print {
                    .container { border: none; box-shadow: none; padding: 0; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body onload="window.print();">
            <div class="container">
                <div class="center">
                    <h1>AGMR College of Engineering</h1>
                    <div style="font-size: 14px; color: #555;">(Affiliated to VTU, Approved by AICTE)</div>
                </div>
                <hr>
                <div class="center">
                    <h2>EXAMINATION HALL TICKET</h2>
                </div>
                <table>
                    <tr><td class="label">Student Name:</td><td>{$sName}</td></tr>
                    <tr><td class="label">USN:</td><td>{$user['usn']}</td></tr>
                    <tr><td class="label">Subject:</td><td>{$subject}</td></tr>
                    <tr><td class="label">Exam Name:</td><td>{$exam['name']}</td></tr>
                    <tr><td class="label">Exam Date:</td><td>{$exam['exam_date']}</td></tr>
                    <tr><td class="label">Time:</td><td>{$exam['start_time']} - {$exam['end_time']}</td></tr>
                    <tr><td class="label">Duration:</td><td>{$exam['time_limit']} Minutes</td></tr>
                </table>
                <div class="instructions">
                    <h3>Important Instructions:</h3>
                    1. Keep this hall ticket accessible during the exam.<br><br>
                    2. Webcam must remain enabled for AI Monitoring.<br><br>
                    3. Tab switching triggers strict warnings.<br><br>
                    4. Max 2 warnings before automatic submission.<br><br>
                    5. No external resources allowed.
                </div>
                <div class="footer">
                    Computer-generated hall ticket.<br>Developer: Sayed Zaid Kazi
                </div>
            </div>
        </body>
        </html>
        HTML;
        exit();
    }
}
?>
