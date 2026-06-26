-- Database Schema for DigiQuest Studio Pre-Production Brief Collection System

-- Enable UUID extension if needed in future (optional)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist to allow clean setups (ordered by dependency)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS briefs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- 1. Clients Table
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    website VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Project Manager', 'Client')),
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Pre-Production Briefs Table
CREATE TABLE briefs (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(100) NOT NULL,
    project_type VARCHAR(50) NOT NULL,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    project_description TEXT,
    script TEXT,
    references_text TEXT,
    brand_guidelines TEXT,
    delivery_format VARCHAR(50),
    languages_required VARCHAR(100),
    target_audience TEXT,
    project_objective TEXT,
    start_date DATE,
    delivery_date DATE,
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    approval_contact_name VARCHAR(100),
    approval_contact_email VARCHAR(100),
    approval_contact_phone VARCHAR(20),
    special_instructions TEXT,
    production_notes TEXT,
    status VARCHAR(30) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Under Review', 'Revision Requested', 'Approved', 'Rejected', 'Archived')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Attachments Table
CREATE TABLE attachments (
    id SERIAL PRIMARY KEY,
    brief_id INTEGER NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    attachment_type VARCHAR(50) NOT NULL, -- 'script', 'brand_guideline', 'reference_image', 'additional_doc'
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Comments Table
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    brief_id INTEGER NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    reactions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Notifications Table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'submission', 'status_change', 'comment', 'deadline', 'approval_required'
    is_read BOOLEAN DEFAULT FALSE,
    brief_id INTEGER REFERENCES briefs(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Audit Logs Table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g. 'Brief Created', 'Brief Updated', 'Status Changed', 'Comment Added', 'File Uploaded'
    entity VARCHAR(50) NOT NULL,  -- 'brief', 'comment', 'user', 'client', 'attachment'
    entity_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auto Update Timestamp Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_briefs_updated_at BEFORE UPDATE ON briefs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Indexes for performance optimizations
CREATE INDEX idx_users_client_id ON users(client_id);
CREATE INDEX idx_briefs_client_id ON briefs(client_id);
CREATE INDEX idx_briefs_status ON briefs(status);
CREATE INDEX idx_attachments_brief_id ON attachments(brief_id);
CREATE INDEX idx_comments_brief_id ON comments(brief_id);
CREATE INDEX idx_notifications_user_id_read ON notifications(user_id, is_read);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
