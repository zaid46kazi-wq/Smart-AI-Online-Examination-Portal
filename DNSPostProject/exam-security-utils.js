/**
 * Enhanced Exam Security Module v2.0
 * AGMR College of Engineering
 * Comprehensive security, validation, and debugging
 */

const examSecurityModules = {
    // Exam Time Validation
    validateExamTime: (exam, currentTime = Date.now()) => {
        const now = new Date(currentTime);
        const startTime = new Date(exam.exam_date + ' ' + exam.start_time);
        const endTime = new Date(exam.exam_date + ' ' + exam.end_time);
        
        return {
            isActive: now >= startTime && now <= endTime,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            currentTime: now.toISOString(),
            timeRemaining: Math.max(0, endTime - now),
            status: now < startTime ? 'NOT_STARTED' : now > endTime ? 'ENDED' : 'ACTIVE',
            minutesRemaining: Math.floor(Math.max(0, endTime - now) / 60000)
        };
    },

    // Answer Integrity Verification
    verifyAnswerIntegrity: (submittedAnswers, questions) => {
        const issues = [];
        const answerMap = {};

        // Check for null/undefined answers
        for (const [qId, answer] of Object.entries(submittedAnswers)) {
            if (answer === null || answer === undefined || answer === '') {
                answerMap[qId] = { status: 'UNANSWERED', answer };
                continue;
            }

            // Find the question
            const question = questions.find(q => q.id == qId);
            if (!question) {
                issues.push(`Question ${qId} not found in exam`);
                continue;
            }

            // Validate answer matches options
            const validOptions = [question.option1, question.option2, question.option3, question.option4];
            if (!validOptions.includes(answer)) {
                issues.push(`Invalid answer for question ${qId}: ${answer} not in options`);
                continue;
            }

            answerMap[qId] = { status: 'VALID', answer };
        }

        return { verified: issues.length === 0, issues, answerMap };
    },

    // Scoring with Fraud Detection
    calculateScore: (answers, questions, config = {}) => {
        const results = {
            totalScore: 0,
            maxScore: 0,
            breakdown: [],
            fraudIndicators: [],
            debugLog: []
        };

        for (const question of questions) {
            results.maxScore += (question.marks || 1);
            const studentAnswer = answers[question.id];
            const isCorrect = studentAnswer === question.correct_answer;

            results.breakdown.push({
                questionId: question.id,
                correctAnswer: question.correct_answer,
                studentAnswer: studentAnswer || null,
                isCorrect,
                marks: isCorrect ? (question.marks || 1) : 0,
                questionText: question.question?.substring(0, 50) + '...'
            });

            if (isCorrect) {
                results.totalScore += (question.marks || 1);
            }
        }

        // Detect suspicious patterns
        const correctCount = results.breakdown.filter(b => b.isCorrect).length;
        const totalQ = questions.length;

        if (totalQ > 0) {
            const correctPct = (correctCount / totalQ) * 100;
            
            // Perfect score on first attempt (>95%) - suspicious
            if (correctPct > 95) {
                results.fraudIndicators.push({
                    type: 'UNUSUALLY_HIGH_SCORE',
                    severity: 'MEDIUM',
                    message: `${correctPct.toFixed(1)}% correct - unusually high for first attempt`,
                    correctCount,
                    totalCount: totalQ
                });
            }

            // All or nothing pattern
            if (correctPct === 0 || correctPct === 100) {
                results.fraudIndicators.push({
                    type: 'ALL_OR_NOTHING',
                    severity: 'LOW',
                    message: 'All answers were either correct or incorrect'
                });
            }
        }

        results.percentage = (results.totalScore / results.maxScore) * 100;
        results.passed = results.percentage >= 40;

        return results;
    },

    // Session Validation
    validateSession: (session, exam, userId) => {
        const errors = [];
        const warnings = [];

        if (!session) errors.push('No active session');
        if (!session?.userId) errors.push('Session user mismatch');
        if (session?.userId !== userId) errors.push(`User ID mismatch: ${session?.userId} vs ${userId}`);
        if (!session?.examId) errors.push('No exam ID in session');
        if (session?.examId !== exam?.id) errors.push(`Exam ID mismatch in session`);
        if (session?.submitted) warnings.push('Exam already submitted');
        if (session?.violations && session.violations > 3) warnings.push(`Multiple violations detected (${session.violations})`);

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            sessionAge: session?.createdAt ? Date.now() - new Date(session.createdAt).getTime() : null
        };
    },

    // Cheating Detection Indicators
    detectCheatIndicators: (studentData, examData) => {
        const indicators = [];

        // Timing anomaly
        if (studentData.timeSpent && examData.time_limit) {
            const percentOfTime = (studentData.timeSpent / (examData.time_limit * 60 * 1000)) * 100;
            
            if (percentOfTime < 5) {
                indicators.push({
                    type: 'TOO_FAST_COMPLETION',
                    severity: 'HIGH',
                    details: `Completed in ${(percentOfTime).toFixed(1)}% of allocated time`
                });
            }
        }

        // Copy-paste attempts
        if (studentData.copyPasteAttempts && studentData.copyPasteAttempts > 0) {
            indicators.push({
                type: 'COPY_PASTE_ATTEMPT',
                severity: 'HIGH',
                details: `${studentData.copyPasteAttempts} copy/paste attempts detected`
            });
        }

        // Tab switching
        if (studentData.tabSwitches && studentData.tabSwitches > 2) {
            indicators.push({
                type: 'EXCESSIVE_TAB_SWITCHING',
                severity: 'MEDIUM',
                details: `${studentData.tabSwitches} tab switches detected`
            });
        }

        // Fullscreen violations
        if (studentData.fullscreenExits && studentData.fullscreenExits > 2) {
            indicators.push({
                type: 'FULLSCREEN_VIOLATIONS',
                severity: 'MEDIUM',
                details: `${studentData.fullscreenExits} fullscreen exits detected`
            });
        }

        // DevTools opened
        if (studentData.devtoolsOpened) {
            indicators.push({
                type: 'DEVTOOLS_OPENED',
                severity: 'HIGH',
                details: 'Developer tools were opened during exam'
            });
        }

        return indicators;
    },

    // Security Report Generation
    generateSecurityReport: (studentId, examId, events = []) => {
        const report = {
            studentId,
            examId,
            generatedAt: new Date().toISOString(),
            summary: {
                totalEvents: events.length,
                highSeverity: 0,
                mediumSeverity: 0,
                lowSeverity: 0
            },
            events: [],
            recommendation: 'PASS'
        };

        const severityMap = { HIGH: 1, MEDIUM: 2, LOW: 3 };
        let totalScore = 0;

        for (const event of events) {
            const severity = event.severity || 'MEDIUM';
            report.summary[severity.toLowerCase() + 'Severity']++;
            
            totalScore += severityMap[severity] || 2;
            report.events.push({
                timestamp: event.timestamp || new Date().toISOString(),
                type: event.type,
                severity,
                message: event.message
            });
        }

        // Calculate recommendation
        const avgScore = events.length > 0 ? totalScore / events.length : 3;
        if (avgScore < 1.5) {
            report.recommendation = 'REVIEW'; // High severity issues
        } else if (avgScore < 2.0) {
            report.recommendation = 'FLAG'; // Mixed severity
        }

        return report;
    }
};

// Export for Node.js/server usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = examSecurityModules;
}

// Export for browser usage
if (typeof window !== 'undefined') {
    window.examSecurityModules = examSecurityModules;
}
