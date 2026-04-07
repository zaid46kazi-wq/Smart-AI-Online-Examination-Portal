#!/usr/bin/env node

/**
 * Exam Security Debug Test Suite
 * Run: node debug-exam-security.js
 */

const http = require('http');

const API_BASE = 'http://localhost:5000';

// Color codes for output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

class DebugTester {
    constructor() {
        this.token = null;
        this.studentId = null;
    }

    log(level, message) {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = level === 'ERROR' ? colors.red : 
                      level === 'SUCCESS' ? colors.green : 
                      level === 'WARNING' ? colors.yellow : colors.blue;
        console.log(`${prefix}[${timestamp}] ${level}${colors.reset} ${message}`);
    }

    async request(method, path, body = null, token = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, API_BASE);
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            };

            const req = http.request(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve({
                            status: res.statusCode,
                            body: data ? JSON.parse(data) : null,
                            headers: res.headers
                        });
                    } catch (e) {
                        resolve({
                            status: res.statusCode,
                            body: data,
                            headers: res.headers
                        });
                    }
                });
            });

            req.on('error', reject);
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    }

    async testExamSecurityStatus() {
        this.log('INFO', 'Testing: GET /api/exam-security-status');
        
        try {
            const res = await this.request('GET', '/api/exam-security-status?exam_id=1');
            
            if (res.status === 200) {
                this.log('SUCCESS', `Security status: ${JSON.stringify(res.body)}`);
            } else {
                this.log('ERROR', `Status ${res.status}: ${JSON.stringify(res.body)}`);
            }
        } catch (err) {
            this.log('ERROR', `Request failed: ${err.message}`);
        }
    }

    async testViolationReport() {
        this.log('INFO', 'Testing: POST /api/flag-violation');
        
        try {
            const payload = {
                exam_id: 1,
                violation_type: 'TAB_SWITCH',
                details: { warning_count: 1 }
            };

            const res = await this.request('POST', '/api/flag-violation', payload);
            
            if (res.status === 200) {
                this.log('SUCCESS', `Violation reported: ${JSON.stringify(res.body)}`);
            } else if (res.status === 400) {
                this.log('WARNING', `Bad request: ${JSON.stringify(res.body)}`);
            } else {
                this.log('ERROR', `Status ${res.status}: ${JSON.stringify(res.body)}`);
            }
        } catch (err) {
            this.log('ERROR', `Request failed: ${err.message}`);
        }
    }

    async testExamQuestions() {
        this.log('INFO', 'Testing: GET /api/exam-questions/1');
        
        try {
            const res = await this.request('GET', '/api/exam-questions/1');
            
            if (res.status === 200) {
                const body = res.body;
                this.log('SUCCESS', `Questions loaded: ${body.total_questions} questions, ${body.total_marks} marks`);
                if (body.questions && body.questions.length > 0) {
                    this.log('INFO', `First question: "${body.questions[0].question?.substring(0, 50)}..."`);
                }
            } else if (res.status === 404) {
                this.log('WARNING', 'Exam not found');
            } else {
                this.log('ERROR', `Status ${res.status}: ${JSON.stringify(res.body)}`);
            }
        } catch (err) {
            this.log('ERROR', `Request failed: ${err.message}`);
        }
    }

    async testExamSubmit() {
        this.log('INFO', 'Testing: POST /api/submit');
        
        try {
            const payload = {
                exam_id: 1,
                answers: {
                    '1': 'Option 1',
                    '2': 'Option 2',
                    '3': 'Option 3'
                }
            };

            const res = await this.request('POST', '/api/submit', payload);
            
            if (res.status === 200) {
                const body = res.body;
                const percentage = Math.round((body.score / body.total_marks) * 100);
                this.log('SUCCESS', `Exam submitted: ${body.score}/${body.total_marks} (${percentage}%) - ${body.passed ? 'PASS' : 'FAIL'}`);
            } else if (res.status === 403) {
                this.log('WARNING', 'Already submitted or access denied');
            } else if (res.status === 400) {
                this.log('WARNING', `Invalid request: ${JSON.stringify(res.body)}`);
            } else {
                this.log('ERROR', `Status ${res.status}: ${JSON.stringify(res.body)}`);
            }
        } catch (err) {
            this.log('ERROR', `Request failed: ${err.message}`);
        }
    }

    async testInvalidViolationType() {
        this.log('INFO', 'Testing: Invalid violation type (should fail)');
        
        try {
            const payload = {
                exam_id: 1,
                violation_type: 'INVALID_TYPE',
                details: {}
            };

            const res = await this.request('POST', '/api/flag-violation', payload);
            
            if (res.status === 400) {
                this.log('SUCCESS', `Correctly rejected invalid type: ${res.body.error}`);
            } else {
                this.log('ERROR', `Should have returned 400, got ${res.status}`);
            }
        } catch (err) {
            this.log('ERROR', `Request failed: ${err.message}`);
        }
    }

    async testMissingExamId() {
        this.log('INFO', 'Testing: Missing exam ID (should fail)');
        
        try {
            const res = await this.request('GET', '/api/exam-questions/invalid');
            
            if (res.status === 400 || res.status === 404) {
                this.log('SUCCESS', `Correctly rejected: ${res.body.error}`);
            } else {
                this.log('ERROR', `Should have returned error, got ${res.status}`);
            }
        } catch (err) {
            this.log('ERROR', `Request failed: ${err.message}`);
        }
    }

    async runAllTests() {
        console.log(`\n${colors.cyan}════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.cyan}    EXAM SECURITY DEBUG TEST SUITE${colors.reset}`);
        console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}\n`);

        this.log('INFO', 'Starting tests against ' + API_BASE);
        
        // Wait a moment for user to ensure server is running
        await new Promise(resolve => setTimeout(resolve, 1000));

        const tests = [
            { name: 'Exam Questions', fn: () => this.testExamQuestions() },
            { name: 'Submit Valid Exam', fn: () => this.testExamSubmit() },
            { name: 'Security Status', fn: () => this.testExamSecurityStatus() },
            { name: 'Report Violation', fn: () => this.testViolationReport() },
            { name: 'Reject Invalid Violation Type', fn: () => this.testInvalidViolationType() },
            { name: 'Reject Missing Exam ID', fn: () => this.testMissingExamId() }
        ];

        for (const test of tests) {
            console.log(`\n${colors.cyan}──────────────────────────────────────${colors.reset}`);\n            await test.fn();
        }

        console.log(`\n${colors.cyan}════════════════════════════════════════${colors.reset}`);\n            this.log('INFO', 'Tests completed');\n        process.exit(0);\n    }\n}\n\n// Run tests\nconst tester = new DebugTester();\ntester.runAllTests().catch(err => {\n    console.error(colors.red + 'Fatal error:' + colors.reset, err);\n    process.exit(1);\n});\n