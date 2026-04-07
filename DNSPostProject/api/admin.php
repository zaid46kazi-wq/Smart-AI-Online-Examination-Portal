<?php
// api/admin.php
// Handles Admin Panel APIs

$user = verifySession('Admin');

if ($route === 'subjects') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM subjects ORDER BY id ASC");
        echo json_encode($stmt->fetchAll());
        exit();
    }
    if ($method === 'POST') {
        $stmt = $pdo->prepare("INSERT INTO subjects (subject_name, subject_code) VALUES (?, ?)");
        $stmt->execute([$body['subject_name'] ?? '', $body['subject_code'] ?? '']);
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        exit();
    }
}

if ($route === 'exams') {
    if ($method === 'GET') {
        // GET exams allows Auth (Students and Admin)
        $sessionUser = verifySession(); 
        $stmt = $pdo->query("SELECT e.*, s.subject_name, s.subject_code FROM exams e LEFT JOIN subjects s ON e.subject_id = s.id ORDER BY e.id DESC");
        $exams = $stmt->fetchAll();
        foreach ($exams as &$e) {
            $e['exam_name'] = $e['name']; // Map name to exam_name for frontend compat
            $e['subjects'] = ['subject_name' => $e['subject_name'], 'subject_code' => $e['subject_code']];
        }
        echo json_encode($exams);
        exit();
    }
    if ($method === 'POST') {
        $name = $body['exam_name'] ?? '';
        $subject_id = $body['subject_id'] ?? 0;
        $total_questions = $body['total_questions'] ?? 0;
        $total_marks = $body['total_marks'] ?? 0;
        $time_limit = $body['time_limit'] ?? 30;
        $exam_date = $body['exam_date'] ?? date('Y-m-d');
        $start_time = $body['start_time'] ?? '00:00';
        $end_time = $body['end_time'] ?? '23:59';
        $questions = $body['questions'] ?? [];

        if (!$name || !$subject_id || !$time_limit) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: exam_name, subject_id, time_limit']);
            exit();
        }

        $stmt = $pdo->prepare("INSERT INTO exams (name, subject_id, total_questions, total_marks, time_limit, exam_date, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$name, $subject_id, $total_questions, $total_marks, $time_limit, $exam_date, $start_time, $end_time]);
        $exam_id = $pdo->lastInsertId();

        if (count($questions) > 0) {
            $qStmt = $pdo->prepare("INSERT INTO questions (exam_id, question, option1, option2, option3, option4, correct_answer, marks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($questions as $q) {
                $qStmt->execute([
                    $exam_id,
                    $q['question'],
                    $q['option1'], $q['option2'], $q['option3'], $q['option4'],
                    $q['correct_answer'],
                    $q['marks'] ?? 1
                ]);
            }
        }

        echo json_encode(['success' => true, 'id' => $exam_id]);
        exit();
    }
}

if ($route === 'questions' && $param1 === 'upload' && $param2) {
    if ($method === 'POST') {
        // Handling file upload - assuming basic CSV since native Excel needs library.
        // Frontend supports .xlsx, but we will accept CSV for this pure PHP rebuild,
        // or one can install PhpSpreadsheet on infinityfree.
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['error' => 'No file uploaded or upload error']);
            exit();
        }

        $exam_id = $param2;
        $file = $_FILES['file']['tmp_name'];
        $ext = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));

        // For absolute robustness without external libraries, we suggest frontend sends CSV or JSON.
        // If it's a CSV file:
        if ($ext === 'csv') {
            $rows = array_map('str_getcsv', file($file));
            $header = array_shift($rows);
            $count = 0;
            $totalMarks = 0;
            
            $qStmt = $pdo->prepare("INSERT INTO questions (exam_id, question, option1, option2, option3, option4, correct_answer, marks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($rows as $row) {
                if (count($row) < 7) continue;
                // Assuming format: Question, Option A, Option B, Option C, Option D, Correct Answer, Marks
                $marks = isset($row[6]) ? (int)$row[6] : 1;
                $totalMarks += $marks;
                $qStmt->execute([
                    $exam_id,
                    $row[0], $row[1], $row[2], $row[3], $row[4], $row[5], $marks
                ]);
                $count++;
            }
            
            $pdo->prepare("UPDATE exams SET total_questions = ?, total_marks = ? WHERE id = ?")->execute([$count, $totalMarks, $exam_id]);
            echo json_encode(['success' => true, 'count' => $count]);
            exit();
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Please upload a CSV file instead of Excel for the PHP version. Or install PhpSpreadsheet.']);
            exit();
        }
    }
}

