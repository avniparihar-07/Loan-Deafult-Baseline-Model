# 📋 DETAILED DEPLOYMENT STEPS (Frontend + Backend + Database)

## 🎯 Final URLs You'll Get

After completing all steps:
- **Frontend**: `https://your-app.vercel.app` (React UI)
- **Backend**: `https://your-api.railway.app` (Flask API)
- **Database**: PostgreSQL hosted on Railway (auto-managed)

---

---

# 🚀 STEP-BY-STEP DEPLOYMENT GUIDE

---

## PART 1️⃣: FRONTEND DEPLOYMENT ON VERCEL (15 minutes)

### ⏱️ Time Required: 15 minutes

### 📍 Step 1: Go to Vercel Website

1. Open your web browser
2. Go to **https://vercel.com**
3. You'll see the Vercel homepage

### 📍 Step 2: Log In or Sign Up

**If you don't have an account:**
- Click **"Sign Up"** (top right)
- Click **"Continue with GitHub"**
- Authorize Vercel to access your GitHub

**If you already have an account:**
- Click **"Log In"** (top right)
- Log in with GitHub

### 📍 Step 3: Import Your Repository

After logging in, you're in the Vercel Dashboard:

1. Look for **"Add New..."** button (top right, or near your profile)
2. Click **"Add New..."**
3. From the dropdown, select **"Project"**

You'll see: "Import Git Repository"

4. In the search box, type: **`Loan-Deafult-Baseline-Model`**
5. Your GitHub repository appears in the list
6. Click on it to select
7. Click **"Import"** button

### 📍 Step 4: Verify Build Settings

After importing, Vercel shows the configuration page:

You should see:
```
Project Name: Loan-Deafult-Baseline-Model
Framework Preset: Vite (auto-detected ✅)
Root Directory: . or ./
Build Command: cd frontend && npm install && npm run build
Output Directory: frontend/dist
```

**✅ These are already set in your `vercel.json` file. No changes needed!**

8. Scroll down and click **"Deploy"** button

### 📍 Step 5: Wait for Build & Deployment

Vercel will now:
1. Download your code from GitHub
2. Install dependencies (`npm install`)
3. Build your React app (`npm run build`)
4. Upload to their CDN

**⏳ This takes 2-5 minutes.** You'll see a progress bar.

### 📍 Step 6: Deployment Complete! 🎉

When done, you'll see:
```
✅ Deployment Successful!
```

You'll get a URL like:
```
https://loan-deafult-baseline-model.vercel.app
```

**🔖 Save this URL!** You'll need it later.

### ✅ Frontend Deployment Complete!

Your React frontend is now live on the internet! 🌍

---

---

## PART 2️⃣: BACKEND + DATABASE DEPLOYMENT ON RAILWAY (20 minutes)

### ⏱️ Time Required: 20 minutes

### 📍 Step 1: Go to Railway Website

1. Open a new browser tab
2. Go to **https://railway.app**
3. Click **"Start Project"** button

### 📍 Step 2: Sign Up / Log In

**If first time:**
- Click **"Start Project"** 
- Click **"Deploy from GitHub repo"**
- Authorize Railway to access GitHub

**If already signed up:**
- Log in with GitHub

### 📍 Step 3: Create New Project & Deploy Backend

1. After logging in, click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. Search for: **`Loan-Deafult-Baseline-Model`**
4. Click to select your repository
5. Click **"Deploy"** or **"Next"**

Railway will scan your repo and auto-detect:
```
✅ Detected: Flask service in ml-service/
✅ Detected: Procfile
✅ Detected: requirements.txt
```

6. Click **"Continue"** or **"Deploy"**

**⏳ This takes 3-5 minutes while Railway:**
- Installs Python dependencies
- Starts the Flask server
- Allocates memory and CPU

### 📍 Step 4: Add PostgreSQL Database

Once Flask finishes deploying:

1. In Railway project dashboard, click **"Add Service"** or **"+"** button
2. From the menu, select **"Add from Template"** or **"Database"**
3. Choose **"PostgreSQL"**
4. Railway creates a PostgreSQL database automatically

You'll now see two services:
```
├── ml-service (Flask API) ✅ Deployed
└── postgres (Database) ✅ Creating...
```

**⏳ Database creation takes 1-2 minutes**

### 📍 Step 5: Get Backend URL

1. Click on **"ml-service"** service in your Railway project
2. Go to the **"Deployments"** tab
3. Look for the **"URL"** or **"Domain"** section
4. Copy the URL (format: `https://your-service-name.railway.app`)

**🔖 Save this URL!** You'll need it for the frontend.

Example:
```
https://loan-default-api.railway.app
```

### ✅ Backend Deployment Complete!

Your Flask API is now running! 🚀

