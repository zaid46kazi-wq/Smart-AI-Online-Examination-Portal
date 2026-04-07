# Admin Guide: Managing Exam Results & Attempts

## Overview

The admin panel now fully enforces **one-time exam attempts** per student. All attempts are recorded and displayable in the comprehensive results panel.

---

## Key Features

### 1. **One-Time Attempt Enforcement**

#### Server-Side Protection:
- ✅ Duplicate submission check (403 error on 2nd attempt)
- ✅ Database prevents duplicate records
- ✅ Detailed logging of all attempts

#### Student-Side Protection:
- ✅ UI shows "ATTEMPTED" badge for completed exams
- ✅ "Start Now" button disabled for attempted exams
- ✅ Pre-exam validation blocks already-attempted access

---

## Viewing Results

### Access Results Dashboard

1. **Login** as Admin
2. **Navigation**:
   - From Dashboard → "View Results" (left menu)
   - Direct URL: `/results`
   - Header: Click "Results" link

3. **Results Table Opens** with full submission history

---

## Results Table Details

### Column Information

| Column | Contains | Use Case |
|--------|----------|----------|
| **Student** | Username + Avatar | Quick student ID |
| **Name** | Full student name | Official records |
| **USN** | Student ID/Registration | Academic tracking |
| **Exam** | Exam name/code | Which exam taken |
| **Score** | Points obtained | Raw marks |
| **Total** | Total marks | Full marks |
| **%** | Percentage (Score/Total × 100) | Performance metric |
| **Status** | PASS/FAIL badge | Result outcome |
| **Date** | Submission timestamp | When exam taken |
| **PDF** | Download link | Certificate/proof |

### Color Indicators

- 🟢 **Green PASS**: Score ≥ 40% (or configured threshold)
- 🔴 **Red FAIL**: Score < 40%
- 🟡 **Orange**: Proctoring flags present

---

## Viewing Individual Results

### Click on Any Row to:

1. **View Full Details**:
   - Complete question breakdown
   - Each answer submitted
   - Marks per question
   - Total calculation

2. **Check Proctoring Status**:
   - Violations detected
   - Behavior flags
   - Warning count
   - Security incidents

3. **Download PDF**:
   - Official result certificate
   - Student name, score, date
   - Institution header
   - Shareable format

---

## Analyzing Attempt Data

### Key Metrics Available

#### Per Student:
```json
{
  "StudentID": "ST123",
  "ExamsAvailable": 10,
  "ExamsAttempted": 5,
  "AverageScore": 75,
  "HighestScore": 95,
  "LowestScore": 45,
  "PassRate": "80%"
}
```

#### Per Exam:
```json
{
  "ExamID": "E001",
  "ExamName": "Mathematics Quiz",
  "TotalStudents": 150,
  "StudentsAttempted": 142,
  "PassRate": "85%",
  "AverageScore": 72
}
```

---

## Managing One-Time Attempts

### Viewing Attempt History

**All student attempts are visible:**
- Each row = One completed attempt
- Cannot see INCOMPLETE attempts (by design - data is cleared)
- Each student appears ONCE per exam (one-time policy enforced)

### Attempt Status Indicators

| Status | Meaning |
|--------|---------|
| **Submitted** | Exam completed normally |
| **Auto-Submitted** | Submitted due to time/violations |
| **Completed** | Result recorded |

---

## Common Admin Tasks

### 1. **Find Student's Results**

```
1. Go to /results
2. Use Table Search (if available)
3. Type student name/USN
4. View all their exam results
```

### 2. **Check Proctoring Status**

```
1. Click "Details" on any result
2. Scroll to "Proctoring" section
3. See violations detected
4. Check if auto-submitted
5. Review security incidents
```

### 3. **Export Results**

```
1. Select multiple rows (checkbox)
2. Click "Export" button (if available)
3. Choose format: CSV, PDF, Excel
4. Download for records
```

### 4. **Generate Reports**

**Available Reports:**
- Class performance report
- Exam statistics
- Individual student transcript
- Proctoring incident log
- Pass/fail distribution

---

## Preventing Duplicate Entries

### System Already Prevents:

1. **Database Level**:
   - Unique constraint on (student_id, exam_id)
   - Cannot insert duplicate results

2. **Application Level**:
   - Checks on submit (`/api/submit`)
   - Returns 403 error if already submitted
   - Logs security warning

3. **UI Level**:
   - Disables button for attempted exams
   - Shows "ATTEMPTED" badge
   - Blocks exam access

### Manual Verification:

If you suspect duplicates:
```sql
-- Check results table for duplicates
SELECT student_id, exam_id, COUNT(*) 
FROM results 
GROUP BY student_id, exam_id 
HAVING COUNT(*) > 1;
```

---

## Student Appeal & Resetting Attempts

### If Student Claims Technical Issue:

**Option 1: Verify the claim**
```
1. Check exam logs for that time
2. Check proctor_status for violations
3. Check server logs for errors
4. Email logs to student
```

