# Deployment Guide - Protein Engineering Tools

This guide explains how to deploy the Protein Engineering Tools application with cloud storage using Railway.

## Architecture

The application consists of two parts:

1. **Frontend** (Tauri + React): Desktop application or web build
2. **Backend** (Express + PostgreSQL): Cloud server on Railway for data storage

## Features

- ✅ **Guest Mode**: Users can use all features without authentication
- ✅ **Cloud Storage**: Login to save custom recipes and measurements to the cloud
- ✅ **Cross-Device Sync**: Access your saved data from any device
- ✅ **Local First**: Data works locally, syncs when authenticated

---

## Part 1: Deploy Backend to Railway

### Prerequisites
- Railway account ([railway.app](https://railway.app))
- GitHub account (recommended for automatic deployments)

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Add cloud backend with Railway support"
git push
```

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will detect the `server` directory automatically

### Step 3: Add PostgreSQL Database

1. In your Railway project dashboard, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway automatically creates a PostgreSQL database and sets the `DATABASE_URL` environment variable

### Step 4: Configure Environment Variables

In your Railway service settings, add these environment variables:

```
NODE_ENV=production
JWT_SECRET=your-super-secret-random-string-here-change-this
```

**Important**: Generate a secure random string for `JWT_SECRET`. You can use:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Deploy

1. Railway will automatically deploy your server
2. Once deployed, you'll get a URL like: `https://your-app.railway.app`
3. Copy this URL - you'll need it for the frontend

### Step 6: Test the Server

Visit `https://your-app.railway.app/health` - you should see:
```json
{
  "status": "ok",
  "timestamp": "2025-11-17T..."
}
```

---

## Part 2: Configure Frontend

### Step 1: Create Environment File

Create a `.env` file in the project root:

```bash
VITE_API_URL=https://your-app.railway.app
```

Replace `https://your-app.railway.app` with your actual Railway deployment URL.

### Step 2: Build the Frontend

#### For Desktop (Tauri):

```bash
npm run tauri:build
```

The built application will be in `src-tauri/target/release/`

#### For Web:

```bash
npm run build
```

The built files will be in `dist/`

### Step 3: Distribute

**Desktop App:**
- Find the installer in `src-tauri/target/release/bundle/`
- Distribute the `.exe` (Windows), `.dmg` (macOS), or `.AppImage` (Linux)

**Web App:**
- Deploy the `dist/` folder to:
  - Vercel
  - Netlify
  - Cloudflare Pages
  - GitHub Pages
  - Or any static hosting service

---

## How It Works

### Guest Mode

- Users can use all features immediately without creating an account
- Data is stored locally in IndexedDB
- No authentication required for basic usage

### With Authentication

- Click "Login" in the header to create an account or sign in
- Custom recipes and measurements are saved to the cloud
- Data syncs across devices
- Can access from any device with the same account

### Authentication Flow

1. **First Use**: App starts in guest mode, all features available
2. **Save Data**: When trying to save custom recipes or measurements, users are prompted to login
3. **Login/Register**: Users can create an account or sign in
4. **Auto-Sync**: After login, data automatically syncs to the cloud
5. **Cross-Device**: Same account works across multiple devices

---

## Local Development

### Backend

```bash
cd server
npm install
```

Create `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/protein_tools
JWT_SECRET=dev-secret-key
NODE_ENV=development
```

Run:
```bash
npm run dev
```

Server runs on `http://localhost:3000`

### Frontend

```bash
npm install
```

Create `.env`:
```
VITE_API_URL=http://localhost:3000
```

Run:
```bash
npm run dev
```

---

## Environment Variables Reference

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `JWT_SECRET` | Secret key for JWT tokens | `random-32-byte-hex-string` |
| `NODE_ENV` | Environment | `production` or `development` |
| `PORT` | Server port (auto-set by Railway) | `3000` |

### Frontend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://your-app.railway.app` |

---

## Database Schema

The PostgreSQL database includes these tables:

- **users**: User accounts (username, email, password_hash)
- **user_recipes**: Custom buffer recipes per user
- **user_measurements**: Protein concentration measurements per user

All tables automatically created on first run.

---

## Security Notes

1. **HTTPS**: Railway provides HTTPS automatically
2. **Password Hashing**: Passwords hashed with bcrypt (cost factor 10)
3. **JWT Tokens**: 30-day expiration, stored in localStorage
4. **CORS**: Configured to allow frontend domain
5. **SQL Injection**: Protected via parameterized queries

---

## Troubleshooting

### "Failed to fetch" Error

- Check `VITE_API_URL` in `.env` matches your Railway URL
- Verify Railway server is running (`/health` endpoint)
- Check browser console for CORS errors

### Database Connection Error

- Verify PostgreSQL database is created in Railway
- Check `DATABASE_URL` environment variable is set
- View Railway logs for detailed error messages

### Authentication Not Working

- Verify `JWT_SECRET` is set on Railway
- Check browser localStorage for auth token
- Clear localStorage and try logging in again

---

## Monitoring

### Railway Dashboard

- View logs in real-time
- Monitor database usage
- Check API response times
- Set up alerts for errors

### Health Check

Always available at: `https://your-app.railway.app/health`

---

## Cost Estimate (Railway)

- **Hobby Plan**: $5/month
  - Includes PostgreSQL database
  - 500 hours/month execution time
  - 100 GB bandwidth

- **Developer Plan**: $20/month
  - Everything in Hobby
  - Higher limits
  - Priority support

Most users will be fine with the Hobby plan.

---

## Support

For questions or issues:
- Email: ww2607@columbia.edu
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)

---

## Next Steps

After deployment:

1. Test registration and login
2. Create a custom recipe and verify it saves
3. Test logging in from another device
4. Share the app with your team!

Enjoy your cloud-enabled Protein Engineering Tools! 🧬
