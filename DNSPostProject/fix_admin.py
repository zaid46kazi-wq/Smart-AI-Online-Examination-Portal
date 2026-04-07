import sys

with open("public/admin.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the trim index
trim_index = -1
for i, line in enumerate(lines):
    if "if (!username) { alert('Enter username'); return; }" in line:
        trim_index = i
        break

if trim_index == -1:
    print("Could not find anchor text")
    sys.exit(1)

valid_lines = lines[:trim_index + 1]

suffix = """  if (!password) { alert('Enter password'); return; }
  try {
    const res = await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, usn, email, username, password }) });
    const data = await res.json();
    if (res.ok && data.success) { showMsg('Student added successfully'); loadStudents(); loadAnalytics(); }
    else showMsg(data.error || 'Failed', true);
  } catch (e) { showMsg('Error: ' + e.message, true); }
}

async function importStudents() {
  const file = document.getElementById('fileStudents').files[0];
  if (!file) { alert('Select a file'); return; }
  const form = new FormData();
  form.append('file', file);
  try {
    const res = await fetch('/api/students/import', { method: 'POST', body: form });
    const data = await res.json();
    if (res.ok) { showMsg('Imported ' + data.inserted + ' students'); loadStudents(); loadAnalytics(); }
    else showMsg(data.error || 'Failed', true);
  } catch (e) { showMsg('Error: ' + e.message, true); }
}

async function doFactoryReset() {
  if (!confirm('EXTREME DANGER: This will delete ALL students, exams, assessments, and results. Are you ABSOLUTELY sure?')) return;
  if (!confirm('FINAL WARNING: This action is irreversible. Proceed?')) return;
  try {
    const res = await fetch('/api/factory-reset', { method: 'POST' });
    if (res.ok) { window.location.reload(); }
    else { const d = await res.json(); showMsg(d.error || 'Failed', true); }
  } catch (e) { showMsg('Error: ' + e.message, true); }
}

loadAnalytics();
loadExams();
loadSubjects();
loadStudents();

window.currentExamViewId = null;

async function viewIncidents(examId) {
  window.currentExamViewId = examId;
  const modal = document.getElementById('incidentsModal');
  const content = document.getElementById('incidentsContent');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  content.innerHTML = '<div class="col-span-full py-12 text-center text-slate-500">Loading incidents...</div>';
  try {
    const res = await fetch('/api/incidents/' + examId);
    const data = await res.json();
    if (!data || data.length === 0) {
      content.innerHTML = '<div class="col-span-full py-12 text-center text-slate-500">No incidents reported for this exam! ✅</div>';
      return;
    }
    content.innerHTML = data.map(inc => `
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="bg-slate-100 p-2 text-xs font-bold text-slate-600 flex justify-between border-b border-slate-200">
          <span>${new Date(inc.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          <span class="text-red-500 uppercase">${inc.type?.replace('_', ' ') || 'FLAGGED'}</span>
        </div>
        ${inc.image_url ? `<img src="${inc.image_url}" class="w-full h-40 object-cover" />` : `<div class="w-full h-40 flex items-center justify-center bg-slate-50 border-b border-slate-100 text-slate-300 text-xs italic"><span class="material-symbols-outlined mr-1">no_photography</span> No Snapshot</div>`}
        <div class="p-4">
          <div class="flex justify-between items-start mb-2">
            <div>
              <p class="text-sm font-bold text-slate-900">${inc.students?.name || 'Student ID: ' + inc.user_id}</p>
              <p class="text-xs text-slate-500">USN: ${inc.students?.usn || 'N/A'}</p>
            </div>
            <span class="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-1 rounded">Flagged</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error("Incidents fetch error:", e);
    content.innerHTML = '<div class="col-span-full py-12 text-center text-red-500">Error loading incidents</div>';
  }
}
</script>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  // Setup Realtime Subscription
  const _supabase = window.supabase.createClient('https://ttmdiobkwbxyhyasttke.supabase.co', 'sb_publishable_6FWcaoaf5jdqVSB0ZBjWfA_mRwgVzt6');
  _supabase
    .channel('admin-warnings-monitor')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'warnings' }, payload => {
       console.log("Realtime Warning Received:", payload);
       if (window.currentExamViewId && window.currentExamViewId == payload.new.exam_id) {
           viewIncidents(window.currentExamViewId);
       }
    })
    .subscribe();
</script>

<!-- Incidents Modal -->
<div id="incidentsModal" class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm hidden items-center justify-center p-4">
  <div class="bg-surface-container-lowest w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col" style="max-height: 90vh;">
    <div class="px-6 py-5 flex justify-between items-center border-b border-outline-variant/20 bg-surface-container-low">
      <div>
        <h3 class="text-xl font-bold text-on-surface flex items-center gap-2">
            <span class="material-symbols-outlined text-error">policy</span>
            Proctoring Incidents
        </h3>
        <p class="text-xs text-on-surface-variant mt-1">Review AI flagged violations and snapshots</p>
      </div>
      <button onclick="document.getElementById('incidentsModal').classList.add('hidden');document.getElementById('incidentsModal').classList.remove('flex')" class="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-600">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
    <div class="p-6 overflow-y-auto flex-1 bg-slate-100">
      <div id="incidentsContent" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"></div>
    </div>
  </div>
</div>
</body></html>
"""

with open("public/admin.html", "w", encoding="utf-8") as f:
    f.writelines(valid_lines)
    f.write(suffix)

print("done")