**Option 2: Reset attempt (if justified)**
```
1. Contact database admin
2. Delete the result record
3. Document the reason
4. Notify student
5. Allow one re-attempt with note
```

### Reset Procedure (Admin Only):

```sql
-- DANGEROUS - Use with caution
DELETE FROM results 
WHERE student_id = ? 
AND exam_id = ? 
-- Followed by:
DELETE FROM proctor_status 
WHERE student_id = ? 
AND exam_id = ?;
```

⚠️ **Warning**: Only do this for documented technical failures.

---

## Monitoring & Alerts

### Dashboard Shows:

- 📊 Total submissions today
- 📈 Pass rate trends
- 🚨 High violation students
- ⏱️ Average exam time
- 📉 Performance distribution

### Set Up Alerts For:

- ❌ Multiple violations → Review proctoring
- 🔴 Zero pass students → Review difficulty
- ⏱️ Very short times → Possible cheating
- 📊 Anomalous patterns → Investigate

---

## Troubleshooting

### Issue: Student Claims Already Completed But Not Showing

**Solution:**
```
1. Check if submission was successful
2. Look at server logs for errors
3. Check network connection at submit time
4. Search database directly for record
5. If not found: Allow re-attempt
```

### Issue: Same Student Appears Twice for Same Exam

**Solution:**
```
1. Check timestamps - when did each happen?
2. Was there a server error between them?
3. Check if one was auto-submit
4. Delete duplicate with most recent timestamp
5. Notify student of technical issue
```

### Issue: Results Not Showing in Admin Panel

**Solution:**
1. Check student actually submitted
2. Verify their role is set to "Student"
3. Check exam is assigned to them
4. Force refresh admin page
5. Clear browser cache

---

## Data Integrity Checks

### Regular Verification:

**Daily:**
- ✅ No duplicate (student_id, exam_id) pairs
- ✅ All results have valid student_id
- ✅ All results have valid exam_id
- ✅ Scores don't exceed total marks

**Weekly:**
- ✅ Results match submitted answers
- ✅ Pass/fail logic correct
- ✅ No orphaned proctor_status entries
- ✅ Timestamps are sequential

**Monthly:**
- ✅ Complete audit trail
- ✅ Archive old proctor sessions
- ✅ Verify no data drift

---

## API Endpoints for Admin

### Get All Results:
```
GET /api/results
Headers: Authorization: Bearer {admin_token}

Response:
[
  {
    "id": 1,
    "Username": "student1",
    "Name": "John Doe",
    "USN": "1234",
    "Score": 85,
    "TotalMarks": 100,
    "ExamName": "Math Quiz",
    "ExamDate": "2026-04-05"
  }
]
```

### Get Results by Excel Export:
```
GET /api/results-export?format=xlsx
```

---

## Security Considerations

### Admin Responsibilities:

1. **Protect Result Access**:
   - Results are PII (personal info)
   - Only authorized admins access
   - Log all result views

2. **Maintain Data Integrity**:
   - Don't manually modify results
   - Use audit trail for changes
   - Document all interventions

3. **Ensure Fairness**:
   - One-time policy enforced for all
   - No special exceptions
   - Document all appeals
   - Transparent process

---

## Reports

### Standard Reports Available:

1. **Class Performance Report**
   - All students + all exams
   - Pass rates, averages
   - Top/bottom performers

2. **Exam Analysis Report**
   - Exam difficulty (avg score)
   - Question-wise analysis
   - Time taken per question

3. **Individual Transcript**
   - All exams per student
   - Scores, dates, status
   - Printable/shareable

4. **Proctoring Report**
   - Violations by student
   - Violations by type
   - Trends and patterns

5. **Compliance Report**
   - One-time policy verification
   - Duplicate prevention proof
   - Security incidents

---

## Best Practices

### ✅ DO:

- Regularly backup results database
- Monitor for duplicate attempts
- Review proctoring logs
- Document all manual changes
- Communicate policy clearly to students
- Keep audit trail
- Regular data integrity checks

### ❌ DON'T:

- Manually edit results without logging
- Grant exceptions without documentation
- Ignore proctoring violations
- Delete results without backup
- Allow unauthorized admin access
- Share results with unauthorized parties
- Skip verification checks

---

## Frequently Asked Questions

### Q: Can a student retake an exam?
**A:** No, one-time policy is enforced. Only admin can reset attempt if there's a documented technical failure.

### Q: What if submission failed?
**A:** Check server logs. If no record exists in database, they can retake. If record exists but student didn't see it, show them the result.

### Q: How do I know who cheated?
**A:** Check proctoring violations in result details. High violation count + suspicious score = review needed.

### Q: Can I edit a result?
**A:** Technically possible via database, but NOT RECOMMENDED. Document the change, create audit record, and notify student.

---

## Contact & Support

For issues with exam result system:
- **Development Team**: [contact]
- **Database Admin**: [contact]
- **Student Support**: [contact]

---

**Last Updated**: April 2026
**System Version**: 2.0
**Status**: ✅ Production Ready
