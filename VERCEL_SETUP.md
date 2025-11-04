# 🚀 Vercel Auto-Deploy Setup Guide

This guide will help you set up automatic deployment to Vercel. Once configured, every push to the `main` branch will automatically deploy your frontend to production.

## Prerequisites

- GitHub repository: `joshjv11/blue-green-payment-flow`
- Vercel account (free tier works)
- Your domain: `invoiceflow.dev` (optional, for custom domain)

## Step 1: Connect GitHub Repository to Vercel

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com
   - Sign in with GitHub (use the same account as your repository)

2. **Import Your Project:**
   - Click **"Add New Project"** button
   - Find and select: `joshjv11/blue-green-payment-flow`
   - Click **"Import"**

## Step 2: Configure Build Settings

Vercel should auto-detect Vite, but verify these settings:

- **Framework Preset:** `Vite`
- **Build Command:** `npm run build` (should be auto-detected)
- **Output Directory:** `dist` (should be auto-detected)
- **Install Command:** `npm install` (should be auto-detected)
- **Root Directory:** `./` (leave as default)

Click **"Deploy"** to start the first deployment.

## Step 3: Add Environment Variables

After the first deployment, you need to add environment variables:

1. **Go to Project Settings:**
   - Click on your project name
   - Go to **Settings** → **Environment Variables**

2. **Add Required Variables:**

   Add these variables for **Production, Preview, and Development**:

   ```
   VITE_SUPABASE_URL=https://qusloccwftavvcsttmnq.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   **Optional AI Variables** (if you want AI features to work directly from frontend):

   ```
   VITE_GROQ_API_KEY=your-groq-api-key (optional)
   VITE_OPENAI_API_KEY=your-openai-api-key (optional)
   VITE_GEMINI_API_KEY=your-gemini-api-key (optional)
   ```

3. **Get Your Supabase Keys:**
   - Go to: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/settings/api
   - Copy **Project URL** → use as `VITE_SUPABASE_URL`
   - Copy **anon public** key → use as `VITE_SUPABASE_ANON_KEY`

4. **Save and Redeploy:**
   - Click **"Save"** after adding each variable
   - Go to **Deployments** tab
   - Click the **"..."** menu on the latest deployment
   - Select **"Redeploy"**

## Step 4: Set Up Custom Domain (invoiceflow.dev)

1. **Add Domain:**
   - Go to **Settings** → **Domains**
   - Enter: `invoiceflow.dev`
   - Click **"Add"**

2. **Configure DNS:**
   - Vercel will show you DNS records to add
   - Go to your domain registrar (where you bought invoiceflow.dev)
   - Add the DNS records Vercel provides:
     - **Type:** `A` or `CNAME`
     - **Name:** `@` or `www`
     - **Value:** Vercel's provided value

3. **Wait for DNS Propagation:**
   - DNS changes can take 5-30 minutes
   - Vercel will show "Valid Configuration" when ready
   - SSL certificate will be automatically provisioned

## Step 5: Verify Auto-Deployment

1. **Test the Auto-Deploy:**
   ```bash
   # Make a small change
   echo "// Test" >> src/App.tsx
   
   # Commit and push
   git add src/App.tsx
   git commit -m "Test: Verify auto-deploy"
   git push origin main
   ```

2. **Check Deployment:**
   - Go to Vercel Dashboard → **Deployments**
   - You should see a new deployment starting automatically
   - Wait ~30-60 seconds for deployment to complete
   - Click on the deployment to see logs

3. **Verify It Works:**
   - Visit your Vercel URL: `https://your-project.vercel.app`
   - Or your custom domain: `https://invoiceflow.dev`
   - Test the app functionality

## Step 6: Update Supabase Auth Settings

After deployment, update Supabase to allow your Vercel domain:

1. **Go to Supabase Auth Settings:**
   - Visit: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/url-configuration

2. **Update Site URL:**
   - **Site URL:** `https://invoiceflow.dev` (or your Vercel URL)

3. **Add Redirect URLs:**
   ```
   https://invoiceflow.dev/**
   https://your-project.vercel.app/**
   https://*.vercel.app/**
   ```

4. **Save Changes**

## How Auto-Deployment Works

Once set up:

1. **You code** → Make changes locally
2. **You commit** → `git commit -m "Your message"`
3. **You push** → `git push origin main`
4. **Vercel auto-deploys** → Deploys in ~30-60 seconds
5. **Done!** → No manual steps needed

## Deployment Speed

- **First deployment:** ~2-3 minutes (installing dependencies)
- **Subsequent deployments:** ~30-60 seconds (incremental builds)
- **Edge Functions:** Continue deploying via GitHub Actions (separate process)

## Troubleshooting

### Deployment Fails

1. **Check Build Logs:**
   - Go to Vercel Dashboard → **Deployments**
   - Click on failed deployment
   - Check **Build Logs** for errors

2. **Common Issues:**
   - Missing environment variables → Add them in Settings
   - Build errors → Check `npm run build` works locally
   - TypeScript errors → Fix before pushing

### Environment Variables Not Working

- Make sure variables start with `VITE_` prefix
- Redeploy after adding new variables
- Check that variables are added to **Production** environment

### Domain Not Working

- Check DNS records are correct
- Wait for DNS propagation (can take up to 48 hours)
- Verify SSL certificate is issued (check in Vercel dashboard)

## Quick Commands

After setup, you can use these commands:

```bash
# Quick deploy (auto-commits and pushes)
npm run deploy:quick

# Manual Vercel deployment (if needed)
npm run deploy:vercel

# Preview deployment (testing)
npm run deploy:vercel:preview
```

## Summary

✅ **Auto-deployment is now active!**

Every time you push to `main`:
- Frontend deploys to Vercel automatically
- Edge Functions deploy via GitHub Actions
- Both happen in parallel
- No manual steps needed

**Your workflow:**
```
Code → Commit → Push → Auto-Deploy → Live in 30-60 seconds 🚀
```