---

---

## PART 3️⃣: CONFIGURE ENVIRONMENT VARIABLES (10 minutes)

### ⏱️ Time Required: 10 minutes

### 📍 Step 1: Set Backend Environment Variables on Railway

1. Go to your Railway project dashboard
2. Click on the **"ml-service"** box
3. Click the **"Variables"** tab

4. Add these variables (click **"New Variable"**):

**Variable 1:**
```
Name: FLASK_ENV
Value: production
```

**Variable 2:** (Railway auto-creates this, but verify it exists)
```
Name: DATABASE_URL
Value: postgresql://user:password@host:port/railway
```

5. These are auto-set by Railway, but you can verify they're there

6. Click **"Update Variables"** or **"Save"**

### 📍 Step 2: Set Frontend Environment Variables on Vercel

Now you need to tell your frontend where the backend is:

1. Go to **https://vercel.com**
2. Click on your **"Loan-Deafult-Baseline-Model"** project
3. Click **"Settings"** (top menu)
4. In left sidebar, click **"Environment Variables"**

5. Add this variable:

**Variable:**
```
Name: VITE_API_URL
Value: https://your-backend-url.railway.app
```

(Replace with your actual Railway backend URL from Part 2️⃣ Step 5)

Example:
```
Name: VITE_API_URL
Value: https://loan-default-api.railway.app
```

6. Click **"Save"**

### 📍 Step 3: Redeploy Frontend

Since you changed environment variables, you need to rebuild:

1. In Vercel dashboard, go to **"Deployments"** tab
2. Find your latest deployment (top of list)
3. Click the **"..."** (three dots) menu
4. Click **"Redeploy"** (or "Redeploy without cache")
5. Click **"Redeploy"** button in the popup

**⏳ This takes 2-3 minutes**

When done, you'll see ✅ **Deployment Successful** again.

### ✅ Environment Variables Configured!

Your frontend now knows where the backend is! 🔗

---

---

## PART 4️⃣: INITIALIZE DATABASE (5 minutes)

### ⏱️ Time Required: 5 minutes

Your database exists, but it needs **tables**. Let's create them.

### 📍 Step 1: Update Requirements

Verify your `ml-service/requirements.txt` has:
```
flask
flask-cors
pandas
scikit-learn
numpy
joblib
SQLAlchemy
psycopg2-binary
gunicorn
```

✅ **Already done** - we added gunicorn earlier.

### 📍 Step 2: Create Database Initialization

