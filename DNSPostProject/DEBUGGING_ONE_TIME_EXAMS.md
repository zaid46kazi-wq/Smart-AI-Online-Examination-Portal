# One-Time Exam Attempt - Debugging & Testing Guide

## What Was Fixed

### 1. **Frontend (student.html)**
✅ **Issue**: `startExam()` didn't verify attempt status before navigating  
✅ **Fix**: Now calls `/api/exam-status` before allowing navigation

✅ **Issue**: UI flag `already_attempted` wasn't being used properly  
✅ **Fix**: Enhanced to properly disable button and show ATTEMPTED badge

### 2. **Frontend (exam.html)**
✅ **Issue**: Pre-load check fell through to error handler (demo mode)  
✅ **Fix**: Now properly blocks exam if already attempted with clear error handling

✅ **Issue**: Errors in fetch weren't handled correctly  
✅ **Fix**: Added comprehensive error logging and proper return statements

### 3. **Backend (server.js)**

✅ **Issue**: `/api/exams` wasn't properly returning `already_attempted` flag  
✅ **Fix**: Simplified query to use direct `.select()` without count

✅ **Issue**: `/api/exam-status` used incorrect query syntax  
✅ **Fix**: Changed from `{ count: 'exact' }` to proper query with `.limit(1)`

✅ **Issue**: `/api/exam-questions` used deprecated `db.one()` method  
✅ **Fix**: Changed to use `supabase.from().select()` directly

✅ **Issue**: `/api/submit` duplicate check used `db.one()`  
✅ **Fix**: Changed to use `supabase.from().select()` with proper error handling

---

## Testing Steps

### Step 1: Test Dashboard Exam List

```javascript
// In Browser Console while on /student page:
console.log('Testing exam list...');
// Should see:
// ✅ Blue "Start Now" button for new exams
// ✅ Grey "Already Attempted" button for completed exams
// ✅ Orange badge showing "ATTEMPTED"
```

**Expected Output:**
```
[EXAM-LIST] Exam 1 for student 123: already_attempted = false
[EXAM-LIST] Exam 2 for student 123: already_attempted = true
```

---

### Step 2: Verify startExam() Safety Check

```javascript
// Try clicking on an ATTEMPTED exam
// Should see alert: "You have already attempted this exam once"

// Check console for:
[START-EXAM] Student requesting exam X
[START-EXAM] Error checking exam status OR
[START-EXAM] Exam X available for attempt
```

---

### Step 3: Test Pre-Exam Page Load Block

```javascript
// Manually navigate to /exam?id=2 (where you already have a result)

// Should see:
// ✅ Loading message briefly
// ✅ Block page with checkmark
// ✅ Message: "Exam Already Attempted"
// ✅ Message: "You can only attempt each exam once"
// ✅ Return to Dashboard button

// Check console for:
[EXAM-LOAD] Checking attempt status for exam X, student auth: true
[EXAM-LOAD] Status check response: 200
[EXAM-LOAD] Status data: { already_attempted: true }
[EXAM-LOAD] BLOCKING: Student already attempted exam X
```

---

### Step 4: Test Questions Load Block

```javascript
// In Browser Network tab, simulate trying to load questions for already-attempted exam

// API Call:
GET /api/exam-questions/2 (if you already took exam 2)

// Expected Response (403 Forbidden):
{
  "error": "You already submitted this exam. Only one attempt allowed.",
  "timestamp": "2026-04-05T10:30:00Z"
}

// Console should show:
[EXAM-LOAD] BLOCKING: Student already attempted exam 2
```

---

### Step 5: Test Submission Block

```javascript
// Simulate trying to submit same exam twice (advanced testing)

// First submission:
POST /api/submit
{
  "exam_id": 3,
  "answers": {...},
  "autoSubmit": false
}

// Response 200: Success

// Second submission (same exam):
POST /api/submit
{
  "exam_id": 3,
  "answers": {...},
  "autoSubmit": false
}

// Expected Response (403 Forbidden):
{
  "error": "Exam already submitted. One attempt only.",
  "prevScore": 75,
  "timestamp": "2026-04-05T10:31:00Z"
}

// Console should show:
[SUBMIT] Duplicate check for student 456, exam 3: Found 1 existing results
[SECURITY] DUPLICATE SUBMISSION BLOCKED - Student 456 for exam 3
```

---

## Server Logs to Monitor

### Watch for these success indicators:

```
✅ [EXAM-LIST] Exam X for student Y: already_attempted = false
✅ [EXAM-LIST] Exam X for student Y: already_attempted = true
✅ [EXAM-STATUS] Student Y | Exam X | Already Attempted: false
✅ [EXAM-STATUS] Student Y | Exam X | Already Attempted: true (Previous Score: 85)
✅ [EXAM-LOAD] Status check response: 200
✅ [EXAM-LOAD] Proceeding to load exam X
✅ [EXAM-LOAD] BLOCKING: Student already attempted exam X
```

### Watch for these error indicators:

