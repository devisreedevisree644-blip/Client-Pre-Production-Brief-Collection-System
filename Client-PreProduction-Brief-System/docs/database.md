# Database Documentation - DigiQuest Pre-Production Portal

The database is powered by **PostgreSQL** with 7 structured tables.

---

## Entity Relationship Summary

```
   +-------------+
   |   clients   | <--------------+
   +-------------+                |
          ^                       |
          | 1:N (Set Null)        | 1:N (Cascade)
   +-------------+                |
   |    users    | <--------+     |
   +-------------+          |     |
          ^                 |     |
          | 1:N (Set Null)  |     |
   +-------------+          |     |
   |   briefs    | ---------+-----+
   +-------------+
      |  |  |  |
      |  |  |  +----> [ attachments ]   (1:N Cascade)
      |  |  +-------> [ comments ]      (1:N Cascade)
      |  +----------> [ notifications ] (1:N Cascade)
      +-------------> [ audit_logs ]    (1:N Set Null)
```

---

## Tables Dictionary

### 1. clients
Stores company profile details:
* `id` SERIAL PRIMARY KEY
* `company_name` VARCHAR(100) NOT NULL
* `contact_person` VARCHAR(100) NOT NULL
* `email` VARCHAR(100) UNIQUE NOT NULL
* `phone` VARCHAR(20)
* `address` TEXT
* `website` VARCHAR(100)

### 2. users
Saves user logins, roles, and client company associations:
* `id` SERIAL PRIMARY KEY
* `username` VARCHAR(50) UNIQUE NOT NULL
* `password` VARCHAR(255) NOT NULL (Bcrypt hashed)
* `email` VARCHAR(100) UNIQUE NOT NULL
* `role` VARCHAR(20) NOT NULL CHECK (Admin, Project Manager, Client)
* `client_id` INTEGER REFERENCES clients(id) ON DELETE SET NULL

### 3. briefs
Pre-production requirements entries:
* `id` SERIAL PRIMARY KEY
* `project_name` VARCHAR(100) NOT NULL
* `project_type` VARCHAR(50) NOT NULL
* `client_id` INTEGER REFERENCES clients(id) ON DELETE CASCADE
* `status` VARCHAR(30) (Draft, Submitted, Under Review, Revision Requested, Approved, Rejected, Archived)
* `priority` VARCHAR(20) (Low, Medium, High, Urgent)
* `approval_contact_name`, `approval_contact_email`, `approval_contact_phone`
* `created_by` INTEGER REFERENCES users(id) ON DELETE SET NULL

### 4. attachments
References files uploaded to `backend/src/uploads`:
* `id` SERIAL PRIMARY KEY
* `brief_id` INTEGER REFERENCES briefs(id) ON DELETE CASCADE
* `file_name` VARCHAR(255), `file_path` VARCHAR(255), `file_type` VARCHAR(100), `file_size` INTEGER
* `attachment_type` VARCHAR(50) (script, brand_guideline, reference_image, additional_doc)
* `uploaded_by` INTEGER REFERENCES users(id)

### 5. audit_logs
Captures brief changes, status logs, and updates:
* `id` SERIAL PRIMARY KEY
* `user_id` REFERENCES users(id) ON DELETE SET NULL
* `action` VARCHAR(100) ('Brief Created', 'Status Changed', etc)
* `entity` VARCHAR(50) ('brief', 'comment')
* `old_value` JSONB, `new_value` JSONB

---

## Trigger Functions
* `update_updated_at_column()`: Auto-triggers on updates to `clients`, `users`, `briefs`, and `comments` to update their `updated_at` timestamps to the current system time.
