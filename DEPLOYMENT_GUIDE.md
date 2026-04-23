# Complete Deployment Guide: Loan Default Baseline Model

This guide covers deploying your entire project on **Vercel (Frontend)** and **Railway (Backend + Database)**.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     VERCEL (Frontend)                        │
│  React + Vite App → https://your-project.vercel.app        │
└────────────────────────────────────────────────────────────┐
                              ↓ API calls
┌─────────────────────────────────────────────────────────────┐
│              RAILWAY (Backend + Database)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Flask API Server (ml-service)                        │  │
│  │ https://your-backend.railway.app                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ PostgreSQL Database                                  │  │
│  │ Automatically provisioned by Railway                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

# PART 1: DEPLOY FRONTEND ON VERCEL

## Step 1.1: Verify Vercel Configuration Files (ALREADY DONE ✅)

Your project already has:
- ✅ `vercel.json` - Configuration file
- ✅ `frontend/package.json` - Dependencies
- ✅ Frontend code pushed to GitHub

## Step 1.2: Go to Vercel

1. Open **https://vercel.com**
2. Click **"Log in"** (sign in with your GitHub account)
3. If you don't have an account, click **"Sign up"** first

## Step 1.3: Import Your Repository

1. After logging in, you'll see your dashboard
2. Click **"Add New..."** button (top right)
3. Select **"Project"**
4. In the "Import Git Repository" section:
   - Search for: `Loan-Deafult-Baseline-Model`
   - Click on your repository to select it
5. Click **"Import"**

## Step 1.4: Configure Build Settings

After importing, Vercel shows configuration:

```
Project Name: Loan-Deafult-Baseline-Model (or your preferred name)
Framework Preset: Vite (should auto-detect)
Root Directory: ./
Build Command: cd frontend && npm run build
Output Directory: frontend/dist
```

**These are already configured in `vercel.json`** ✅

Click **"Deploy"** to proceed.

## Step 1.5: Wait for Deployment

Vercel will:
1. Build your frontend (`npm run build`)
2. Upload to CDN
3. Generate a URL like: **https://loan-deafult-baseline-model.vercel.app**

**This takes 2-5 minutes.** ⏳

Once done, you'll see: ✅ **Deployment successful**

## Step 1.6: Note Your Frontend URL

