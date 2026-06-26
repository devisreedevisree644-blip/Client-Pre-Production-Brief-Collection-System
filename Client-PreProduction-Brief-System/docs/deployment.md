# DigiQuest Studio Portal - Deployment Guide

This document outlines deployment configurations to launch the DigiQuest Pre-Production Brief System in a live production environment.

---

## 1. Database Deployment (Railway / Render / AWS RDS)
1. Provision a PostgreSQL instance.
2. Retrieve the PostgreSQL Connection String:
   `postgresql://<user>:<password>@<host>:<port>/<dbname>`
3. Run the schema migrations:
   ```bash
   psql -h <host> -U <user> -d <dbname> -f database/schema.sql
   ```

---

## 2. Backend API Deployment (Railway / Render)
1. Add a `start` script to `backend/package.json` matching standard Node servers:
   `"start": "node src/server.js"`
2. Set Environment Variables in your hosting console:
   * `PORT`: `8080` (or leave default)
   * `NODE_ENV`: `production`
   * `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` matching database string.
   * `JWT_SECRET`: Generate a secure string.
   * *Optional*: Add SMTP credentials (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) to enable email dispatches.

---

## 3. Frontend App Deployment (Vercel / Netlify / Cloudflare)
1. Create a `vercel.json` routing fallback file in the frontend directory to support React Router single-page redirections:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
2. Build commands:
   * **Build command**: `npm run build`
   * **Output Directory**: `dist`
3. Configure the Axios base URL (`frontend/src/services/api.js`) to point to your live hosted Backend API endpoint (e.g. `https://api.digiqueststudio.com/api`).
