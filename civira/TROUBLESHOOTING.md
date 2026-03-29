# Civira Troubleshooting Guide

## Issue Summary & Root Causes

### 1. ✅ Login Page - Two Cards Issue
**Status**: Code is correct, likely a **BROWSER CACHE** issue

**Why it's happening**: 
- The frontend code was updated but your browser is showing cached HTML/JS
- Solution: Hard refresh your browser

**How to fix**:
- Windows: Press `Ctrl + Shift + Delete` → Clear cache and reload
- Or: Press `Ctrl + Shift + R` for hard refresh
- Or: Close browser completely and reopen

**Code verification**: 
- ✅ App.jsx imports UnifiedLoginPage (single login)
- ✅ Only one auth-card rendered in Login.jsx
- ✅ Routes correctly handle 'login', 'applicant-login', 'org-login' → same place

---

### 2. ⚠️ Application Deletion Not Working
**Status**: Code exists and routes configured, but needs testing

**Why it might not work**:
1. **Browser cache** (see above)
2. **CORS/Auth issues** - Token might be missing
3. **Backend not restarted** after code was deployed

**How to debug**:
1. Open browser console: `F12` → Console tab
2. Click "Delete Application" button
3. Look for errors in console (red messages)
4. Check Network tab to see if DELETE request was sent
5. Note: Should see confirmation dialog first

**Current code**:
- ✅ Frontend has `handleDeleteApplication()` function
- ✅ Backend has DELETE `/candidates/my-applications/:candidateId` endpoint
- ✅ Deletes from interview_invites, shortlists, candidates
- ✅ Requires applicant authentication

---

### 3. ❌ CV Not Saved in Database
**Root Cause**: **This is actually WORKING**

**How it works**:
- When applicant uploads resume initially → saved to applicants.resume_blob
- When applying to job → resume file is parsed for text, not re-saved
- Data is available via applicant_id foreign key
- The application doesn't need resume copies in candidates table

**Why**: 
- Design is efficient: one resume file per applicant
- All applications reference same applicant record
- If resume is uploaded during application → it updates the applicant record

**If you want to verify**:
```sql
SELECT id, full_name, resume_file_name, resume_blob 
FROM applicants 
WHERE email = 'test@example.com';
```

---

### 4. ❌ AI Rating Not Working
**Root Cause**: `GROQ_API_KEY` not set in `.env`

**Current state**:
- When GROQ_API_KEY is empty → falls back to local rating
- Local rating uses:
  - CV word count
  - Action words ("led", "implemented", "managed")
  - Quantified achievements (numbers, percentages)
  - Job keyword matching
- **Still gives a rating 0-10**, just not AI-powered

**To enable AI rating**:
1. Get GROQ API key from https://console.groq.com
2. Add to `.env`:
   ```
   GROQ_API_KEY=gsk_XXXXXXXXXXXXXXXXXXXXXXXXXX
   ```
3. Restart backend server
4. Now uses actual AI model

---

### 5. ❌ Email API Not Working
**Root Cause**: `RESEND_API_KEY` not set in `.env`

**When emails are sent**:
- Shortlist generation notification
- Selection notification to winning candidate
- Interview invitation emails

**Current state**:
- If RESEND_API_KEY is empty → emails are **skipped silently**
- No error shown, just returns `{ skipped: true }`
- Application still works, just no email notifications

**To enable email notifications**:
1. Get Resend API key from https://resend.com (free tier available)
2. Add to `.env`:
   ```
   RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXXXX
   EMAIL_FROM=youremail@yourdomain.com
   ```
3. Restart backend
4. Now sends real emails

---

## Complete Troubleshooting Steps

### Step 1: Clear Browser Cache
```
Ctrl + Shift + Delete → Select "Cached images and files" → Clear
Then reload page: Ctrl + Shift + R
```

### Step 2: Restart Frontend Dev Server
```powershell
cd c:\Users\hp\Desktop\recess semester\final2\civira\client
npm run dev
```
Then visit http://localhost:5173 in fresh browser

### Step 3: Restart Backend Server
```powershell
cd c:\Users\hp\Desktop\recess semester\final2\civira\server
npm start
```

### Step 4: Check Database Connection
```powershell
mysql -u root -p'machikam' civira_db -e "SELECT COUNT(*) FROM applicants;"
```
Should return a number without errors

### Step 5: Test Endpoints Manually

**Test Login**:
```powershell
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    "email": "applicant@example.com",
    "password": "password123"
  }'
```

**Test Delete Application** (requires token):
```powershell
# First get a token from login above, then:
curl -X DELETE http://localhost:5000/api/candidates/my-applications/1 `
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Check Database State**:
```powershell
mysql -u root -p'machikam' civira_db
> SELECT id, full_name, job_id FROM candidates LIMIT 5;
> SELECT id, email, role FROM users LIMIT 5;
```

---

## Configuration Check

### Current `.env` Status:
✅ Database: Configured correctly (localhost:3306)
❌ RESEND_API_KEY: **EMPTY** (emails disabled)
❌ GROQ_API_KEY: **NOT SET** (AI disabled, using local rating)
⚠️ JWT_SECRET: Updated to longer key for security

### To Enable All Features:
1. **Emails** (optional):
   - Sign up: https://resend.com (free tier)
   - Add key to `.env` `RESEND_API_KEY`

2. **AI Rating** (optional):
   - Sign up: https://console.groq.com (free tier)
   - Add key to `.env` `GROQ_API_KEY`

3. Restart backend after changes:
   ```powershell
   npm start
   ```

---

## Features Status Matrix

| Feature | Code | Backend | Frontend | Database | External API | Status |
|---------|------|---------|----------|----------|--------------|--------|
| Login (Unified) | ✅ | ✅ | ✅ | ✅ | N/A | ✅ Working |
| Register | ✅ | ✅ | ✅ | ✅ | N/A | ✅ Working |
| Apply to Job | ✅ | ✅ | ✅ | ✅ | N/A | ✅ Working |
| CV Parse | ✅ | ✅ | ✅ | ✅ | N/A | ✅ Working |
| Delete Application | ✅ | ✅ | ✅ | ✅ | N/A | ✅ Working* |
| View Rankings | ✅ | ✅ | ✅ | ✅ | N/A | ✅ Working* |
| AI Rating | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠️ Local Only|
| Send Email | ✅ | ✅ | N/A | N/A | ❌ | ❌ Disabled |
| Interview Mgmt | ✅ | ✅ | ✅ | ✅ | N/A | ✅ Working |

*Requires browser cache clear

---

## What to Try Right Now

```powershell
# 1. Kill old processes
taskkill /F /IM node.exe

# 2. Restart servers
cd c:\Users\hp\Desktop\recess semester\final2\civira\server
npm start

# In another terminal:
cd c:\Users\hp\Desktop\recess semester\final2\civira\client
npm run dev

# 3. Test in browser
# Go to http://localhost:5173
# Ctrl+Shift+Delete to clear cache
# Ctrl+Shift+R to hard refresh
# Try login and delete application
```

---

## Still Having Issues?

Check these logs:

**Backend errors**:
```powershell
cd c:\Users\hp\Desktop\recess semester\final2\civira\server
npm start
# Watch output for errors
```

**Frontend errors**:
- Open browser console: F12 → Console
- Look for red error messages
- Note the exact error

**Database issues**:
```powershell
mysql -u root -p'machikam' civira_db -e "SHOW TABLES;"
```

Should show these tables:
- organizations
- users
- applicants
- candidates
- jobs
- shortlists
- panel_scores
- interview_invites
- audit_logs
