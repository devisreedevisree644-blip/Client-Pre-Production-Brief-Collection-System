# Client Pre-Production Brief Collection System - Requirements

## Overview
A web application for DigiQuest Studio to collect, manage, review, and approve pre-production briefs submitted by clients before project kickoff.

## Technology Stack
- **Frontend**: React.js, React Router, Axios, Chart.js (react-chartjs-2)
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (pg)
- **Authentication**: JWT, bcryptjs
- **File Uploads**: Multer
- **Styling**: Standard CSS (separate file per page/component)

## Strict Project Structure
```
Client-PreProduction-Brief-System/
├── README.md
├── requirements.md
├── .env
├── .gitignore
├── package.json
├── frontend/
├── backend/
├── database/
├── docs/
└── tests/
```

## User Roles & Capabilities
1. **Admin**: Manage all briefs, clients, users, reports, notifications, audit logs, and export reports.
2. **Project Manager**: Review briefs, approve briefs, request revisions, view reports, and add comments.
3. **Client**: Register, login, create briefs, upload files, view status, and reply to comments.

## Core Modules
1. **Authentication**: Register, login, logout, forgot/reset password, role-based access control.
2. **Client Management**: Create, update, delete, search, and filter clients (company_name, contact_person, email, phone, address, website).
3. **Pre-Production Brief Form**: Project Name, Project Type, Client Name, Project Description, Script, References, Brand Guidelines, Delivery Format, Languages, Target Audience, Project Objective, Start/Delivery Dates, Priority, Approval Contact (Name, Email, Phone), Special Instructions, and file attachments (Script, Brand Guideline, Reference Images, Additional Docs).
4. **File Uploads**: PDFs, DOCX, JPG, PNG, ZIP. Enforce format/size validation.
5. **Workflow Transitions**:
   - `Draft` → `Submitted`
   - `Submitted` → `Under Review`
   - `Under Review` → `Approved`
   - `Under Review` → `Revision Requested`
   - `Revision Requested` → `Submitted`
   - `Approved` → `Archived`
   - `Under Review` → `Rejected` (added for completeness)
6. **Comments Module**: Add, edit/delete own comments, mention users.
7. **Audit Log**: Auto-records actions (Created, Updated, Status Changed, Comment Added, File Uploaded).
8. **Notification Module**: In-app Notification Center and structured email templates.
9. **Reports & Analytics**: Aggregated KPIs, trends, bar/line/pie charts, and CSV/Excel export.
