import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { showToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

export function CreateExam() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [examName, setExamName] = useState('');
    const [subjectVal, setSubjectVal] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [timeLimit, setTimeLimit] = useState(30);
    const [examDate, setExamDate] = useState('');
    const [startTime, setStartTime] = useState('00:00');
    const [endTime, setEndTime] = useState('23:59');

    const [qText, setQText] = useState('');
    const [op1, setOp1] = useState('');
    const [op2, setOp2] = useState('');
    const [op3, setOp3] = useState('');
    const [op4, setOp4] = useState('');
    const [correct, setCorrect] = useState('A');

    const [questionList, setQuestionList] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]);
    const [modalActive, setModalActive] = useState(false);

    const [pdfFile, setPdfFile] = useState(null);
    const [aiCount, setAiCount] = useState(30);
    const [aiDifficulty, setAiDifficulty] = useState('Medium');
    const [aiGenerating, setAiGenerating] = useState(false);

    useEffect(() => {
        apiFetch('/api/subjects')
            .then(data => setAllSubjects(Array.isArray(data) ? data : []))
            .catch(() => setAllSubjects([]));
    }, []);

    const addQuestion = () => {
        if (!qText.trim()) { showToast('Enter question text', 'warning'); return; }
        setQuestionList(prev => [...prev, {
            question: qText, option1: op1, option2: op2, option3: op3, option4: op4,
            correct_answer: correct, marks: 1
        }]);
        setQText(''); setOp1(''); setOp2(''); setOp3(''); setOp4('');
    };

    const removeQuestion = (idx) => {
        setQuestionList(prev => prev.filter((_, i) => i !== idx));
    };

    const saveExam = async () => {
        if (!examName.trim()) { showToast('Enter exam title', 'warning'); return; }
        if (!subjectVal.trim()) { showToast('Select or enter a subject', 'warning'); return; }
        if (questionList.length === 0) { showToast('Add at least one question', 'warning'); return; }

        try {
            await apiFetch('/api/exams', {
                method: 'POST',
                body: JSON.stringify({
                    exam_name: examName,
                    subject_id: subjectId,
                    subject_name: subjectVal,
                    total_questions: questionList.length,
                    total_marks: questionList.reduce((s, q) => s + (q.marks || 1), 0),
                    time_limit: parseInt(timeLimit),
                    exam_date: examDate,
                    start_time: startTime,
                    end_time: endTime,
                    questions: questionList
                })
            });
            showToast('Exam created successfully!', 'success');
            navigate('/admin');
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const generateAI = async () => {
        if (!pdfFile) { showToast('Select a PDF file', 'warning'); return; }
        setAiGenerating(true);
        const form = new FormData();
        form.append('file', pdfFile);
        form.append('count', aiCount);
        form.append('difficulty', aiDifficulty);
        form.append('subject_name', subjectVal || 'General');

        try {
            const data = await apiFetch('/api/questions/generate-ai', { method: 'POST', body: form });
            if (data && Array.isArray(data.questions)) {
                const formatted = data.questions.map(q => ({
                    question: (q.question || '').replace(/^\d+\.\s*/, ''),
                    option1: q.option1 || '', option2: q.option2 || '', option3: q.option3 || '', option4: q.option4 || '',
                    correct_answer: q.correct_answer || 'A', marks: q.marks || 1
                }));
                setQuestionList(prev => [...prev, ...formatted]);
                showToast(`AI generated ${formatted.length} questions!`, 'success');
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setAiGenerating(false);
        }
    };

    const subjectsList = Array.isArray(allSubjects) ? allSubjects : [];

    return (
        <div className="bg-surface min-h-screen flex flex-col font-body">
            {/* Header Banner */}
            <header className="w-full bg-primary text-on-primary py-3 px-6 text-center shadow-lg relative z-10">
                <h1 className="text-lg font-bold font-headline tracking-tight">AGMR College of Engineering</h1>
                <p className="text-xs opacity-80">Online Examination System — Assessment Creator</p>
            </header>

            {/* Top Navigation */}
            <nav className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/10 px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold font-headline text-primary">Assessment Creator</h2>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-on-surface-variant">Welcome, {user?.username || 'Instructor'}</span>
                    <button onClick={logout} className="px-3 py-1.5 rounded-lg text-xs font-bold text-error bg-error-container/10 hover:bg-error-container/20 transition-all flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">logout</span> Logout
                    </button>
                </div>
            </nav>

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className="w-64 bg-surface-container-lowest border-r border-outline-variant/10 flex flex-col p-4 space-y-2">
                    <div className="px-3 py-2 mb-4">
                        <h3 className="text-xs font-bold text-outline uppercase tracking-widest">Instructor Portal</h3>
                        <p className="text-sm font-bold text-on-surface">AGMR College</p>
                    </div>

                    <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined text-xl">dashboard</span> Overview
                    </Link>
                    <Link to="/create-exam" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-primary text-on-primary shadow-sm">
                        <span className="material-symbols-outlined text-xl">add_circle</span> Create Exam
                    </Link>
                    <Link to="/results" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined text-xl">analytics</span> View Results
                    </Link>
                    <Link to="/ai-settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined text-xl">settings_suggest</span> AI Security Settings
                    </Link>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8 space-y-8 overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold font-headline text-on-surface">Build New Assessment</h1>
                            <p className="text-sm text-on-surface-variant mt-1">Configure details, add questions manually, or use AI question paper generation.</p>
                        </div>
                        <button onClick={saveExam} className="bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dim transition-all shadow-md flex items-center gap-2">
                            <span className="material-symbols-outlined">save</span> Save Exam
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Form Details Column */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* Exam Details Card */}
                            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Exam Details</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Exam Title</label>
                                        <input type="text" value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g. Midterm Examination 1" className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Subject</label>
                                        <div className="space-y-2">
                                            <select 
                                                value={subjectId || ''} 
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val === 'NEW') {
                                                        setSubjectId(0);
                                                        setSubjectVal('');
                                                    } else {
                                                        const id = parseInt(val);
                                                        setSubjectId(id);
                                                        const s = subjectsList.find(sub => sub.id === id);
                                                        setSubjectVal(s ? s.subject_name : '');
                                                    }
                                                }} 
                                                className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="">Select a Subject from MySQL Database...</option>
                                                {subjectsList.map(s => (
                                                    <option key={s.id} value={s.id}>{s.subject_name} ({s.subject_code || 'General'})</option>
                                                ))}
                                                <option value="NEW">+ Add Custom Subject...</option>
                                            </select>
                                            {(!subjectId || subjectId === 0) && (
                                                <input type="text" value={subjectVal} onChange={e => setSubjectVal(e.target.value)} placeholder="Type new subject name..." className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Duration (Min)</label>
                                            <input type="number" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Exam Date</label>
                                            <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Start Time</label>
                                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">End Time</label>
                                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Add Question Manually */}
                            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Add Question Manually</h3>
                                <div className="space-y-3">
                                    <textarea value={qText} onChange={e => setQText(e.target.value)} rows="2" placeholder="Enter Question Text" className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary"></textarea>
                                    <input type="text" value={op1} onChange={e => setOp1(e.target.value)} placeholder="Option A" className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                    <input type="text" value={op2} onChange={e => setOp2(e.target.value)} placeholder="Option B" className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                    <input type="text" value={op3} onChange={e => setOp3(e.target.value)} placeholder="Option C" className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                    <input type="text" value={op4} onChange={e => setOp4(e.target.value)} placeholder="Option D" className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                    <div>
                                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Correct Answer</label>
                                        <select value={correct} onChange={e => setCorrect(e.target.value)} className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary font-bold">
                                            <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                                        </select>
                                    </div>
                                    <button onClick={addQuestion} className="w-full bg-primary text-on-primary py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dim transition-all">Add to Exam</button>
                                </div>
                            </div>

                            {/* AI Question Generator */}
                            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">🤖 AI Question Generator</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Syllabus PDF</label>
                                        <input type="file" onChange={e => setPdfFile(e.target.files[0])} accept=".pdf" className="w-full text-xs text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-secondary-container file:text-primary cursor-pointer" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Count</label>
                                            <select value={aiCount} onChange={e => setAiCount(e.target.value)} className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold">
                                                <option value="10">10</option>
                                                <option value="20">20</option>
                                                <option value="30">30</option>
                                                <option value="50">50</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Difficulty</label>
                                            <select value={aiDifficulty} onChange={e => setAiDifficulty(e.target.value)} className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm font-bold">
                                                <option value="Easy">Easy</option>
                                                <option value="Medium">Medium</option>
                                                <option value="Hard">Hard</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button onClick={generateAI} disabled={aiGenerating} className="w-full bg-secondary-container text-primary py-2.5 rounded-xl font-bold text-sm hover:bg-primary hover:text-white transition-all">
                                        {aiGenerating ? 'Generating...' : 'Generate Questions'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Question List Column */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Questions Added</h3>
                                        <span className="bg-secondary-container text-primary text-xs font-bold px-2.5 py-0.5 rounded-full">{questionList.length}</span>
                                    </div>
                                    <button onClick={saveExam} className="bg-primary text-on-primary px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-dim transition-all">💾 Save Exam</button>
                                </div>
                                <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
                                    {questionList.length === 0 ? (
                                        <div className="text-center py-16 border border-dashed border-outline-variant/20 rounded-xl">
                                            <span className="material-symbols-outlined text-4xl text-outline mb-2">post_add</span>
                                            <h4 className="text-sm font-bold text-on-surface">No Questions Yet</h4>
                                            <p className="text-xs text-outline mt-1">Add questions manually using the left panel or generate them with AI.</p>
                                        </div>
                                    ) : (
                                        questionList.map((q, i) => (
                                            <div key={i} className="bg-surface-container-low border border-outline-variant/10 rounded-xl p-4 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-primary text-on-primary text-xs font-bold px-2 py-0.5 rounded-full">Q{i + 1}</span>
                                                        <span className="text-xs font-bold text-outline">MCQ • {q.marks || 1} Mark</span>
                                                    </div>
                                                    <button onClick={() => removeQuestion(i)} className="text-error hover:bg-error/10 p-1 rounded-lg"><span className="material-symbols-outlined text-sm">delete</span></button>
                                                </div>
                                                <p className="font-bold text-sm text-on-surface">{q.question}</p>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div className={`p-2 rounded-lg font-medium ${q.correct_answer === 'A' ? 'bg-success/10 text-success font-bold' : 'bg-surface-container-lowest text-on-surface-variant'}`}>A. {q.option1}</div>
                                                    <div className={`p-2 rounded-lg font-medium ${q.correct_answer === 'B' ? 'bg-success/10 text-success font-bold' : 'bg-surface-container-lowest text-on-surface-variant'}`}>B. {q.option2}</div>
                                                    <div className={`p-2 rounded-lg font-medium ${q.correct_answer === 'C' ? 'bg-success/10 text-success font-bold' : 'bg-surface-container-lowest text-on-surface-variant'}`}>C. {q.option3}</div>
                                                    <div className={`p-2 rounded-lg font-medium ${q.correct_answer === 'D' ? 'bg-success/10 text-success font-bold' : 'bg-surface-container-lowest text-on-surface-variant'}`}>D. {q.option4}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Subject Modal */}
            {modalActive && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center">
                            <h3 className="font-bold text-sm text-on-surface">Select Subject</h3>
                            <button onClick={() => setModalActive(false)} className="p-1 hover:bg-surface-container rounded-lg"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
                            {subjectsList.length === 0 ? (
                                <p className="text-center text-xs text-outline py-6">No subjects found</p>
                            ) : (
                                subjectsList.map(s => (
                                    <button key={s.id} onClick={() => { setSubjectVal(s.subject_name); setSubjectId(s.id); setModalActive(false); }} className="w-full text-left p-3 rounded-xl hover:bg-surface-container-low transition-all flex justify-between items-center text-sm font-bold text-on-surface">
                                        <span>{s.subject_name}</span>
                                        <span className="bg-secondary-container text-primary text-xs px-2 py-0.5 rounded-full">{s.subject_code || '-'}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
