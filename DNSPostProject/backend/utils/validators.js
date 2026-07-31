/**
 * Zod Validation Schemas
 * Strictly validates request parameters, bodies, and parameters.
 */
const { z } = require('zod');

const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
    role: z.enum(['student', 'Student', 'instructor', 'Instructor', 'Admin', 'admin'])
});

const createSubjectSchema = z.object({
    subject_name: z.string().min(1, 'Subject name is required'),
    subject_code: z.string().optional().default('')
});

const createStudentSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
    name: z.string().optional().default(''),
    usn: z.string().optional().default(''),
    email: z.string().email('Invalid email address').optional().or(z.literal(''))
});

const createExamSchema = z.object({
    exam_name: z.string().min(1, 'Exam name is required'),
    subject_id: z.number().optional(),
    subject_name: z.string().optional(),
    total_questions: z.number().optional().default(0),
    total_marks: z.number().optional().default(0),
    time_limit: z.number().min(1, 'Time limit must be at least 1 minute'),
    exam_date: z.string().optional(),
    start_time: z.string().optional().default('00:00'),
    end_time: z.string().optional().default('23:59'),
    questions: z.array(z.object({
        question: z.string().min(1),
        option1: z.string().min(1),
        option2: z.string().min(1),
        option3: z.string().min(1),
        option4: z.string().min(1),
        correct_answer: z.enum(['A', 'B', 'C', 'D']),
        marks: z.number().optional().default(1)
    })).optional().default([])
});

const submitExamSchema = z.object({
    exam_id: z.number({ required_error: 'exam_id is required' }),
    answers: z.record(z.string(), z.string()).optional().default({}),
    autoSubmit: z.boolean().optional().default(false),
    reason: z.string().optional().default('NORMAL')
});

const flagViolationSchema = z.object({
    exam_id: z.number().or(z.string().regex(/^\d+$/).transform(Number)),
    violation_type: z.string().min(1),
    confidence: z.number().optional().default(1.0),
    risk_score: z.number().optional().default(10),
    details: z.record(z.any()).optional(),
    image_data: z.string().nullable().optional()
});

module.exports = {
    loginSchema,
    createSubjectSchema,
    createStudentSchema,
    createExamSchema,
    submitExamSchema,
    flagViolationSchema
};
