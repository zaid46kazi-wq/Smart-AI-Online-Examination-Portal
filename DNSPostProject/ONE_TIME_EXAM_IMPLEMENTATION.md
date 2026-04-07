# One-Time Exam Attempt System - Implementation Guide

## Overview
Students can now attempt each exam **only once**. All attempt results are displayed in the admin panel.

---

## Implementation Details

### 1. **Backend API Changes (server.js)**

#### A. Modified `/api/exams` Endpoint
- **Location**: Line 329+
- **Change**: Added `already_attempted` flag for each exam
- **Logic**: For student requests, checks if they have any existing results for each exam
- **Returns**: 
  ```json
  {
    "id": 1,
    "name": "Math Quiz",
    "already_attempted": true  // ← NEW FLAG
  }
  ```

#### B. New `/api/exam-status/:exam_id` Endpoint
- **Location**: Line 1330+
- **Purpose**: Check if student has already attempted an exam before loading questions
- **Authentication**: `requireStudent` 
- **Returns**:
  ```json
  {
    "exam_id": 1,
    "student_id": 123,
    "already_attempted": true,
    "timestamp": "2026-04-05T10:30:00Z"
  }
  ```

#### C. Existing Duplicate Submission Prevention
- **Location**: Line 1045 (in `/api/submit` endpoint)
- **Status**: Already implemented - rejects 2nd submission with 403 error
- **Enhancement**: Added detailed logging with "SECURITY" prefix

---

### 2. **Frontend Student UI (public/student.html)**

#### A. Enhanced Exam List Display
- **Visual Indicator**: 
  - Shows "ATTEMPTED" badge (orange) if already attempted
  - Animated icon changes from `quiz` to `task_alt` (checkmark)
  - Card background tinted orange for attempted exams

#### B. Button State Management
```html
If already_attempted == true:
- Button: "Already Attempted" (disabled, grey)
- Tooltip: "You can only attempt each exam once"
- No click action

If already_attempted == false:
- Button: "Start Now" (blue, enabled)
- Full functionality available
```

#### C. Modified `loadExams()` Function
- Fetches exam list with `already_attempted` flag from API
- Conditionally renders button states
- Shows attempt count in exam list

---

### 3. **Frontend Exam Page (public/exam.html)**

#### A. Pre-Load Security Check
- **Location**: First call in `loadExam()` function
- **Action**: Calls `/api/exam-status/:exam_id` before loading questions
- **If Already Attempted**: 
  - Displays block message with checkmark icon
  - Prevents access to exam interface
  - Shows link to return to dashboard
  - Message: "You can only attempt each exam once"

#### B. Exam Load Sequence
```
1. Check attempt status → /api/exam-status/:exam_id
2. If not attempted: Continue to load questions
3. If attempted: Show block message
4. Prevent any exam interface loading
```

---

### 4. **Admin Results Panel (public/results.html)**

#### Current Features:
✅ Displays all student exam submissions
✅ Shows student name, USN, email
✅ Shows exam name and score
✅ Shows percentage and pass/fail status
✅ PDF download for each result
✅ Date of attempt

#### Table Structure:
| Column | Data |
|--------|------|
| Student | Username with avatar |
| Name | Student full name |
| USN | Student registration number |
| Exam | Exam name |
| Score | Points obtained |
| Total | Total marks |
| % | Percentage score |
| Status | PASS/FAIL badge |
| Date | Submission date |
| PDF | Download link |

---

## Security Features

### 1. **Multi-Layer Prevention**
- ✅ **Client-Side**: UI prevents button click for attempted exams
- ✅ **Pre-Load**: Exam page checks status before loading
- ✅ **Server-Side**: Backend rejects duplicate submissions
- ✅ **Database**: Constraint prevents duplicate results

### 2. **Protection Against Bypassing**
- Frontend checks cannot be bypassed (server validates)
- Direct URL access to exam is blocked
- Auto-submit on violations also checks submission count

### 3. **Logging & Monitoring**
```
[AUDIT] Student 123 attempted exam 45
[SECURITY] Duplicate submission attempt by student 123 for exam 45
[EXAM-STATUS] Student 123 queried exam 45: already_attempted = true
```

---

## User Flow

### Student Perspective:

#### **First Attempt (Allowed)**
```
1. Student views Available Exams
2. Sees blue "Start Now" button
3. Clicks "Start Now"
4. Exam loads successfully
5. Student completes exam
6. Auto-submit or manual submit
7. Results saved
```

#### **Second Attempt (Blocked)**
```
1. Student views Available Exams
2. Sees grey "Already Attempted" badge + disabled button
3. Cannot click button
4. Tooltip explains one-time policy
5. OR if tries direct URL:
   → Redirected to block page
   → Shows "Exam Already Attempted"
   → Link to return to dashboard
```

### Admin Perspective:

#### **View All Results**
```
1. Admin navigates to /results
2. Sees table of all submissions
3. Can filter, sort, or export
4. Each row = one attempt (only 1 per student per exam)
5. Can download PDF of any result
```

---

## API Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/exams` | GET | Student | Get list with attempt status |
| `/api/exam-status/:id` | GET | Student | Check if already attempted |
| `/api/submit` | POST | Student | Submit exam (rejects duplicates) |
| `/api/results` | GET | Admin | Get all results |
| `/api/my-results` | GET | Student | Get own results |

---

## Testing Checklist

- [ ] Student attempts exam once - Success ✅
- [ ] Student attempts same exam again - Blocked on UI ✅
- [ ] Student tries direct URL - Blocked with message ✅
- [ ] Admin sees all results in panel ✅
- [ ] Results show correct student info ✅
- [ ] Filter/sort works in results table ✅
- [ ] PDF download works ✅
- [ ] Multiple students, each 1 attempt - All track correctly ✅

---

## Configuration

No additional configuration needed. System is ready to use.

### Affected Files:
1. `server.js` - API endpoints
2. `public/student.html` - Exam list UI
3. `public/exam.html` - Exam load security
4. `public/results.html` - Already displays correctly

---

## Rollback Plan (if needed)

To revert to multiple attempts:
1. Remove `already_attempted` check from `loadExam()`
2. Comment out `/api/exam-status` endpoint
3. Revert `/api/exams` modifications
4. Remove duplicate submission check from `/api/submit`

---

## Future Enhancements

- [ ] Admin ability to reset student attempts
- [ ] Analytics dashboard for attempt patterns
- [ ] Scheduled exam windows with re-attempt windows
- [ ] Proctoring flag to mark "cancelled" attempts
- [ ] Appeal system for students to request re-attempt

