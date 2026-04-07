<?php
// api/student.php
// Handles Student Exams & Results

$user = verifySession('Student');

if ($route === 'exam-questions' && $param1) {
    if ($method === 'GET') {
        $exam_id = (int)$param1;
        
        $stmt = $pdo->prepare("SELECT e.*, s.subject_name FROM exams e LEFT JOIN subjects s ON e.subject_id = s.id WHERE e.id = ?");
        $stmt->execute([$exam_id]);
        $exam = $stmt->fetch();

        if (!$exam) {
            http_response_code(404);
            echo json_encode(['error' => 'Exam not found']);
            exit();
        }

        $now = new DateTime();
        $todayStr = $now->format('Y-m-d');
        $nowTime = $now->format('H:i');

        if ($exam['exam_date']) {
            if ($todayStr < $exam['exam_date']) {
                http_response_code(403);
                echo json_encode(['error' => 'Exam scheduled for ' . $exam['exam_date'] . '. Come back later.']);
                exit();
            }
            if ($todayStr > $exam['exam_date']) {
                http_response_code(403);
                echo json_encode(['error' => 'Exam was on ' . $exam['exam_date'] . '. Period ended.']);
                exit();
            }
        }
        
        if ($exam['start_time'] && $nowTime < substr($exam['start_time'], 0, 5)) {
            http_response_code(403);
            echo json_encode(['error' => 'Exam starts at ' . $exam['start_time'] . '. Wait.']);
            exit();
        }
        
        if ($exam['end_time'] && $nowTime > substr($exam['end_time'], 0, 5)) {
            http_response_code(403);
            echo json_encode(['error' => 'Exam ended at ' . $exam['end_time']]);
            exit();
        }

        $chk = $pdo->prepare("SELECT id FROM results WHERE student_id = ? AND exam_id = ?");
        $chk->execute([$user['id'], $exam_id]);
        if ($chk->fetch()) {
            http_response_code(403);
            echo json_encode(['error' => 'You already submitted this exam.']);
            exit();
        }

        $qStmt = $pdo->prepare("SELECT id, question, option1, option2, option3, option4, marks FROM questions WHERE exam_id = ?");
        $qStmt->execute([$exam_id]);
        $questions = $qStmt->fetchAll();

        shuffle($questions);
        if ($exam['total_questions'] > 0 && count($questions) > $exam['total_questions']) {
            $questions = array_slice($questions, 0, $exam['total_questions']);
        }

        echo json_encode([
            'time_limit' => $exam['time_limit'],
            'exam_name' => $exam['name'],
            'subject_name' => $exam['subject_name'] ?? 'General',
            'questions' => $questions
        ]);
        exit();
    }
}

if ($route === 'submit' && $method === 'POST') {
    $answers = $body['answers'] ?? [];
    $exam_id = (int)($body['exam_id'] ?? 0);
    $score = 0;

    $qStmt = $pdo->prepare("SELECT id, correct_answer, marks FROM questions WHERE exam_id = ?");
    $qStmt->execute([$exam_id]);
    $questions = $qStmt->fetchAll();

    $totalExamMarks = 0;
    $qMap = [];
    foreach ($questions as $q) {
        $qMap[$q['id']] = ['correct' => $q['correct_answer'], 'marks' => $q['marks']];
        $totalExamMarks += $q['marks'];
    }

    foreach ($answers as $qId => $ans) {
        if (isset($qMap[$qId]) && $qMap[$qId]['correct'] === $ans) {
            $score += $qMap[$qId]['marks'];
        }
    }

    $ins = $pdo->prepare("INSERT INTO results (student_id, exam_id, score, total_marks) VALUES (?, ?, ?, ?)");
    $ins->execute([$user['id'], $exam_id, $score, $totalExamMarks]);
    $result_id = $pdo->lastInsertId();

    $del = $pdo->prepare("DELETE FROM proctor_status WHERE student_id = ? AND exam_id = ?");
    $del->execute([$user['id'], $exam_id]);

    // Send email (optional for InfinityFree, depending on mail limit)
    if (!empty($user['email'])) {
        $exm = $pdo->prepare("SELECT name FROM exams WHERE id = ?");
        $exm->execute([$exam_id]);
        $examName = $exm->fetchColumn() ?: 'Examination';

        $pct = $totalExamMarks > 0 ? round(($score / $totalExamMarks) * 100) : 0;
        $status = $pct >= 40 ? '✅ PASS' : '❌ FAIL';
        
        $to = $user['email'];
        $subject = "Result: $examName — AGMR College";
        $message = "<div style='font-family:Arial;max-width:500px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:12px;'>
            <h2 style='color:#2f56c8;'>AGMR College</h2><h3>$examName</h3>
            <p>Dear <strong>{$user['name']}</strong>,</p>
            <table style='width:100%;border-collapse:collapse;'>
            <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Score</td><td style='padding:8px;border:1px solid #ddd;'>$score/$totalExamMarks</td></tr>
            <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Percentage</td><td style='padding:8px;border:1px solid #ddd;'>$pct%</td></tr>
            <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Status</td><td style='padding:8px;border:1px solid #ddd;'>$status</td></tr>
            </table></div>";

        $headers = "MIME-Version: 1.0\r\nContent-type: text/html; charset=UTF-8\r\nFrom: AGMR Exam System <noreply@exam-system.com>\r\n";
        @mail($to, $subject, $message, $headers);
    }

    echo json_encode(['success' => true, 'score' => $score, 'total_marks' => $totalExamMarks, 'result_id' => $result_id]);
    exit();
}

if ($route === 'my-results' && $method === 'GET') {
    $stmt = $pdo->prepare("SELECT r.id, r.score, r.total_marks, r.exam_date, r.exam_id, e.name as exam_name, s.subject_name 
                            FROM results r 
                            LEFT JOIN exams e ON r.exam_id = e.id 
                            LEFT JOIN subjects s ON e.subject_id = s.id 
                            WHERE r.student_id = ? ORDER BY r.exam_date DESC");
    $stmt->execute([$user['id']]);
    $results = $stmt->fetchAll();

    $formatted = array_map(function($r) {
        return [
            'id' => $r['id'],
            'score' => $r['score'],
            'total_marks' => $r['total_marks'],
            'exam_date' => $r['exam_date'],
            'exam_id' => $r['exam_id'],
            'exams' => [
                'exam_name' => $r['exam_name'],
                'subjects' => [
                    'subject_name' => $r['subject_name']
                ]
            ]
        ];
    }, $results);

    echo json_encode($formatted);
    exit();
}

if ($route === 'proctor-status' && $method === 'POST') {
    $exam_id = $body['exam_id'] ?? 0;
    $status = $body['status'] ?? 'active';
    $warnings = $body['warnings'] ?? 0;

    $pdo->prepare("DELETE FROM proctor_status WHERE student_id = ? AND exam_id = ?")->execute([$user['id'], $exam_id]);
    $ins = $pdo->prepare("INSERT INTO proctor_status (student_id, exam_id, status, warnings) VALUES (?, ?, ?, ?)");
    $ins->execute([$user['id'], $exam_id, $status, $warnings]);

    echo json_encode(['success' => true]);
    exit();
}

if ($route === 'proctor-status' && $method === 'GET') {
    // Override verify for admin if they call GET
    $admin = verifySession('Admin');
    $stmt = $pdo->query("SELECT p.*, s.name, s.username, s.usn FROM proctor_status p JOIN students s ON p.student_id = s.id ORDER BY p.last_update DESC");
    echo json_encode($stmt->fetchAll());
    exit();
}
?>
