# Cost Manager API (Final Project)

Node.js + Express + MongoDB Atlas + Mongoose + Pino.  
Implements users, costs, monthly reports, request logging, and validation.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Environment](#environment)
- [Install & Run (Local)](#install--run-local)
- [API Quick Test (PowerShell)](#api-quick-test-powershell)
- [API Quick Test (Browser URLs)](#api-quick-test-browser-urls)
- [WebStorm HTTP Client](#webstorm-http-client)
- [Unit Tests](#unit-tests)
- [Cleanup Script](#cleanup-script)
- [Deployment (Render)](#deployment-render)
- [Security Notes](#security-notes)
- [Endpoints](#endpoints)
- [60-Second Demo Script](#60-second-demo-script)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites
- **Node.js** 22.x  
  (Optional in `package.json`: `"engines": { "node": "22.x" }`)
- **Git** installed and on PATH (verify with `git --version`)
- **MongoDB Atlas** account and cluster  
  - Create a **database user** (Database Access)  
  - Allow your IP (Network Access) — for dev, `0.0.0.0/0` is OK  
  - Copy your **Node.js connection string** (Drivers → Connect your application)

---

## Project Structure

We're using the Express generator layout with added `src/` modules:

```
bin/www               # server bootstrap (listens after Mongo connects)
app.js                # Express app, middleware, routes mount
src/
  controllers/        # cost, user, report, about, logs
  middleware/         # validate, errorHandler, requestLogger
  models/             # User, Cost, Log, Report
  utils/              # constants, date utils, report builder
  db.js               # mongoose connection
  logger.js           # pino + pino-http
  routes/index.js     # /api/* routes
scripts/
  cleanup.js          # database cleanup utility
tests/
  api.e2e.test.js     # Jest + Supertest tests
requests.http         # WebStorm HTTP client requests
```

---

## Environment

Create **.env** (local only; do **not** commit):
```
MONGODB_URI=mongodb+srv://<username>:<password-URL-encoded>@<cluster-host>/<dbname>?retryWrites=true&w=majority
PORT=3000
NODE_ENV=development
```

> If your password has special characters (`@ / ? & # = +`), URL-encode it  
> Example helper: `node -e "console.log(encodeURIComponent('Your@P/ss?&'))"`

Optional **.env.test** for tests (use a separate DB name):
```
TEST_MONGODB_URI=.../costmanager_test?retryWrites=true&w=majority
```

**.gitignore** should include:
```
.env
.env.*
.idea/httpRequests/
node_modules/
```

---

## Install & Run (Local)

```powershell
cd C:\Users\sy020\WebstormProjects\server_side_final_project
npm install
npm run dev
```

You should see: `{"msg":"server started","bind":"port 3000", ...}`  
Health check: http://localhost:3000/health → `{ "ok": true }`

---

## API Quick Test (PowerShell)

> Replace the year/month where needed (today is Aug 2025 → `year=2025&month=8`).

```powershell
# Health
irm http://localhost:3000/health

# About (team)
irm http://localhost:3000/api/about

# Add required user (id 123123)
irm -Method Post -Uri http://localhost:3000/api/add -ContentType 'application/json' -Body '{ "id":123123, "first_name":"mosh", "last_name":"israeli", "birthday":"1990-01-01" }'

# List users
irm http://localhost:3000/api/users

# User details (shows total)
irm http://localhost:3000/api/users/123123

# Add cost (no date → uses now)
irm -Method Post -Uri http://localhost:3000/api/add -ContentType 'application/json' -Body '{ "userid":123123, "description":"milk", "category":"food", "sum":10 }'

# Add cost with future date (valid)
irm -Method Post -Uri http://localhost:3000/api/add -ContentType 'application/json' -Body '{ "userid":123123, "description":"book", "category":"education", "sum":50, "date":"2025-09-10T00:00:00Z" }'

# Invalid past date (expect 400)
irm -Method Post -Uri http://localhost:3000/api/add -ContentType 'application/json' -Body '{ "userid":123123, "description":"old ticket", "category":"sports", "sum":20, "date":"2023-01-01T00:00:00Z" }'

# Invalid category (expect 400)
irm -Method Post -Uri http://localhost:3000/api/add -ContentType 'application/json' -Body '{ "userid":123123, "description":"plane", "category":"travel", "sum":200 }'

# Monthly report (current month)
irm 'http://localhost:3000/api/report?id=123123&year=2025&month=8'

# Request logs
irm http://localhost:3000/api/logs
```

---

## API Quick Test (Browser URLs)

(Use these after adding the user and a cost via the POSTs above.)

- http://localhost:3000/health  
- http://localhost:3000/api/about  
- http://localhost:3000/api/users  
- http://localhost:3000/api/users/123123  
- http://localhost:3000/api/report?id=123123&year=2025&month=8  
- http://localhost:3000/api/logs  

Deployed: replace `http://localhost:3000` with your Render URL.

---

## WebStorm HTTP Client

Use **requests.http** (already included).  
Open the file → click the **Run** icon above each request → see JSON response.  
If WebStorm saves responses as files, they live under `.idea/httpRequests/` (ignored by Git).

---

## Unit Tests

Uses Jest + Supertest with a separate test DB.

```powershell
npm test
```

All tests should pass (`11 passed`).

---

## Cleanup Script

Keeps **exactly** one user (default `id=123123`, mosh israeli) and removes all other users, costs, reports, and logs.

**Scripts (package.json):**
```json
{
  "scripts": {
    "cleanup": "node scripts/cleanup.js --yes",
    "cleanup:dry": "node scripts/cleanup.js --dry"
  }
}
```

**Run:**
```powershell
# Preview only
npm run cleanup:dry

# Apply deletions
npm run cleanup
```

Optional custom identity:
```powershell
node scripts/cleanup.js --id=123123 --first=mosh --last=israeli --birthday=1990-01-01 --yes
```

---

## Deployment (Render)

1. Push code to GitHub.
2. Render → **New** → **Web Service** → connect your repo.
3. Environment: **Node**  
   - **Build Command**: `npm install`  
   - **Start Command**: `node ./bin/www`
4. **Environment Variables** (Service → Settings → Environment):
   - `MONGODB_URI` = your Atlas URI (URL-encoded password if needed)
   - `NODE_ENV` = `production`
   - *(Do not set `PORT`; Render sets it)*
5. In MongoDB Atlas, ensure **Network Access** allows connections.
6. Deploy → test: `https://<your-service>.onrender.com/health`

**Logs:** Render → your service → **Logs** (see Pino request logs and startup messages).

---

## Security Notes
- Never commit secrets: keep `.env`, `.env.*` in `.gitignore`.
- If a secret was pushed once, **rotate** the Atlas DB user password and update your URIs locally and in Render.
- URL-encode special characters in DB passwords (`@` → `%40`, `/` → `%2F`, `&` → `%26`, `?` → `%3F`, `#` → `%23`).

---

## Endpoints

- `GET /health` → `{ ok: true }`
- `GET /api/about` → `[ { first_name, last_name }, ... ]`
- `POST /api/add` (user) → body: `{ id, first_name, last_name, birthday }`  
  - `201` on success; `409` if `id` already exists
- `POST /api/add` (cost) → body: `{ userid, description, category, sum, [date] }`  
  - `category ∈ { food, health, housing, sports, education }`  
  - `date` optional; if present must **not** be in the past; if omitted, server uses **now**
- `GET /api/users` → all users
- `GET /api/users/:id` → `{ first_name, last_name, id, total }`
- `GET /api/report?id=&year=&month=` →  
  ```
  {
    userid, year, month,
    costs: [
      { food: [ { sum, description, day }, ... ] },
      { health: [ ... ] },
      { housing: [ ... ] },
      { sports: [ ... ] },
      { education: [ ... ] }
    ]
  }
  ```
  Past months use a **computed & cached report** (saved in `reports`).
- `GET /api/logs` → recent HTTP request logs (from `logs` collection)

---

## 60-Second Demo Script

1. Open `/health` → show `{ ok: true }`.  
2. `/api/about` → show only names.  
3. `POST /api/add` (user 123123) → shows `201` **or** `409 user_exists`.  
4. `POST /api/add` (cost: milk, food, 10) → `201`.  
5. `/api/report?id=123123&year=YYYY&month=MM` → shows “milk” in `food`.  
6. `/api/users/123123` → show `total` ≥ 10.  
7. `/api/logs` → show entries for the requests you just made.

---

## Troubleshooting

- **502 on Render:** app crashed or missing env vars.  
  - Check Logs in Render.  
  - Set `MONGODB_URI` + `NODE_ENV=production`, correct start command `node ./bin/www`.  
  - Ensure Atlas Network Access allows connections.  
  - Redeploy (Clear build cache).
- **Mongo connect error (SRV ENOTFOUND/EBADNAME):** URI malformed. Ensure the `_test` suffix is after the **slash** (DB name), not inside the host.  
  `...@cluster.mongodb.net/costmanager_test` ✅  
  `...@cluster.mongodb.net_test` ❌
- **Validation errors:** Check bodies match schemas, category whitelist, date not in past.


rendered URL: https://server-side-final-project-ovhm.onrender.com/
