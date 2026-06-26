# DigiQuest Studio - System Architecture Guide

The Client Pre-Production Brief System is a full-stack, modular architecture designed for high security, role isolation, and auditing consistency.

---

## Architectural Layers

```
        +----------------------------------------+
        |            React Client App            |
        |  (Contexts, Routes, Services, Views)   |
        +----------------------------------------+
                            ||   REST JSON Calls
                            \/
        +----------------------------------------+
        |              Express APIs              |
        |  (Routing Layer: /api/auth, /briefs)   |
        +----------------------------------------+
                            ||   Request Flow
                            \/
        +----------------------------------------+
        |         Security & Verification        |
        |  (JWT guard, Validator, Multer filter) |
        +----------------------------------------+
                            ||   Authorized Data
                            \/
        +----------------------------------------+
        |            Business Services           |
        |    (Audit Logger, Notification Center) |
        +----------------------------------------+
                            ||   Queries
                            \/
        +----------------------------------------+
        |          PostgreSQL Database           |
        |          (Schema, Seed, Triggers)      |
        +----------------------------------------+
```

---

## Backend Subsystems

1. **Routing Layer**: Routing controllers match request verbs to database CRUD methods.
2. **Middleware Interceptors**:
   * `authMiddleware.protect`: Inspects JWT tokens.
   * `authMiddleware.authorize`: Inspects roles (Admin, PM, Client).
   * `uploadMiddleware`: Integrates Multer storage pipelines on disk, rejecting invalid formats or oversized files.
3. **Core Services**:
   * `auditService`: Logs activities with previous/current state values in JSONB formatting.
   * `notificationService`: Manages in-app alerts and compiles styled HTML email templates.

---

## Frontend Subsystems

1. **API Client (`api.js`)**: Configures Axios headers, intercepts responses, and automatically signs out clients on 401 token expirations.
2. **Authentication Context (`AuthContext.jsx`)**: Exposes login states, user profile values, and login session methods globally using React hooks.
3. **AppLayout**: Groups common navigation templates (Sidebar and Navbar containing the bell alert dropdown) to enclose screens.
