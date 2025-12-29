# Cloudflare Deployment Guide

Complete step-by-step guide for deploying DeutschTagebuch to Cloudflare Workers and Pages.

## 📋 Prerequisites Checklist

Before you begin, ensure you have:

- [ ] **Cloudflare Account**: Sign up at https://dash.cloudflare.com (Free tier is sufficient)
- [ ] **GitHub Account**: Your code should be in a GitHub repository
- [ ] **Supabase Account**: Free tier at https://supabase.com
- [ ] **Supabase Database**: Schema already applied from `backend-worker/supabase-schema.sql`
- [ ] **Google Gemini API Key**: Get free key at https://ai.google.dev
- [ ] **Git Repository**: Your code pushed to GitHub

## 🚀 Deployment Steps

### Part 1: Deploy Backend API (Cloudflare Workers)

#### Option A: Deploy via Cloudflare Dashboard (Recommended for Beginners)

1. **Access Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com
   - Log in to your account

2. **Create New Worker**
   - Click on **Workers & Pages** in the left sidebar
   - Click **Create Application**
   - Select **Create Worker**
   - Click **Deploy** (we'll configure it next)

3. **Connect to GitHub**
   - Click **Connect to Git**
   - Authorize Cloudflare to access your GitHub account
   - Select your DeutschTagebuch repository
   - Click **Install & Authorize**

4. **Configure Worker Settings**
   - **Project name**: `deutschtagebuch-api` (or your preferred name)
   - **Production branch**: `main` (or your default branch)
   - **Root directory**: `backend-worker` ⚠️ IMPORTANT
   - **Build command**: Leave empty (Cloudflare will detect Node.js automatically)
   - Click **Save and Deploy**

5. **Wait for Initial Deployment** (1-2 minutes)
   - You'll see the build logs
   - Note your Worker URL (e.g., `https://deutschtagebuch-api.your-subdomain.workers.dev`)

6. **Configure Environment Variables**
   - In your Worker dashboard, go to **Settings**
   - Click on **Variables and Secrets**
   - Click **Add Variable** for each of these (mark as "Encrypted"):
     
     | Variable Name | Value | Example |
     |--------------|-------|---------|
     | `SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
     | `SUPABASE_ANON_KEY` | Your Supabase anon key | `eyJhbGciOiJIUzI1...` |
     | `GEMINI_API_KEY` | Your Gemini API key | `AIzaSyBa-x5c-7F_...` |

   - Click **Encrypt** for each variable
   - Click **Save and Deploy**

7. **Test Your Backend**
   - Open: `https://your-worker-name.workers.dev/health`
   - Expected response: `{"status":"ok","timestamp":"2025-12-29T..."}`
   - If you see this, your backend is working! ✅

#### Option B: Deploy via Wrangler CLI (Advanced Users)

```bash
# Navigate to backend directory
cd backend-worker

# Deploy the worker
npx wrangler deploy

# Set environment variables (you'll be prompted to enter values)
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put GEMINI_API_KEY

# Return to root
cd ..
```

### Part 2: Update Frontend Configuration

1. **Update API URL in Frontend**
   - Open `frontend/app.js`
   - Locate the `API_BASE` constant (around line 2)
   - Update the production URL:

   ```javascript
   const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
       ? 'http://localhost:8789'
       : 'https://deutschtagebuch-api.your-subdomain.workers.dev'; // ← Update this
   ```

2. **Commit and Push Changes**
   ```bash
   git add frontend/app.js
   git commit -m "Update production API URL"
   git push origin main
   ```

### Part 3: Deploy Frontend (Cloudflare Pages)

#### Option A: Deploy via Cloudflare Dashboard (Recommended)

1. **Create Pages Project**
   - In Cloudflare Dashboard, go to **Workers & Pages**
   - Click **Create Application**
   - Select **Pages**
   - Click **Connect to Git**

2. **Select Repository**
   - Choose your DeutschTagebuch repository
   - Click **Begin setup**

3. **Configure Build Settings**
   - **Project name**: `deutschtagebuch-frontend` (or your preferred name)
   - **Production branch**: `main`
   - **Framework preset**: None
   - **Build command**: Leave empty (or enter `exit 0`)
   - **Build output directory**: `frontend` ⚠️ IMPORTANT
   - Click **Save and Deploy**

4. **Wait for Deployment** (1-2 minutes)
   - Watch the build logs
   - Note your Pages URL (e.g., `https://deutschtagebuch-frontend.pages.dev`)

5. **Visit Your App**
   - Open your Pages URL in a browser
   - Your app should now be live! 🎉

#### Option B: Deploy via Wrangler CLI

```bash
# From project root
npx wrangler pages deploy frontend --project-name=deutschtagebuch-frontend
```

## ✅ Verification Checklist

After deployment, verify everything works:

- [ ] **Backend Health Check**: Visit `https://your-worker.workers.dev/health` - should return JSON
- [ ] **Frontend Loads**: Visit your Pages URL - should show the One Piece themed interface
- [ ] **Dashboard Loads**: Dashboard should show stats (may be 0 if new database)
- [ ] **Create Journal Entry**: Try writing and saving an entry
- [ ] **Translation Works**: Click "Translate" button - should translate English to German
- [ ] **Add Vocabulary**: Add a word manually - should save successfully
- [ ] **View Notes**: Navigate to "Meat & Tips" section
- [ ] **No Console Errors**: Open browser DevTools - check for errors

## 🔧 Common Issues & Solutions

### Issue 1: "404 Not Found" or "Worker threw JavaScript exception"

**Cause**: Missing or incorrect environment variables

**Solution**:
1. Go to Worker Settings → Variables and Secrets
2. Verify all three variables are set:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
3. Click "Save and Deploy" after any changes
4. Wait 30 seconds and test again

### Issue 2: Frontend Shows Empty Dashboard

**Cause**: Frontend can't connect to backend

**Solution**:
1. Check that `frontend/app.js` has the correct production URL
2. Open browser DevTools (F12) → Console tab
3. Look for error messages about API calls
4. Verify the backend URL in console matches your Worker URL
5. Test backend directly: `https://your-worker.workers.dev/health`

### Issue 3: CORS Errors

**Cause**: Backend CORS not properly configured

**Solution**:
The backend already has CORS enabled via Hono. If you see CORS errors:
1. Clear browser cache
2. Try incognito mode
3. Check Worker logs in Cloudflare dashboard for errors

### Issue 4: Translation Not Working

**Cause**: Invalid or missing Gemini API key

**Solution**:
1. Verify `GEMINI_API_KEY` is set in Worker settings
2. Check your API key at https://ai.google.dev
3. Ensure you haven't exceeded free tier quota
4. Check Worker logs for specific API error messages

### Issue 5: Database Queries Fail

**Cause**: Supabase credentials incorrect or database schema not applied

**Solution**:
1. Verify Supabase credentials:
   - Log in to https://supabase.com
   - Go to Project Settings → API
   - Copy URL and anon key
   - Update Worker variables if different
2. Verify database schema:
   - Go to SQL Editor in Supabase
   - Run `backend-worker/supabase-schema.sql` if not already done
3. Check Supabase project is active (not paused)

### Issue 6: Build Fails During Deployment

**Cause**: Incorrect build configuration

**Solution**:
1. Verify `wrangler.toml` exists in project root for frontend
2. Check that root directory is set to `backend-worker` for Worker
3. Check that build output directory is `frontend` for Pages
4. Review build logs in Cloudflare dashboard for specific errors

## 🔄 Continuous Deployment

Once connected to Git, automatic deployments are enabled:

### Automatic Deployments
- **Push to main branch** → Triggers production deployment
- **Pull request created** → Creates preview deployment
- **Commit to PR** → Updates preview deployment

### Manual Redeployment
1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your project
3. Go to Deployments tab
4. Click "Retry deployment" on any previous deployment
5. Or click "View details" → "Redeploy"

### Rollback to Previous Version
1. Go to Deployments tab
2. Find a successful previous deployment
3. Click "..." → "Rollback to this deployment"
4. Confirm rollback

## 🎯 Production Best Practices

### Security
- ✅ Never commit `.dev.vars` or `.env` files
- ✅ Use encrypted environment variables in Cloudflare
- ✅ Regularly rotate API keys (Supabase, Gemini)
- ✅ Review Worker logs for suspicious activity

### Performance
- ✅ Monitor Worker analytics in dashboard
- ✅ Check response times for API endpoints
- ✅ Review Supabase query performance
- ✅ Enable caching where appropriate

### Monitoring
- ✅ Set up email alerts for Worker errors
- ✅ Monitor Supabase database usage
- ✅ Check Gemini API quota usage
- ✅ Review Cloudflare analytics weekly

### Backup
- ✅ Regularly export data via `/data/export` endpoint
- ✅ Keep local backups of Supabase database
- ✅ Document any custom configurations
- ✅ Maintain deployment documentation updates

## 📞 Getting Help

If you encounter issues:

1. **Check Worker Logs**:
   - Cloudflare Dashboard → Your Worker → Logs
   - Look for JavaScript errors or exceptions

2. **Check Browser Console**:
   - Press F12 in browser
   - Look for network errors or JavaScript errors

3. **Review Documentation**:
   - [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
   - [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
   - [Hono Documentation](https://hono.dev/)

4. **Test Locally First**:
   - Run `npm run dev` locally
   - Verify everything works before deploying

## 🎉 Success!

Once everything is verified, your DeutschTagebuch app is live on Cloudflare's global edge network!

**Your URLs:**
- Frontend: `https://deutschtagebuch-frontend.pages.dev`
- Backend API: `https://deutschtagebuch-api.your-subdomain.workers.dev`

Share your app and start your German learning journey! 🇩🇪⚓

**Viel Erfolg mit deinem Deutsch!**