if ($route === 'questions' && $param1 === 'generate-ai') {
    if ($method === 'POST') {
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['error' => 'No PDF file uploaded']);
            exit();
        }

        $exam_id = $_POST['exam_id'] ?? null;
        $count = $_POST['count'] ?? 10;
        if (!$exam_id) {
            http_response_code(400);
            echo json_encode(['error' => 'Exam ID missing']);
            exit();
        }
        
        $ext = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
        if ($ext !== 'pdf' && $_FILES['file']['type'] !== 'application/pdf') {
            http_response_code(400);
            echo json_encode(['error' => 'File must be PDF']);
            exit();
        }

        $apiKey = getenv('GEMINI_API_KEY');
        if (!$apiKey) {
            // For testing/fallback
            $apiKey = 'AIzaSyByTmWpeB03nQw-nwEbN2mSnza8k2LU1U0';
        }

        $pdfBase64 = base64_encode(file_get_contents($_FILES['file']['tmp_name']));
        $promptText = "You are an AI Question Generator. Read the provided PDF document and generate exactly " . (int)$count . " multiple-choice questions based on its content.\n";
        $promptText .= "Return ONLY a strictly valid JSON array of objects with keys: \"question\" (string), \"option1\" (string), \"option2\" (string), \"option3\" (string), \"option4\" (string), \"correct_answer\" (string: exactly \"A\", \"B\", \"C\", or \"D\"). Your response MUST be ONLY the raw JSON array, without markdown formatting.";

        $data = [
            "contents" => [
                [
                    "parts" => [
                        ["text" => $promptText],
                        [
                            "inlineData" => [
                                "mimeType" => "application/pdf",
                                "data" => $pdfBase64
                            ]
                        ]
                    ]
                ]
            ],
            "generationConfig" => [
               "responseMimeType" => "application/json"
            ]
        ];

        // Call Gemini API via cURL
        $ch = curl_init("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $apiKey);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            http_response_code(500);
            echo json_encode(['error' => 'cURL Error: ' . $err]);
            exit();
        }

        $resData = json_decode($response, true);
        if (isset($resData['error'])) {
            http_response_code(500);
            echo json_encode(['error' => 'Gemini API Error: ' . ($resData['error']['message'] ?? json_encode($resData['error']))]);
            exit();
        }

        $textResponse = $resData['candidates'][0]['content']['parts'][0]['text'] ?? '';
        
        $textResponse = trim($textResponse);
        $textResponse = preg_replace('/^```(?:json)?\s*/i', '', $textResponse);
        $textResponse = preg_replace('/\s*```$/i', '', $textResponse);
        
        $questions = json_decode($textResponse, true);
        if (!is_array($questions)) {
            http_response_code(500);
            echo json_encode(['error' => 'AI returned invalid JSON: ' . $textResponse]);
            exit();
        }

        $inserted = 0;
        $totalMarks = 0;
        $qStmt = $pdo->prepare("INSERT INTO questions (exam_id, question, option1, option2, option3, option4, correct_answer, marks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

        foreach ($questions as $q) {
            if ($inserted >= (int)$count) break;
            $marks = 1;
            $totalMarks += $marks;

            $questionText = ($inserted + 1) . ". " . preg_replace('/^\d+\.\s*/', '', $q['question'] ?? 'Untitled');
            
            $qStmt->execute([
                $exam_id,
                $questionText,
                $q['option1'] ?? '',
                $q['option2'] ?? '',
                $q['option3'] ?? '',
                $q['option4'] ?? '',
                $q['correct_answer'] ?? 'A',
                $marks
            ]);
            $inserted++;
        }

        // Update Exam totals
        $pdo->prepare("UPDATE exams SET total_questions = total_questions + ?, total_marks = total_marks + ? WHERE id = ?")->execute([$inserted, $totalMarks, $exam_id]);

        echo json_encode(['success' => true, 'count' => $inserted]);
        exit();
    }
}

