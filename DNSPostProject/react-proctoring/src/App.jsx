import React from 'react';
import ExamPage from './pages/ExamPage';
import AdminWarnings from './pages/AdminWarnings';

function App() {
  const path = window.location.pathname;

  if (path.includes('/admin/warnings')) {
    return <AdminWarnings />;
  }

  return (
    <div className="App">
      {/* Assuming studentId: 1, examId: 27 for demonstration as per database records */}
      <ExamPage userId={1} examId={27} />
    </div>
  );
}

export default App;
