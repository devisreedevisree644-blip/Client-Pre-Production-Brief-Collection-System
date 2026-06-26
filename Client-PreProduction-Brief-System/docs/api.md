# DigiQuest Studio Brief Portal - API Documentation

All API requests are sent to `http://localhost:5000/api`.

---

## Authentication Endpoints

### 1. Register User / Client
* **POST** `/auth/register`
* **Request Body**:
  ```json
  {
    "username": "client_jane",
    "email": "jane@acme.com",
    "password": "Password123!",
    "role": "Client",
    "company_name": "Acme Corp"
  }
  ```
* **Success Response (201)**:
  ```json
  {
    "token": "eyJhbG...",
    "user": { "id": 3, "username": "client_jane", "email": "jane@acme.com", "role": "Client", "client_id": 1 }
  }
  ```

### 2. Login User
* **POST** `/auth/login`
* **Request Body**:
  ```json
  { "email": "admin@digiqueststudio.com", "password": "Password123!" }
  ```
* **Response (200)**: Token & user details.

---

## Project Briefs Endpoints (Requires JWT)

### 1. List Briefs
* **GET** `/briefs`
* **Query Parameters**: `search`, `status`, `priority`, `client_id`, `page`, `sort_by`, `order`
* **Response (200)**: `{ data: [...], pagination: { total, page, limit, totalPages } }`

### 2. Get Brief Details
* **GET** `/briefs/:id`
* **Response (200)**: Full brief specifications with attachments array, comments feed, and audit history logs.

### 3. Create Brief
* **POST** `/briefs`
* **Request Body**: Brief parameters (Basic, Timeline, Approval contacts).

### 4. Patch Brief Status
* **PATCH** `/briefs/:id/status`
* **Request Body**: `{ "status": "Submitted" }`

### 5. Upload Attachment file
* **POST** `/briefs/:id/attachments`
* **Headers**: `Content-Type: multipart/form-data`
* **Request Body**: `file` (binary), `attachment_type` (script/reference_image/etc)

---

## Comments Endpoints

* **GET** `/briefs/:id/comments` - Fetch comments for brief.
* **POST** `/briefs/:id/comments` - Post comment (scans for `@username` mentions).

---

## Reports & Analytics (Admin/PM Only)

* **GET** `/reports/summary` - Aggregated status counts, priorities, and average approval time.
* **GET** `/reports/trends` - Submissions counts by month.
* **GET** `/reports/export` - Triggers CSV sheet download.