We created `ml-service/init_db.py` file for you (it's in the project now).

### 📍 Step 3: Push to GitHub & Railway Auto-Deploys

1. Commit the database initialization file:
```powershell
git add ml-service/init_db.py
git commit -m "Add database initialization script"
git push origin main
```

2. Railway will auto-deploy your backend with this file

### 📍 Step 4: Initialize Database Tables

**Option A: Run Initialization Script (Recommended)**

Run your Flask API once to create tables. The database setup happens on first API call if your code handles it.

Or manually run the init script on Railway:

1. Go to Railway dashboard
2. Click **"ml-service"**
3. Click **"Logs"** tab and watch the startup

If you see:
```
✅ Database tables created successfully!
```

Then you're good! ✅

**Option B: Manual Database Setup**

If you need to manually create tables:

1. Go to Railway postgres service
2. Click **"Connect"** tab
3. Copy the PostgreSQL connection string
4. Use a PostgreSQL client (like pgAdmin or DBeaver) to connect and run:

```sql
-- Tables will be created automatically by SQLAlchemy
-- Or run the init_db.py script
```

### ✅ Database Tables Ready!

Your PostgreSQL database now has tables for Users and Predictions! 🗄️

---

---

## PART 5️⃣: TEST EVERYTHING (10 minutes)

### ⏱️ Time Required: 10 minutes

### 📍 Test 1: Backend Health Check

1. Open a new browser tab
2. Go to:
```
https://your-backend-url.railway.app/api/health
```

Example:
```
https://loan-default-api.railway.app/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "version": "1.0.0"
}
```

✅ **If you see this** → Backend is working!

❌ **If you get error** → Check Railway logs for errors

### 📍 Test 2: Frontend Load

1. Go to your frontend URL:
```
https://loan-deafult-baseline-model.vercel.app
```

**Expected:**
- You see the React app load
- No errors in browser console (press F12)

### 📍 Test 3: Frontend Connects to Backend

1. In the app, try to make a prediction
2. Fill in sample data and click "Predict"

**Expected:**
- Prediction loads
- Result shows on screen
- No CORS errors in browser console

### 📍 Test 4: Check Logs

**Frontend Logs (Vercel):**
1. Go to Vercel dashboard
2. Click your project
3. Click "Deployments"
4. Click the deployment
5. View build logs (no errors?)

**Backend Logs (Railway):**
1. Go to Railway dashboard
2. Click "ml-service"
3. Click "Logs" tab
4. Watch in real-time as requests come in

### ✅ Everything Working!

Your full stack is deployed and communicating! 🎉

---

---

## PART 6️⃣: CONNECT EVERYTHING (Diagram)

```
User's Browser
      ↓
┌─────────────────────────────────────┐
│  Frontend (Vercel)                  │
│  https://app.vercel.app             │
│  - React code                       │
│  - Uses VITE_API_URL env var        │
└──────────────┬──────────────────────┘
               │ Makes API calls
               ↓
┌─────────────────────────────────────┐
│  Backend (Railway)                  │
│  https://api.railway.app            │
│  - Flask server (api.py)            │
│  - /api/predict endpoint            │
│  - /api/health endpoint             │
└──────────────┬──────────────────────┘
               │ Connects to
               ↓
┌─────────────────────────────────────┐
│  Database (Railway PostgreSQL)       │
│  - Stores Users                     │
│  - Stores Predictions               │
│  - DATABASE_URL env var             │
└─────────────────────────────────────┘
```

---

---

## TROUBLESHOOTING GUIDE

### ❌ Issue: "CORS Error" or "Failed to fetch from backend"

**Causes:**
- Backend URL wrong in Vercel environment variable
- Frontend not redeployed after setting env var
- CORS not enabled in Flask

**Fix:**
1. Check `VITE_API_URL` in Vercel is correct
2. Verify it matches your Railway backend URL
3. Check that Flask has `CORS(app)` in `api.py`
4. Redeploy frontend on Vercel
5. Check browser Network tab (F12) to see actual error

### ❌ Issue: "Database connection error"

**Causes:**
- PostgreSQL service not running
- DATABASE_URL not set
- Firewall/network issue

**Fix:**
1. Go to Railway dashboard
2. Check postgres service is running (not stopped)
3. Check ml-service has DATABASE_URL environment variable
4. Check Railway logs for connection errors

### ❌ Issue: "Model not loaded"

**Causes:**
- Model artifacts not in `ml-service/model_artifacts/`
- Model files not uploaded to Railway

**Fix:**
1. Run `python train_model.py` locally first
2. Commit model files to Git
3. Push to GitHub
4. Railway will deploy with model files

### ❌ Issue: Frontend shows "Cannot GET /"

**Causes:**
- Vercel not configured correctly
- Build failed silently

**Fix:**
1. Go to Vercel deployments
2. Check build logs (click on deployment)
3. Look for errors during `npm run build`
4. Fix errors and redeploy

---

---

## FINAL DEPLOYMENT CHECKLIST

**Frontend:**
- [ ] Code pushed to GitHub
- [ ] vercel.json exists in root
- [ ] Project imported on Vercel
- [ ] Frontend deployed ✅
- [ ] Frontend URL saved
- [ ] VITE_API_URL environment variable set
- [ ] Frontend redeployed after env var change

**Backend:**
- [ ] Code pushed to GitHub
- [ ] Procfile exists in ml-service/
- [ ] requirements.txt has gunicorn
- [ ] api.py updated for production
- [ ] Backend deployed on Railway ✅
- [ ] Backend URL saved
- [ ] FLASK_ENV environment variable set

**Database:**
- [ ] PostgreSQL database created on Railway ✅
- [ ] DATABASE_URL set in ml-service environment
- [ ] Database tables created ✅
- [ ] Connection tested

**Integration:**
- [ ] Frontend can call backend ✅
- [ ] Backend returns health check ✅
- [ ] Predictions save to database ✅
- [ ] No CORS errors ✅

---

---

## YOUR DEPLOYMENT IS COMPLETE! 🎉

### Final URLs:
```
Frontend:  https://loan-deafult-baseline-model.vercel.app
Backend:   https://your-api.railway.app
Database:  Hosted on Railway PostgreSQL
```

### What's Running:
- ✅ React frontend on Vercel CDN
- ✅ Flask API on Railway container
- ✅ PostgreSQL database on Railway
- ✅ All components communicating

### Next Steps:
- Monitor logs on Railway & Vercel
- Set up domain name (optional)
- Enable analytics (optional)
- Configure backups (optional)

---

## 📞 NEED HELP?

**Check logs first:**
1. Vercel: Deployments → Click deployment → View logs
2. Railway: Click service → Logs tab → Watch in real-time

**Common fixes:**
- Redeploy after changing environment variables
- Wait 2-3 minutes for services to fully start
- Clear browser cache (Ctrl+Shift+Delete)
- Check network errors in browser (F12)

---

**🚀 Your project is now deployed globally!**
