import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { AppLayout } from '../components/ui/AppLayout';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import {
    Plus,
    Trash2,
    Edit2,
    ArrowUp,
    ArrowDown,
    Sparkles,
    FileText,
    CheckCircle2,
    Clock,
    BookOpen,
    HelpCircle,
    Save,
    UploadCloud,
    Sliders,
    Check,
    Layers,
    Calendar
} from 'lucide-react';

export function CreateExam() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Examination Metadata
    const [examName, setExamName] = useState('');
    const [subjectVal, setSubjectVal] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [timeLimit, setTimeLimit] = useState(30);
    const [examDate, setExamDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [startTime, setStartTime] = useState('00:00');
    const [endTime, setEndTime] = useState('23:59');

    // Single Question Form
    const [qText, setQText] = useState('');
    const [op1, setOp1] = useState('');
    const [op2, setOp2] = useState('');
    const [op3, setOp3] = useState('');
    const [op4, setOp4] = useState('');
    const [correct, setCorrect] = useState('A');
    const [qMarks, setQMarks] = useState(1);

    // Question Bank State
    const [questionList, setQuestionList] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]);

    // Question Editing Modal
    const [editingIdx, setEditingIdx] = useState(null);
    const [editModalActive, setEditModalActive] = useState(false);
    const [editQ, setEditQ] = useState({ question: '', option1: '', option2: '', option3: '', option4: '', correct_answer: 'A', marks: 1 });

    // AI Question Generation
    const [pdfFile, setPdfFile] = useState(null);
    const [aiCount, setAiCount] = useState(10);
    const [aiDifficulty, setAiDifficulty] = useState('Medium');
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiReviewModalActive, setAiReviewModalActive] = useState(false);
    const [aiGeneratedList, setAiGeneratedList] = useState([]);
    const [selectedAiIndices, setSelectedAiIndices] = useState([]);

    useEffect(() => {
        apiFetch('/api/subjects')
            .then(data => setAllSubjects(Array.isArray(data) ? data : []))
            .catch(() => setAllSubjects([]));
    }, []);

    const addQuestion = () => {
        if (!qText.trim()) { showToast('Question statement cannot be empty', 'warning'); return; }
        if (!op1.trim() || !op2.trim()) { showToast('Provide at least Option A and Option B', 'warning'); return; }
        setQuestionList(prev => [...prev, {
            question: qText.trim(),
            option1: op1.trim(),
            option2: op2.trim(),
            option3: op3.trim(),
            option4: op4.trim(),
            correct_answer: correct,
            marks: parseInt(qMarks) || 1
        }]);
        setQText(''); setOp1(''); setOp2(''); setOp3(''); setOp4(''); setQMarks(1);
        showToast('Question added to assessment bank', 'success');
    };

    const removeQuestion = (idx) => {
        setQuestionList(prev => prev.filter((_, i) => i !== idx));
    };

    const moveQuestion = (idx, direction) => {
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= questionList.length) return;
        setQuestionList(prev => {
            const list = [...prev];
            const temp = list[idx];
            list[idx] = list[targetIdx];
            list[targetIdx] = temp;
            return list;
        });
    };

    const startEditQuestion = (idx) => {
        setEditingIdx(idx);
        setEditQ({ ...questionList[idx] });
        setEditModalActive(true);
    };

    const saveEditedQuestion = () => {
        if (editingIdx === null) return;
        if (!editQ.question.trim()) { showToast('Question text cannot be empty', 'warning'); return; }
        setQuestionList(prev => {
            const list = [...prev];
            list[editingIdx] = { ...editQ, marks: parseInt(editQ.marks) || 1 };
            return list;
        });
        setEditModalActive(false);
        setEditingIdx(null);
        showToast('Question updated', 'success');
    };

    // AI Generation Handler with Gemini
    const generateAI = async () => {
        if (!pdfFile) {
            showToast('Please upload a syllabus PDF or study notes file', 'warning');
            return;
        }

        setAiGenerating(true);
        const form = new FormData();
        form.append('file', pdfFile);
        form.append('count', aiCount);
        form.append('difficulty', aiDifficulty);

        try {
            const data = await apiFetch('/api/questions/generate-ai', {
                method: 'POST',
                body: form
            });

            if (data?.questions && Array.isArray(data.questions) && data.questions.length > 0) {
                setAiGeneratedList(data.questions);
                // Select all by default
                setSelectedAiIndices(data.questions.map((_, i) => i));
                setAiReviewModalActive(true);
                showToast(`Synthesized ${data.questions.length} questions from document!`, 'success');
            } else {
                showToast('No questions could be extracted from this document.', 'warning');
            }
        } catch (err) {
            showToast('AI Generation failed: ' + err.message, 'error');
        } finally {
            setAiGenerating(false);
        }
    };

    const importSelectedAiQuestions = () => {
        const selected = aiGeneratedList.filter((_, i) => selectedAiIndices.includes(i));
        if (selected.length === 0) {
            showToast('Please select at least one question to import', 'warning');
            return;
        }
        setQuestionList(prev => [...prev, ...selected]);
        setAiReviewModalActive(false);
        setAiGeneratedList([]);
        setSelectedAiIndices([]);
        setPdfFile(null);
        showToast(`Appended ${selected.length} AI questions to assessment bank!`, 'success');
    };

    const toggleSelectAiQuestion = (idx) => {
        setSelectedAiIndices(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    const saveExam = async () => {
        if (!examName.trim()) { showToast('Please enter an examination title', 'warning'); return; }
        if (!subjectId) { showToast('Please select an academic subject', 'warning'); return; }
        if (questionList.length === 0) { showToast('Please add at least one question to this examination', 'warning'); return; }

        try {
            const res = await apiFetch('/api/exams', {
                method: 'POST',
                body: JSON.stringify({
                    name: examName.trim(),
                    subject_id: parseInt(subjectId),
                    time_limit: parseInt(timeLimit),
                    exam_date: examDate,
                    start_time: startTime,
                    end_time: endTime,
                    questions: questionList
                })
            });

            showToast('Examination created and published successfully!', 'success');
            navigate('/admin?tab=exams');
        } catch (err) {
            showToast('Failed to save examination: ' + err.message, 'error');
        }
    };

    const totalCalculatedMarks = questionList.reduce((sum, q) => sum + (parseInt(q.marks) || 1), 0);

    return (
        <AppLayout activeTab="questions">
            {/* Page Header */}
            <PageHeader
                title="Create & Configure Examination"
                description="Set schedule parameters, author multiple-choice items, or generate question drafts with Gemini AI."
                action={
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => navigate('/admin')}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            icon={Save}
                            onClick={saveExam}
                            disabled={questionList.length === 0}
                        >
                            Publish Examination ({questionList.length} Qs)
                        </Button>
                    </div>
                }
            />

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Question Count</span>
                    <span className="text-xl font-bold text-slate-900">{questionList.length} Items</span>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Marks</span>
                    <span className="text-xl font-bold text-blue-600">{totalCalculatedMarks} Marks</span>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                    <span className="text-xl font-bold text-slate-900">{timeLimit} Minutes</span>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Date</span>
                    <span className="text-xl font-bold text-slate-900">{examDate}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column (5 cols): Exam Parameters & Question Entry */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Examination Parameters Card */}
                    <Card
                        title="1. Examination Parameters"
                        subtitle="Curriculum scheduling and examination duration"
                        icon={Clock}
                    >
                        <div className="space-y-4">
                            <Input
                                label="Examination Title"
                                placeholder="e.g. Midterm Assessment — Computer Networks"
                                value={examName}
                                onChange={e => setExamName(e.target.value)}
                                required
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <Select
                                    label="Academic Subject"
                                    value={subjectId}
                                    placeholder="Choose Subject"
                                    onChange={e => {
                                        setSubjectId(e.target.value);
                                        const found = allSubjects.find(s => String(s.id) === e.target.value);
                                        if (found) setSubjectVal(found.subject_name);
                                    }}
                                    required
                                >
                                    {allSubjects.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.subject_code ? `[${s.subject_code}] ` : ''}{s.subject_name}
                                        </option>
                                    ))}
                                </Select>

                                <Input
                                    label="Duration (Minutes)"
                                    type="number"
                                    min="5"
                                    max="300"
                                    value={timeLimit}
                                    onChange={e => setTimeLimit(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <Input
                                    label="Exam Date"
                                    type="date"
                                    value={examDate}
                                    onChange={e => setExamDate(e.target.value)}
                                    required
                                />
                                <Input
                                    label="Start Time"
                                    type="time"
                                    value={startTime}
                                    onChange={e => setStartTime(e.target.value)}
                                />
                                <Input
                                    label="End Time"
                                    type="time"
                                    value={endTime}
                                    onChange={e => setEndTime(e.target.value)}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* AI Question Generator Card */}
                    <Card
                        title="2. AI Question Synthesizer"
                        subtitle="Upload syllabus notes or lecture PDF for automated MCQ drafting via Gemini"
                        icon={Sparkles}
                        badge={<Badge variant="primary" size="xs">Gemini AI</Badge>}
                    >
                        <div className="space-y-3.5">
                            <div className="p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-center space-y-1.5">
                                <UploadCloud size={24} className="mx-auto text-blue-600" />
                                <span className="text-xs font-semibold text-slate-800 block">
                                    Upload Syllabus PDF / Notes
                                </span>
                                <input
                                    type="file"
                                    id="pdf-upload"
                                    accept=".pdf"
                                    onChange={e => setPdfFile(e.target.files[0] || null)}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="pdf-upload"
                                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg shadow-2xs hover:bg-slate-50 cursor-pointer inline-block"
                                >
                                    {pdfFile ? pdfFile.name : 'Choose PDF File'}
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Target Count"
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={aiCount}
                                    onChange={e => setAiCount(e.target.value)}
                                />
                                <Select
                                    label="Difficulty"
                                    value={aiDifficulty}
                                    onChange={e => setAiDifficulty(e.target.value)}
                                >
                                    <option value="Easy">Easy (Conceptual)</option>
                                    <option value="Medium">Medium (Standard)</option>
                                    <option value="Hard">Hard (Analytical)</option>
                                </Select>
                            </div>

                            <Button
                                variant="subtle"
                                size="sm"
                                fullWidth
                                icon={Sparkles}
                                loading={aiGenerating}
                                disabled={!pdfFile}
                                onClick={generateAI}
                            >
                                {aiGenerating ? 'Synthesizing with Gemini...' : 'Generate Question Bank from PDF'}
                            </Button>
                        </div>
                    </Card>

                    {/* Manual Question Authoring Form */}
                    <Card
                        title="3. Add Question Manually"
                        subtitle="Compose multiple-choice questions with 4 options"
                        icon={Plus}
                    >
                        <div className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 tracking-tight mb-1">
                                    Question Statement <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={qText}
                                    onChange={e => setQText(e.target.value)}
                                    placeholder="Type question statement here..."
                                    className="w-full text-xs sm:text-sm p-3 rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div className="space-y-2">
                                <Input
                                    label="Option A"
                                    placeholder="Text for option A"
                                    value={op1}
                                    onChange={e => setOp1(e.target.value)}
                                    required
                                />
                                <Input
                                    label="Option B"
                                    placeholder="Text for option B"
                                    value={op2}
                                    onChange={e => setOp2(e.target.value)}
                                    required
                                />
                                <Input
                                    label="Option C"
                                    placeholder="Text for option C"
                                    value={op3}
                                    onChange={e => setOp3(e.target.value)}
                                />
                                <Input
                                    label="Option D"
                                    placeholder="Text for option D"
                                    value={op4}
                                    onChange={e => setOp4(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <Select
                                    label="Correct Answer Option"
                                    value={correct}
                                    onChange={e => setCorrect(e.target.value)}
                                >
                                    <option value="A">Option A</option>
                                    <option value="B">Option B</option>
                                    <option value="C">Option C</option>
                                    <option value="D">Option D</option>
                                </Select>

                                <Input
                                    label="Marks Value"
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={qMarks}
                                    onChange={e => setQMarks(e.target.value)}
                                />
                            </div>

                            <Button
                                size="sm"
                                variant="primary"
                                fullWidth
                                icon={Plus}
                                onClick={addQuestion}
                            >
                                Append Question to Bank
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Right Column (7 cols): Question Bank Review */}
                <div className="lg:col-span-7 space-y-4">
                    <Card
                        title={`Assessment Question Inventory (${questionList.length})`}
                        subtitle="Review, reorder, edit, and verify correct answers before publishing"
                        action={
                            <Badge variant="primary" size="md">
                                Total Marks: {totalCalculatedMarks}
                            </Badge>
                        }
                    >
                        {questionList.length === 0 ? (
                            <EmptyState
                                icon={HelpCircle}
                                title="No questions in this assessment"
                                description="Add questions manually using the authoring form or synthesize them using the AI Question Synthesizer."
                            />
                        ) : (
                            <div className="space-y-3">
                                {questionList.map((q, idx) => (
                                    <div
                                        key={idx}
                                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-2.5">
                                                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80 shrink-0">
                                                    Q{idx + 1}
                                                </span>
                                                <div className="space-y-1">
                                                    <h4 className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                                                        {q.question}
                                                    </h4>
                                                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                                        <span>Marks: <strong>{q.marks || 1}</strong></span>
                                                        <span>•</span>
                                                        <span>Correct: <strong>Option {q.correct_answer}</strong></span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => moveQuestion(idx, -1)}
                                                    disabled={idx === 0}
                                                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 cursor-pointer"
                                                    title="Move Up"
                                                >
                                                    <ArrowUp size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => moveQuestion(idx, 1)}
                                                    disabled={idx === questionList.length - 1}
                                                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 cursor-pointer"
                                                    title="Move Down"
                                                >
                                                    <ArrowDown size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => startEditQuestion(idx)}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer ml-1"
                                                    title="Edit Question"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeQuestion(idx)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                                    title="Remove Question"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Option Pills */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                            {['A', 'B', 'C', 'D'].map(optKey => {
                                                const optText = q[`option${optKey === 'A' ? 1 : optKey === 'B' ? 2 : optKey === 'C' ? 3 : 4}`];
                                                if (!optText) return null;
                                                const isCorrect = q.correct_answer === optKey;

                                                return (
                                                    <div
                                                        key={optKey}
                                                        className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                                            isCorrect
                                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                                                                : 'bg-slate-50/60 border-slate-200 text-slate-700'
                                                        }`}
                                                    >
                                                        <span className="truncate">
                                                            <strong>{optKey}:</strong> {optText}
                                                        </span>
                                                        {isCorrect && (
                                                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* ──────────────────────────────────────────────────────────── */}
            {/* MODAL: EDIT QUESTION */}
            {/* ──────────────────────────────────────────────────────────── */}
            <Modal
                isOpen={editModalActive}
                onClose={() => setEditModalActive(false)}
                title={`Edit Question ${editingIdx !== null ? '#' + (editingIdx + 1) : ''}`}
                size="md"
            >
                <div className="space-y-3.5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Question Statement</label>
                        <textarea
                            rows={3}
                            value={editQ.question}
                            onChange={e => setEditQ({ ...editQ, question: e.target.value })}
                            className="w-full text-xs sm:text-sm p-3 rounded-lg border border-slate-300"
                        />
                    </div>

                    <div className="space-y-2">
                        <Input
                            label="Option A"
                            value={editQ.option1}
                            onChange={e => setEditQ({ ...editQ, option1: e.target.value })}
                        />
                        <Input
                            label="Option B"
                            value={editQ.option2}
                            onChange={e => setEditQ({ ...editQ, option2: e.target.value })}
                        />
                        <Input
                            label="Option C"
                            value={editQ.option3}
                            onChange={e => setEditQ({ ...editQ, option3: e.target.value })}
                        />
                        <Input
                            label="Option D"
                            value={editQ.option4}
                            onChange={e => setEditQ({ ...editQ, option4: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <Select
                            label="Correct Option"
                            value={editQ.correct_answer}
                            onChange={e => setEditQ({ ...editQ, correct_answer: e.target.value })}
                        >
                            <option value="A">Option A</option>
                            <option value="B">Option B</option>
                            <option value="C">Option C</option>
                            <option value="D">Option D</option>
                        </Select>
                        <Input
                            label="Marks"
                            type="number"
                            min="1"
                            value={editQ.marks}
                            onChange={e => setEditQ({ ...editQ, marks: parseInt(e.target.value) || 1 })}
                        />
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setEditModalActive(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" size="sm" icon={Save} onClick={saveEditedQuestion}>
                            Save Changes
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ──────────────────────────────────────────────────────────── */}
            {/* MODAL: AI QUESTION REVIEW & BATCH SELECTION */}
            {/* ──────────────────────────────────────────────────────────── */}
            <Modal
                isOpen={aiReviewModalActive}
                onClose={() => setAiReviewModalActive(false)}
                title={`Review Gemini Synthesized Questions (${aiGeneratedList.length})`}
                description="Select which questions you would like to import into your examination question bank."
                size="lg"
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-600 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                        <span>Selected: <strong>{selectedAiIndices.length}</strong> of {aiGeneratedList.length} questions</span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedAiIndices(aiGeneratedList.map((_, i) => i))}
                                className="text-blue-600 font-semibold hover:underline cursor-pointer"
                            >
                                Select All
                            </button>
                            <span>•</span>
                            <button
                                type="button"
                                onClick={() => setSelectedAiIndices([])}
                                className="text-slate-500 hover:underline cursor-pointer"
                            >
                                Deselect All
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                        {aiGeneratedList.map((q, idx) => {
                            const isSelected = selectedAiIndices.includes(idx);
                            return (
                                <div
                                    key={idx}
                                    onClick={() => toggleSelectAiQuestion(idx)}
                                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                                        isSelected
                                            ? 'border-blue-400 bg-blue-50/20 shadow-2xs'
                                            : 'border-slate-200 bg-white opacity-60'
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}} // handled by parent onClick
                                            className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="space-y-1 min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                                                    {q.question}
                                                </h4>
                                                <Badge variant="primary" size="xs">
                                                    Correct: {q.correct_answer}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 pt-1">
                                                <div>A: {q.option1}</div>
                                                <div>B: {q.option2}</div>
                                                {q.option3 && <div>C: {q.option3}</div>}
                                                {q.option4 && <div>D: {q.option4}</div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setAiReviewModalActive(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            icon={Check}
                            disabled={selectedAiIndices.length === 0}
                            onClick={importSelectedAiQuestions}
                        >
                            Import Selected ({selectedAiIndices.length}) Questions
                        </Button>
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}

export default CreateExam;
