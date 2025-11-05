# 🚀 Automatic Deployment Setup Guide

## How It Works

Your app has **TWO automatic deployments** that happen when you push to GitHub:

### 1. **Frontend (Vercel) - Auto-Deploys**
- **What:** Your React app (frontend)
- **When:** Every push to `main` branch
- **How:** Vercel watches your GitHub repo and auto-deploys
- **Time:** ~30-60 seconds after push

### 2. **Edge Functions (Supabase) - Auto-Deploys via GitHub Actions**
- **What:** Supabase Edge Functions (backend functions)
- **When:** Every push to `main` branch
- **How:** GitHub Actions workflow (`.github/workflows/main.yml`)
- **Time:** ~2-5 minutes (depending on number of functions)

---

## ✅ Setup Checklist

### Frontend (Vercel) Auto-Deploy

**Step 1: Connect Vercel to GitHub**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `joshjv11/blue-green-payment-flow`
4. Vercel will automatically detect it's a Vite project
5. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
6. Click **"Deploy"**

**Step 2: Set Environment Variables**
In Vercel Dashboard → Your Project → Settings → Environment Variables:
```
VITE_SUPABASE_URL=https://qusloccwftavvcsttmnq.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Step 3: Verify Auto-Deploy is ON**
- Go to Vercel Dashboard → Your Project → Settings → Git
- Check that **"Production Branch"** is set to `main`
- Auto-deployment should be **enabled by default**

**✅ Done!** Now every `git push origin main` will auto-deploy to Vercel.

---

### Edge Functions (Supabase) Auto-Deploy via GitHub Actions

**Step 1: Get Supabase Access Token**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click your profile icon (top right)
3. Go to **"Access Tokens"**
4. Click **"Generate New Token"**
5. Give it a name: `GitHub Actions Deploy`
6. Copy the token (you'll need it in Step 3)

**Step 2: Get Project Reference**
1. In Supabase Dashboard → Your Project
2. Go to **Settings** → **General**
3. Find **"Reference ID"** (looks like: `qusloccwftavvcsttmnq`)
4. Copy it

**Step 3: Add GitHub Secrets**
1. Go to your GitHub repo: `https://github.com/joshjv11/blue-green-payment-flow`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add these two secrets:

   **Secret 1:**
   - **Name:** `SUPABASE_ACCESS_TOKEN`
   - **Value:** (paste the token from Step 1)

   **Secret 2:**
   - **Name:** `SUPABASE_PROJECT_REF`
   - **Value:** (paste your project ref from Step 2, e.g., `qusloccwftavvcsttmnq`)

**✅ Done!** Now every `git push origin main` will auto-deploy Edge Functions via GitHub Actions.

---

## 🔍 How to Verify It's Working

### Check Vercel Auto-Deploy:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click your project
3. Go to **"Deployments"** tab
4. You should see a new deployment appear ~30-60 seconds after you push

### Check GitHub Actions:
1. Go to your GitHub repo
2. Click **"Actions"** tab
3. You should see a workflow run called **"Deploy Supabase Edge Functions"**
4. It will run automatically on every push to `main`

---

## 📝 Your Workflow Now

```bash
# 1. Make changes
git add -A

# 2. Commit
git commit -m "Your changes"

# 3. Push (this triggers auto-deploy!)
git push origin main

# 4. Wait ~30-60 seconds
# ✅ Vercel auto-deploys frontend
# ✅ GitHub Actions auto-deploys Edge Functions
# ✅ Both done automatically!
```

---

## 🛠️ Quick Commands (Optional)

You can also use these npm scripts:

```bash
# Quick deploy (stages, commits, and pushes)
npm run deploy:quick

# Manual Vercel deployment (if needed)
npm run deploy:vercel

# Full deployment script (interactive)
npm run deploy
```

---

## 🐛 Troubleshooting

### Vercel Not Auto-Deploying?
1. Check Vercel Dashboard → Settings → Git
2. Verify repo is connected
3. Check that `main` branch is set as production branch
4. Try manually triggering a deployment first

### GitHub Actions Not Running?
1. Check GitHub repo → Settings → Secrets
2. Verify `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` are set
3. Check Actions tab → See if workflow is running
4. If it fails, check the logs for error messages

### Edge Functions Not Deploying?
1. Check GitHub Actions logs
2. Verify Supabase CLI has access (check token)
3. Some functions might fail - check logs for details
4. You can deploy manually from Supabase Dashboard if needed

---

## 📊 Current Status

✅ **Frontend:** Auto-deploys via Vercel (when connected to GitHub)
✅ **Edge Functions:** Auto-deploys via GitHub Actions (when secrets are set)

**To enable:**
1. Connect Vercel to your GitHub repo (if not already)
2. Add GitHub Secrets for Supabase deployment (if not already)

---

## 🎯 Summary

**Automatic Deployment = Zero Manual Steps!**

1. **Code** → Make changes
2. **Commit** → `git commit -m "message"`
3. **Push** → `git push origin main`
4. **Auto-Deploy** → Vercel + GitHub Actions handle everything
5. **Live** → Your changes are live in ~30-60 seconds! 🚀