Save this URL (you'll need it for the backend):
```
https://loan-deafult-baseline-model.vercel.app
```

---

# PART 2: DEPLOY BACKEND + DATABASE ON RAILWAY

## Step 2.1: Go to Railway

1. Open **https://railway.app**
2. Click **"Start Project"**
3. Sign up or log in with GitHub

## Step 2.2: Create a New Project

1. Click **"New Project"** button
2. Select **"Deploy from GitHub repo"**
3. Authorize Railway to access your GitHub
4. Search for and select: `Loan-Deafult-Baseline-Model`
5. Click **"Deploy now"**

## Step 2.3: Select Service (Backend)

Railway will detect your Flask app automatically.

If it asks for configuration:
- **Service**: Select `ml-service`
- **Root Directory**: `ml-service`

Click **"Deploy"** or **"Continue"**

## Step 2.4: Add PostgreSQL Database

After Flask deploys:

1. Click **"Add"** button in your Railway project
2. Select **"Add a Service"** → **"Database"**
3. Choose **"PostgreSQL"**
4. Railway automatically creates a PostgreSQL database
5. You'll see a new service called "postgres" in your project

## Step 2.5: Connect Backend to Database

Railway automatically sets environment variables:

```
DATABASE_URL=postgresql://user:password@host:port/railway
```

Your Flask app will automatically use this if your `database.py` reads it.

---

# PART 3: CONFIGURE ENVIRONMENT VARIABLES

## Step 3.1: Backend Environment Variables on Railway

Go to your Railway project dashboard:

1. Click on the **"ml-service"** service (Flask app)
2. Click **"Variables"** tab
3. Add these variables:

| Variable | Value |
|----------|-------|
| `FLASK_ENV` | `production` |
| `DATABASE_URL` | *(Auto-set by Railway)* |

**Note**: Railway auto-generates `DATABASE_URL` when you add PostgreSQL.

## Step 3.2: Get Your Backend URL

In Railway dashboard:

1. Click on **"ml-service"**
2. Look for **"Deployments"** tab
3. Copy the **"Domain"** URL
   - Format: `https://your-backend-name.railway.app`
   - Example: `https://loan-default-api.railway.app`

Save this URL for the next step.

## Step 3.3: Frontend Environment Variables on Vercel

Go to your Vercel dashboard:

1. Click on your **"Loan-Deafult-Baseline-Model"** project
2. Go to **"Settings"**
3. Click **"Environment Variables"** (left sidebar)
4. Add this variable:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://your-backend-name.railway.app` |

(Replace with your actual Railway backend URL from Step 3.2)

5. Click **"Save"**

## Step 3.4: Trigger Frontend Redeploy

1. In Vercel, click the **"Deployments"** tab
2. Click the **"..."** menu on the latest deployment
3. Select **"Redeploy"**
4. Click **"Redeploy"** button in the modal

This will rebuild your frontend with the new environment variable.

---

# PART 4: VERIFY DATABASE MIGRATIONS & SETUP

## Step 4.1: Initialize Database Schema

You need to create your database tables. 

**Option A: Using Python Script (Recommended)**

1. Create a new file: `ml-service/init_db.py`

```python
from database import Base, engine

# Create all tables
Base.metadata.create_all(engine)
print("✅ Database tables created successfully!")
```

2. Run locally first:
```powershell
cd ml-service
python init_db.py
```

3. Or add to your `train_model.py` to auto-initialize.

**Option B: Using Railway Terminal**

1. Go to Railway dashboard
2. Click on **"postgres"** service
3. Click **"Connect"** tab
4. Use the provided connection string to connect and run SQL

---

# PART 5: TEST YOUR DEPLOYMENT

## Step 5.1: Test Backend API

1. Go to your backend URL:
   ```
   https://your-backend-name.railway.app/api/health
   ```
   
   You should see:
   ```json
   {
     "status": "healthy",
     "model_loaded": true,
     "version": "1.0.0"
   }
   ```

2. Test a prediction endpoint:
   ```
   POST https://your-backend-name.railway.app/api/predict
   ```

## Step 5.2: Test Frontend

1. Go to your frontend URL:
   ```
   https://loan-deafult-baseline-model.vercel.app
   ```

2. Try making a prediction
3. Verify data is saved to the database
4. Check logs in Railway for any errors

## Step 5.3: Check Logs

**Railway Backend Logs:**
1. Go to Railway dashboard
2. Click on **"ml-service"**
3. Click **"Logs"** tab
4. Watch for errors in real-time

**Vercel Frontend Logs:**
1. Go to Vercel dashboard
2. Click on your project
3. Click **"Deployments"** tab
4. Click on latest deployment
5. View build logs

---

# PART 6: TROUBLESHOOTING

## Issue: "CORS Error" or "Failed to fetch"

**Solution:**
1. Check that `VITE_API_URL` is set correctly in Vercel
2. Make sure Flask has CORS enabled in `api.py`:
   ```python
   from flask_cors import CORS
   CORS(app)
   ```
3. Redeploy frontend and backend

## Issue: "Database Connection Error"

**Solution:**
1. Check Railway postgres service is running
2. Verify `DATABASE_URL` is set in ml-service environment
3. Run database initialization script
4. Check logs in Railway

## Issue: "Model not loaded"

**Solution:**
1. Check if model artifacts exist: `ml-service/model_artifacts/`
2. Upload model files to Railway or include in Git
3. Or run `train_model.py` to generate artifacts

## Issue: Frontend not connecting to backend

**Solution:**
1. Verify backend URL in Vercel environment variables
2. Check frontend is redeployed after adding env var
3. Use browser DevTools (F12) to check network requests
4. Verify CORS is enabled on backend

---

# PART 7: MONITOR & MAINTAIN

## Monitor Backend Performance

1. **Railway Dashboard**
   - CPU usage
   - Memory usage
   - Request metrics
   - Logs

2. **Create Alerts** (optional)
   - Go to Railway project settings
   - Set up alerts for crashes or high CPU

## Update Your Code

When you update code:

**For Frontend:**
```powershell
git add .
git commit -m "Update frontend"
git push origin main
# Vercel auto-redeploys
```

**For Backend:**
```powershell
git add .
git commit -m "Update backend"
git push origin main
# Railway auto-redeploys
```

## Database Backups

Railway automatically backs up your PostgreSQL database. To download:

1. Go to Railway "postgres" service
2. Click "Backups" tab
3. Download backup file

---

# DEPLOYMENT SUMMARY

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Vercel | `https://loan-deafult-baseline-model.vercel.app` |
| Backend | Railway | `https://your-backend-name.railway.app` |
| Database | Railway PostgreSQL | Auto-managed |

---

# QUICK CHECKLIST

- [ ] Frontend pushed to GitHub
- [ ] `vercel.json` created in root
- [ ] Frontend deployed on Vercel
- [ ] Backend deployed on Railway
- [ ] PostgreSQL database created on Railway
- [ ] `VITE_API_URL` set in Vercel
- [ ] `DATABASE_URL` set in Railway
- [ ] Database tables initialized
- [ ] Health check passes (`/api/health`)
- [ ] Frontend can call backend API
- [ ] Predictions save to database

---

# NEXT STEPS (Optional)

- [ ] Add custom domain name
- [ ] Set up monitoring/alerts
- [ ] Configure auto-scaling
- [ ] Add CI/CD pipeline
- [ ] Set up database backups
- [ ] Configure SSL certificate