```
❌ [WARN] Failed to check attempts for exam X
❌ [ERROR] Failed to check for duplicate submission
❌ [SECURITY] ATTEMPTED FRAUD
❌ Query failed
❌ [ERROR] Exam status endpoint error
```

---

## Browser DevTools Checks

### Network Tab:

1. **Navigate to Student Dashboard**
   ```
   GET /api/exams → Look for already_attempted field in response
   ```

2. **Click "Start Now" on a new exam**
   ```
   GET /api/exam-status/X → Should return { already_attempted: false }
   GET /api/exam-questions/X → Should return questions
   ```

3. **Try same exam again**
   ```
   GET /api/exam-status/X → Should return { already_attempted: true }
   (No /api/exam-questions call should happen)
   ```

### Console Tab:

```javascript
// Filter log messages
console.log() messages starting with:
- [EXAM-LIST]
- [EXAM-LOAD]
- [START-EXAM]
- [EXAM-STATUS]
- [SUBMIT]
- [SECURITY]
```

---

## Multi-Layer Defense Verification

### Layer 1: UI Prevention ✅
```
Disabled button + Orange badge = Student can't click to start
```

### Layer 2: Function Validation ✅
```
startExam() → Calls /api/exam-status → Blocks if true
```

### Layer 3: Pre-Load Validation ✅
```
loadExam() → Calls /api/exam-status → Shows block page if true
```

### Layer 4: Questions Load Validation ✅
```
/api/exam-questions → Checks results table → 403 if exists
```

### Layer 5: Submission Validation ✅
```
/api/submit → Checks results table → 403 if exists
```

### Layer 6: Database Constraint ✅
```
UNIQUE(student_id, exam_id) → Prevents duplicate at storage level
```

---

## Common Issues & Solutions

### Issue: Students can still take exam multiple times

**Check 1: API Response Format**
```javascript
// /api/exams response should include:
{
  "id": 1,
  "name": "Math Quiz",
  "already_attempted": true,  // ← MUST BE PRESENT
  "exam_name": "Math Quiz"
}
```

**Check 2: Browser Cache**
```
Ctrl+Shift+Delete → Clear cache
OR
Ctrl+Shift+R → Hard refresh
```

**Check 3: Console Logs**
```
Are you seeing [EXAM-LIST], [EXAM-STATUS], [EXAM-LOAD] messages?
If no → Server aren't being called properly
If yes → Check the values returned
```

### Issue: "Exam Already Attempted" not showing

**Check:**
1. Hard refresh (clear cache)
2. Check `/api/exam-status/{id}` response in Network tab
3. Look for `already_attempted: true` in response
4. Check if button is actually disabled on exam list
5. Try direct URL: `/exam?id=X` - should show block page

### Issue: Console shows errors

**Check console for:**
```
❌ "already_attempted is undefined"
   → /api/exams not returning field properly

❌ "Failed to fetch /api/exam-status"
   → Network issue or endpoint broken

❌ "401 Unauthorized"
   → Student not authenticated

❌ "404 Not Found"
   → Endpoint doesn't exist
```

---

## Database Query to Verify

```sql
-- Check if student has results for specific exam
SELECT * FROM results 
WHERE student_id = 123 
AND exam_id = 5;

-- Should return:
-- If 0 rows: Student hasn't attempted exam 5
-- If 1+ rows: Student has attempted exam 5 (should be prevented from attempting again)

-- Check for duplicates (should be 0):
SELECT student_id, exam_id, COUNT(*) as attempt_count
FROM results
GROUP BY student_id, exam_id
HAVING COUNT(*) > 1;
```

---

## Performance Benchmarks

### Expected Response Times:

| Endpoint | Expected Time | Acceptable Max |
|----------|---|---|
| `/api/exams` | 500ms | 1000ms |
| `/api/exam-status/:id` | 100ms | 500ms |
| `/api/exam-questions/:id` | 300ms | 1000ms |
| `/api/submit` | 300ms | 1000ms |

If slower → Check database indexes and query performance

---

## Reset for Testing

If you need to test again:

```javascript
// SQL to reset (USE CAREFULLY):
DELETE FROM results WHERE student_id = 123;
DELETE FROM proctor_status WHERE student_id = 123;

// Then:
// 1. Refresh page
// 2. All exams should show "Start Now" button
// 3. Can take exams again
```

---

## Final Verification Checklist

- [ ] Student sees "ATTEMPTED" badge on completed exams
- [ ] "Start Now" button is disabled for attempted exams
- [ ] Clicking disabled button does nothing
- [ ] Navigating to /exam?id=X shows block page for attempted
- [ ] Console shows proper logging messages
- [ ] Network shows correct API responses
- [ ] Server logs show attempt checks
- [ ] Duplicate submission prevented (403 error)
- [ ] Second student can still take same exam
- [ ] Results display in admin panel

---

## Support

If system still allows multiple attempts:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Check server.js file** - Verify all fixes were applied
3. **Restart server** (npm start or node server.js)
4. **Check database** - Verify results are being saved
5. **Check browser console** - Look for error messages
6. **Check server console** - Look for error logs

---

**Last Updated**: April 5, 2026