if ($route === 'students') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT id, username, name, usn, email, role FROM students WHERE role = 'Student' ORDER BY id");
        echo json_encode($stmt->fetchAll());
        exit();
    }
    if ($method === 'POST') {
        if ($param1 === 'import') {
            // Import Students Logic (similar to questions, require CSV)
            if (!isset($_FILES['file'])) {
                http_response_code(400);
                echo json_encode(['error' => 'No file uploaded']);
                exit();
            }
            $file = $_FILES['file']['tmp_name'];
            $rows = array_map('str_getcsv', file($file));
            array_shift($rows); // header
            $inserted = 0;
            $stmt = $pdo->prepare("INSERT IGNORE INTO students (name, usn, email, username, password, role) VALUES (?, ?, ?, ?, ?, 'Student')");
            foreach ($rows as $r) {
                if (count($r) < 3) continue;
                $stmt->execute([$r[0], $r[1], $r[2], $r[1], 'pass123']);
                $inserted += $stmt->rowCount();
            }
            echo json_encode(['success' => true, 'inserted' => $inserted]);
            exit();
        } else {
            $stmt = $pdo->prepare("INSERT INTO students (name, usn, email, username, password, role) VALUES (?, ?, ?, ?, ?, 'Student')");
            $stmt->execute([
                $body['name'] ?? '',
                $body['usn'] ?? '',
                $body['email'] ?? '',
                $body['username'] ?? '',
                $body['password'] ?? ''
            ]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
            exit();
        }
    }
}

if ($route === 'results') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT r.*, s.username, s.name, s.usn, s.email, e.name as exam_name FROM results r JOIN students s ON r.student_id = s.id JOIN exams e ON r.exam_id = e.id ORDER BY r.exam_date DESC");
        $results = $stmt->fetchAll();
        $mapped = array_map(function($r) {
            return [
                'id' => $r['id'],
                'Username' => $r['username'],
                'Name' => $r['name'],
                'USN' => $r['usn'],
                'Score' => $r['score'],
                'TotalMarks' => $r['total_marks'],
                'ExamName' => $r['exam_name'],
                'ExamDate' => $r['exam_date']
            ];
        }, $results);
        echo json_encode($mapped);
        exit();
    }
}

if ($route === 'analytics') {
    if ($method === 'GET') {
        $stuCount = $pdo->query("SELECT COUNT(*) FROM students WHERE role = 'Student'")->fetchColumn();
        $examCount = $pdo->query("SELECT COUNT(*) FROM exams")->fetchColumn();
        
        $scores = $pdo->query("SELECT score FROM results")->fetchAll(PDO::FETCH_COLUMN);
        
        $totalResults = count($scores);
        $avgScore = $totalResults > 0 ? array_sum($scores) / $totalResults : 0;
        $highestScore = $totalResults > 0 ? max($scores) : 0;
        $lowestScore = $totalResults > 0 ? min($scores) : 0;

        echo json_encode([
            'totalStudents' => $stuCount,
            'totalExams' => $examCount,
            'avgScore' => round($avgScore),
            'highestScore' => $highestScore,
            'lowestScore' => $lowestScore,
            'totalResults' => $totalResults
        ]);
        exit();
    }
}
?>
