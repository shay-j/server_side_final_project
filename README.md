# Cost Manager RESTful API Services

Node.js + Express.js + MongoDB (Atlas) + Mongoose.  
Implements users, costs, monthly reports, request logging, validation, HTML interface, and deployment on Render.

---

## 📑 Table of Contents
- [🔗 Live Demo](#-live-demo)
- [📂 Project Structure](#-project-structure)
- [⚙️ Environment Variables](#️-environment-variables)
- [▶️ Install & Run Locally](#️-install--run-locally)
- [🖥️ API Quick Tests](#️-api-quick-tests)
    - [Localhost (Browser URLs)](#localhost-browser-urls)
    - [PowerShell (irm)](#powershell-irm)
- [🧪 Tests](#-tests)
- [🧹 Cleanup Script](#-cleanup-script)
- [🏗️ Design Patterns Used](#️-design-patterns-used)
- [📚 References](#-references)

---

## 🔗 Live Demo
Render deployment: [Click here to test](https://server-side-final-project-ovhm.onrender.com)

**HTML Interface:** open `public/index.html` for interactive demo.

![Demo Screenshot](https://github.com/shay-j/server_side_final_project/blob/master/Demo.png?raw=true)


---

## 📂 Project Structure

```
bin/
  www                 # server bootstrap (listens after Mongo connects)

app.js                # Express app, middleware, routes mount

src/
  controllers/        # cost, user, report, about, logs
  middleware/         # validate, errorHandler, request_logger
  models/             # User, AddController, LogController, Report
  utils/              # constants, date utils, report builder
  db.js               # mongoose connection
  logger.js           # pino + pino-http
  routes/
    index.js          # /api/* routes

scripts/
  cleanup.js          # database cleanup utility

tests/
  api.e2e.test.js     # Jest + Supertest tests

requests.http         # WebStorm HTTP client requests
```

**Flow example:**  
`bin/www` → `src/app.js` → `routes/index.js` → Controller → Service → Model → MongoDB

---

## ⚙️ Environment Variables

The project uses `.env` (development) and `.env.test` (tests).  
Main variables:
* PORT=3000  
* MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
* MONGODB_URI=mongodb+srv://<DB_USERNAME>:<DB_PASSWORD>@<CLUSTER_HOST>/<DB_NAME>?retryWrites=true&w=majority
* NODE_ENV=development

---

## ▶️ Install & Run Locally

git clone https://github.com/shay-j/server_side_final_project.git  
cd server_side_final_project  
npm install  
npm start

Check: http://localhost:3000/health → `{ "ok": true }`

---

## 🖥️ API Quick Tests

### Localhost (Browser URLs)

- http://localhost:3000/health
- http://localhost:3000/api/about
- http://localhost:3000/api/users
- http://localhost:3000/api/users/123123
- http://localhost:3000/api/report?id=123123&year=2025&month=9
- http://localhost:3000/api/logs

Replace `localhost:3000` with your Render URL to test the deployed version.

---

### PowerShell (irm)
#### Health
```
irm http://localhost:3000/health
```

#### About (team)
```
irm http://localhost:3000/api/about

The response:
[
  {
    "first_name": "Shay",
    "last_name": "Yeffet"
  },
  {
    "first_name": "Yehonatan",
    "last_name": "Ravoach"
  }
]

```

#### Add user
```
irm -Method Post -Uri http://localhost:3000/api/add -ContentType 'application/json' -Body '{ "id":123123, "first_name":"mosh", "last_name":"israeli", "birthday":"1990-01-01" }'
```

#### List users
```
irm http://localhost:3000/api/users
```

#### User details
```
irm http://localhost:3000/api/users/123123
```

#### Add cost (default date = now)
```
irm -Method Post -Uri http://localhost:3000/api/add -ContentType 'application/json' -Body '{ "userid":123123, "description":"milk", "category":"food", "sum":10 }'
```

#### Add cost with explicit date
```
irm -Method Post -Uri http://localhost:3000/api/add -ContentType 'application/json' -Body '{ "userid":123123, "description":"book", "category":"education", "sum":50, "date":"2025-09-10T00:00:00Z" }'
```

#### Invalid category (expect 400)
```
irm -Method Post -Uri http://localhost:3000/api/add -ContentType 'application/json' -Body '{ "userid":123123, "description":"plane", "category":"travel", "sum":200 }'
```

#### Monthly report
```
irm 'http://localhost:3000/api/report?id=123123&year=2025&month=9' | ConvertTo-Json -Depth 10
```

#### Request logs
```
irm http://localhost:3000/api/logs
```

---

## 🧪 Tests

Integration tests are written with **Jest + Supertest**.  
They run against a dedicated test database (`.env.test`).

Run all tests:
```
npm test
```
Expected output: all tests passing (`xx passed`).

---

## 🧹 Cleanup Script

Utility script to reset the database and keep only a default user.

**Scripts (package.json):**  
```
{  
"scripts": {  
"cleanup": "node scripts/cleanup.js --yes",  
"cleanup:dry": "node scripts/cleanup.js --dry"  
}  
}
```
**Usage:**

# Preview only (dry run)
```
npm run cleanup:dry
```

# Apply deletions
```
npm run cleanup
```

Optional custom identity:
```
node scripts/cleanup.js --id=123123 --first=mosh --last=israeli --birthday=1990-01-01 --yes
```

---

## 🏗️ Design Patterns Used
- Middleware Pattern – request validation, logging, error handling
- Service Pattern – business logic separated from controllers
- Data Transfer Object (DTO) – structured data between layers
- Computed Pattern – reports are computed and cached for past months

---

## 👥 Team Members
- Shay Yeffet
- Yehonatan Ravoach

