import React, { useState } from 'react';
import ProctoringFixed from './ProctoringFixed';
import { BookOpen, HelpCircle, Save, Clock, ChevronLeft, ChevronRight, CheckCircle, Info } from 'lucide-react';

const ExamLayout = ({ children, examTitle = "Final Term Examination - Comp Sci" }) => {
  const [activeQuestion, setActiveQuestion] = useState(1);
  const totalQuestions = 30;

  return (
    <div className="min-h-screen bg-slate-950 flex font-['Inter']">

      {/* Column 1: Left - Questions Navigation */}
      <aside className="w-[80px] md:w-[250px] bg-slate-900 border-r border-slate-800 flex flex-col pt-6 fixed left-0 top-0 h-screen overflow-y-auto">
        <div className="px-6 mb-8 text-center md:text-left">
          <BookOpen className="w-8 h-8 text-indigo-500 mb-2 mx-auto md:mx-0" />
          <h3 className="text-white font-bold text-xs uppercase tracking-widest hidden md:block">Navigation</h3>
        </div>

        <div className="flex-1 px-4 grid grid-cols-1 md:grid-cols-4 gap-2 pb-6">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveQuestion(i + 1)}
              className={`w-full aspect-square md:aspect-auto md:p-3 rounded-lg text-xs font-black transition-all flex items-center justify-center border-2 ${activeQuestion === i + 1
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800 hidden md:block bg-slate-900/80 sticky bottom-0">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span className="w-3 h-3 bg-indigo-600 rounded-sm"></span> Current Question
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span className="w-3 h-3 bg-slate-800 border border-slate-700 rounded-sm"></span> Unanswered
            </div>
          </div>
        </div>
      </aside>

      {/* Column 2: Center - Exam Content */}
      <main className="flex-1 ml-[80px] md:ml-[250px] mr-[300px] flex flex-col h-screen overflow-y-auto bg-[#020617] relative">

        {/* Sticky Exam Header */}
        <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 px-8 py-5 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-white font-black text-xl tracking-tight leading-tight">{examTitle}</h1>
            <div className="flex items-center gap-4 mt-1 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-indigo-500" /> 00:43:21 Remaining</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Auto-Save Enabled</span>
            </div>
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-[0.1em] transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
            Submit Exam
          </button>
        </header>

        {/* Content Area */}
        <div className="p-12 max-w-4xl mx-auto w-full pb-32">

          {/* Question Title */}
          <div className="flex items-start gap-5 mb-8">
            <div className="w-14 h-14 bg-indigo-500 text-white flex items-center justify-center rounded-2xl text-2xl font-black shrink-0 shadow-2xl shadow-indigo-500/30">
              {activeQuestion}
            </div>
            <div className="flex flex-col pt-1">
              <span className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.3em] mb-2">Question Header</span>
              <h2 className="text-white font-bold text-2xl leading-relaxed">
                What is the time complexity of the quicksort algorithm in its average case performance?
              </h2>
            </div>
          </div>

          {/* Options List */}
          <div className="space-y-4">
            {['O(n^2)', 'O(n log n)', 'O(n)', 'O(log n)'].map((opt, i) => (
              <button
                key={i}
                className="w-full text-left p-6 bg-slate-900 border-2 border-slate-800 rounded-3xl hover:bg-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 bg-slate-800 text-slate-500 flex items-center justify-center rounded-xl font-black group-hover:bg-indigo-500 group-hover:text-white transition-all">
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-slate-300 font-bold text-lg">{opt}</span>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-slate-700 group-hover:border-indigo-500 transition-all"></div>
              </button>
            ))}
          </div>

          {/* Bottom Navigation */}
          <div className="mt-12 pt-12 border-t border-slate-800/50 flex items-center justify-between gap-4">
            <button className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-slate-400 font-black rounded-2xl hover:text-white transition-all border border-slate-800">
              <ChevronLeft className="w-5 h-5" /> Previous
            </button>
            <button className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20">
              Save & Next <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-8 p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl flex gap-4 text-slate-500 text-xs italic leading-relaxed">
            <Info className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>AI Proctoring is currently tracking your cursor movement and eye-focus. Ensure you do not leave the exam window or interact with external applications.</span>
          </div>
        </div>
      </main>

      {/* Column 3: Right - AI Proctoring Panel */}
      <aside className="w-[300px] h-screen fixed right-0 top-0 bg-slate-900 border-l border-slate-800 shadow-2xl z-50">
        <ProctoringFixed />
      </aside>

    </div>
  );
};

export default ExamLayout;
