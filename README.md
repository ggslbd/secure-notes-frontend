# Secure Notes — Frontend

Plain HTML/JS client (no build step) for the `secure-notes-backend` REST API.

## Configure
Edit `config.js` and set `API_URL` to the backend URL (local: `http://localhost:3000`, prod: your Render URL, no trailing slash).
The backend's `CORS_ORIGIN` must include this site's origin.

## Run locally
```
npm start     # serves on http://localhost:8080  (or open with any static server)
```

## Deploy
- **Vercel**: Import the repo → Framework preset "Other" → no build command, output directory `.` → Deploy.
- **Netlify**: Add new site from Git → build command empty, publish directory `.` → Deploy.

After deploying, copy the live URL into the backend's `CORS_ORIGIN` env var on Render and redeploy/restart the backend.

## Features
Login/register, own notes CRUD with pagination, posts (create/view by user id), profile interests; admin panel: user management, all notes, users grouped by interest.
