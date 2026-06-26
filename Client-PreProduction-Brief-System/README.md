# Client Pre-Production Brief Collection System

A production-ready web portal built for **DigiQuest Studio** to collect, manage, review, and approve pre-production briefs submitted by clients before project kickoff.

---

## Technical Stack
* **Frontend**: React.js (Vite compiler), React Router, Axios, Chart.js (react-chartjs-2)
* **Backend**: Node.js, Express.js
* **Database**: PostgreSQL (pg pool client)
* **Authentication**: JSON Web Tokens (JWT) & Bcrypt password hashing
* **File Uploads**: Multer
* **Styling**: Standard vanilla CSS (separate file per screen)

---

## Directory Structure
```
Client-PreProduction-Brief-System/
├── README.md
├── requirements.md
├── .env
├── .gitignore
├── package.json
├── database/
│   ├── schema.sql
│   └── seed.sql
├── backend/
│   ├── src/
│   │   ├── config/       # pg Pool config
│   │   ├── controllers/  # API controllers
│   │   ├── middleware/   # JWT, Multer, Error handlers
│   │   ├── routes/       # Router mappings
│   │   ├── services/     # Audit logger, Notifications center
│   │   ├── validators/   # Form validators
│   │   └── uploads/      # Upload files directory
│   └── server.js
└── frontend/
    ├── src/
    │   ├── context/      # Auth session provider
    │   ├── layouts/      # AppLayout drawer
    │   ├── components/   # Navbar, Sidebar, Breadcrumbs, Spreads
    │   ├── services/     # API request endpoints
    │   ├── pages/        # Screen folders (Landing, Dashboard, Briefs, Clients, Users)
    │   └── styles/       # Global CSS variables & elements
    └── index.html
```

---

## Quick Setup Instructions

### 1. Database Provisioning
Create a PostgreSQL database called `digiquest_briefs` and execute the schema and seed scripts:
```bash
# Run schema and seed
psql -U postgres -d digiquest_briefs -f database/schema.sql
psql -U postgres -d digiquest_briefs -f database/seed.sql
```

### 2. Environment Variables Configuration
Confirm the `.env` settings in the root directory:
```env
PORT=5000
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=digiquest_briefs
JWT_SECRET=digiquest_preprod_brief_jwt_secret_key_2026_super_secure
```

### 3. Installation
Install all dependencies for root, backend, and frontend at once:
```bash
npm run install-all
```

### 4. Running the Project Locally
Start both backend (Express) and frontend (Vite React) concurrently:
```bash
npm run dev
```
* **Frontend Site**: http://localhost:5173
* **Backend API**: http://localhost:5000

---

## Seeding Login Credentials
For testing purposes, login using these seeded accounts (Password: `Password123!`):

| Role | Username | Email | Company |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin@digiqueststudio.com` | DigiQuest |
| **Project Manager** | `pm_sarah` | `sarah.pm@digiqueststudio.com` | DigiQuest |
| **Client** | `client_jane` | `jane.doe@acme.com` | Acme Creative Agency |
| **Client** | `client_hank` | `hank@globex.com` | Globex Video Corp |

---

## Running Automated Tests
Run unit and integration test suites:
```bash
npm test
```
*Tests mock the database context, ensuring tests can execute standalone.*
