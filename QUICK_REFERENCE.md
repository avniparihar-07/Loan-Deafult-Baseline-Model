# 🚀 QUICK DEPLOYMENT REFERENCE

## One-Line Overview

```
Vercel (Frontend) ←→ Railway (Backend + PostgreSQL Database)
```

---

## ⚡ 30-Second Summary

Your project has 3 components:

1. **Frontend** → React app with Vite build tool
2. **Backend** → Flask API server
3. **Database** → PostgreSQL database

They deploy to **2 different platforms**:

```
┌──────────────────────────────────┐
│  VERCEL (Frontend)               │
│  - React + Vite                  │
│  - Built & served by Vercel CDN  │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  RAILWAY (Backend + Database)    │
│  - Flask API server              │
│  - PostgreSQL database           │
│  - Auto-managed containers       │
└──────────────────────────────────┘
```

---

## 📋 DEPLOYMENT STEPS (ONE PAGE)

### **BEFORE YOU START:**
- [ ] Code committed to GitHub
- [ ] Files ready: `vercel.json`, `ml-service/Procfile`, `.env.example`
- ✅ **Already done!**

---

### **STEP 1: DEPLOY FRONTEND (15 min)**

1. Go to **vercel.com** → Log in with GitHub
2. Click **"Add New..."** → **"Project"**
3. Search & select **`Loan-Deafult-Baseline-Model`**
4. Click **"Deploy"** (all settings auto-configured)
5. Wait 2-5 minutes ⏳
6. **Copy your frontend URL** → Save it!

```
Example: https://loan-deafult-baseline-model.vercel.app
```

---

### **STEP 2: DEPLOY BACKEND (10 min)**

1. Go to **railway.app** → Log in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Search & select **`Loan-Deafult-Baseline-Model`**
4. Click **"Deploy"**
5. Wait for Flask to finish deploying
6. Click **"Add"** → **"PostgreSQL"** database
7. Wait 1-2 minutes for database creation ⏳

---

### **STEP 3: GET YOUR BACKEND URL (2 min)**

1. In Railway, click **"ml-service"**
2. Go to **"Deployments"** tab
3. **Copy the URL** → Save it!

```
Example: https://your-api-name.railway.app
```

---

### **STEP 4: SET ENVIRONMENT VARIABLES (5 min)**

**On Railway (Backend):**
1. Click **"ml-service"** → **"Variables"**
2. Add: `FLASK_ENV` = `production`
3. Verify: `DATABASE_URL` is auto-set

**On Vercel (Frontend):**
1. Click your project → **"Settings"** → **"Environment Variables"**
2. Add: `VITE_API_URL` = `https://your-api-name.railway.app`
3. Save

---

### **STEP 5: REDEPLOY FRONTEND (3 min)**

1. In Vercel, go **"Deployments"** tab
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**
4. Wait for completion ⏳

---

### **STEP 6: TEST (5 min)**

**Test 1: Backend API Health**
```
https://your-api-name.railway.app/api/health
```
Should show: `{"status": "healthy", "model_loaded": true}`

**Test 2: Frontend Load**
```
https://loan-deafult-baseline-model.vercel.app
```
Should load the React app

**Test 3: Make a Prediction**
- Fill in data
- Click "Predict"
- Should see result

---

## 🎯 FINAL RESULT

After all steps, you have:

| What | URL | Where |
|------|-----|-------|
| **Frontend** | `https://loan-deafult-baseline-model.vercel.app` | Vercel |
| **Backend** | `https://your-api.railway.app` | Railway |
| **Database** | PostgreSQL | Railway (auto-managed) |

---

## 🔧 CONFIGURATION FILES ALREADY CREATED

✅ **`vercel.json`** - Vercel build config
✅ **`ml-service/Procfile`** - Railway startup config  
✅ **`.env.example`** - Environment template
✅ **`ml-service/init_db.py`** - Database init script
✅ **`ml-service/api.py`** - Updated for production
✅ **`ml-service/requirements.txt`** - Added gunicorn

---

## 🚨 COMMON ISSUES & FIXES

| Issue | Fix |
|-------|-----|
| "CORS Error" | Check `VITE_API_URL` in Vercel, redeploy frontend |
| "Cannot connect to backend" | Check backend URL is correct, verify CORS enabled |
| "Database error" | Check PostgreSQL service running on Railway |
| "Model not loaded" | Run `train_model.py` to generate model files |
| "Build failed" | Check Vercel build logs, fix errors, redeploy |

---

## 📚 DETAILED GUIDES

For **complete step-by-step** instructions, see:
- `DETAILED_DEPLOYMENT_STEPS.md` ← Read this first!
- `DEPLOYMENT_GUIDE.md` ← Complete architecture overview

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Frontend deployed on Vercel
- [ ] Backend deployed on Railway  
- [ ] PostgreSQL database created
- [ ] Environment variables set
- [ ] Frontend redeployed
- [ ] Health check passes
- [ ] Can make predictions
- [ ] Data saves to database

**After checking all: YOU'RE DONE! 🎉**

---

## 🔗 USEFUL LINKS

| Service | Login | Dashboard |
|---------|-------|-----------|
| **Vercel** | https://vercel.com | Settings after login |
| **Railway** | https://railway.app | Settings after login |
| **GitHub** | https://github.com | Your repo |

---

## 📞 IF SOMETHING GOES WRONG

1. **Check Vercel logs:**
   - Project → Deployments → Click deployment → View logs

2. **Check Railway logs:**
   - Project → ml-service → Logs (real-time)

3. **Check browser console:**
   - Frontend → F12 → Console tab → Look for errors

4. **Verify environment variables:**
   - Vercel: Settings → Environment Variables
   - Railway: ml-service → Variables

---

**You're ready to deploy! Follow the 30-second summary or read the detailed guide for more info.** 🚀
