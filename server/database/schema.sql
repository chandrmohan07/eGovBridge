-- =============================================================================
-- SIH Unified Government Service Integration Platform — PostgreSQL Schema
-- Database DDL Specification
-- =============================================================================

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    ministry VARCHAR(255) NOT NULL,
    active_officers_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table (Citizens, Officers, Admins)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
    department_code VARCHAR(50),
    designation VARCHAR(255),
    phone VARCHAR(50),
    aadhaar_masked VARCHAR(50),
    kyc_status VARCHAR(100) DEFAULT 'Pending Verification',
    state VARCHAR(100) DEFAULT 'General',
    district VARCHAR(100) DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_code);

-- 3. Sessions Store (Active Bearer Tokens)
CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 4. Government Services Catalog
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
    department_code VARCHAR(50) NOT NULL,
    adapter_code VARCHAR(50),
    category VARCHAR(100) NOT NULL,
    description TEXT,
    who_can_apply TEXT,
    eligibility TEXT,
    required_documents JSONB DEFAULT '[]'::jsonb,
    turnaround_time VARCHAR(100),
    application_method VARCHAR(100) DEFAULT 'Online (Unified Citizen Portal)',
    service_status VARCHAR(50) DEFAULT 'Active',
    application_availability VARCHAR(50) DEFAULT 'Open',
    official_url VARCHAR(255),
    fee VARCHAR(50) DEFAULT 'Free',
    integration_mode VARCHAR(100),
    keywords JSONB DEFAULT '[]'::jsonb,
    workflow_stages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_dept_code ON services(department_code);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);

-- 5. Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(100) PRIMARY KEY,
    applicant_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    applicant_name VARCHAR(255) NOT NULL,
    service_id VARCHAR(50) REFERENCES services(id) ON DELETE SET NULL,
    service_name VARCHAR(255) NOT NULL,
    department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
    department_code VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    current_stage VARCHAR(255),
    amount VARCHAR(100) DEFAULT 'N/A',
    form_data JSONB DEFAULT '{}'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    timeline JSONB DEFAULT '[]'::jsonb,
    officer_notes JSONB DEFAULT '[]'::jsonb,
    remarks TEXT,
    submitted_date VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_dept_status ON applications(department_code, status);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- 6. Smart Orchestration Instances (DAG Task Workflows)
CREATE TABLE IF NOT EXISTS orchestrations (
    id VARCHAR(100) PRIMARY KEY,
    application_id VARCHAR(100) NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    applicant_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    current_stage VARCHAR(255),
    tasks JSONB DEFAULT '[]'::jsonb,
    retry_counts JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orchestrations_app_id ON orchestrations(application_id);
CREATE INDEX IF NOT EXISTS idx_orchestrations_applicant_id ON orchestrations(applicant_id);

-- 7. Digital Document Vault
CREATE TABLE IF NOT EXISTS vault_documents (
    id VARCHAR(100) PRIMARY KEY,
    citizen_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_reference VARCHAR(255) NOT NULL,
    document_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    file_content_base64 TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    applications JSONB DEFAULT '[]'::jsonb,
    version INT DEFAULT 1,
    expiry_date TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vault_citizen_id ON vault_documents(citizen_id);
CREATE INDEX IF NOT EXISTS idx_vault_doc_type ON vault_documents(document_type);

-- 8. Vault Security Audit Logs
CREATE TABLE IF NOT EXISTS vault_audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    document_id VARCHAR(100),
    actor_id VARCHAR(100),
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_vault_audit_doc ON vault_audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_vault_audit_actor ON vault_audit_logs(actor_id);

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(100) PRIMARY KEY,
    recipient_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    channel VARCHAR(50) DEFAULT 'IN_APP',
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);

-- 10. Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id VARCHAR(100) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    in_app BOOLEAN DEFAULT TRUE,
    email BOOLEAN DEFAULT TRUE,
    sms BOOLEAN DEFAULT FALSE,
    categories JSONB DEFAULT '{"statusUpdates": true, "reminders": true, "broadcasts": true}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. Content Hub Items (Opportunities, Scholarships, Schemes, Announcements)
CREATE TABLE IF NOT EXISTS content_hub_items (
    id VARCHAR(100) PRIMARY KEY,
    item_type VARCHAR(50) NOT NULL, -- 'EMPLOYMENT', 'SCHOLARSHIP', 'SCHEME', 'ANNOUNCEMENT'
    title VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    category VARCHAR(100),
    description TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_hub_type ON content_hub_items(item_type, is_active);

-- 12. User Saved Items
CREATE TABLE IF NOT EXISTS user_saved_items (
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    item_id VARCHAR(100) NOT NULL,
    saved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, item_type, item_id)
);

-- 13. Citizen Persona & Personalization Preferences
CREATE TABLE IF NOT EXISTS citizen_preferences (
    user_id VARCHAR(100) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    persona VARCHAR(50) DEFAULT 'GENERAL',
    qualification VARCHAR(100),
    preferred_location VARCHAR(100),
    skills JSONB DEFAULT '[]'::jsonb,
    interests JSONB DEFAULT '[]'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    dismissed_recommendations JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. Grievances Table
CREATE TABLE IF NOT EXISTS grievances (
    id VARCHAR(100) PRIMARY KEY,
    citizen_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    citizen_name VARCHAR(255) NOT NULL,
    department_id VARCHAR(50),
    department_code VARCHAR(50) NOT NULL,
    application_id VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    priority VARCHAR(50) DEFAULT 'MEDIUM',
    officer_notes JSONB DEFAULT '[]'::jsonb,
    resolution_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grievances_citizen_id ON grievances(citizen_id);
CREATE INDEX IF NOT EXISTS idx_grievances_dept_code ON grievances(department_code);

-- 15. Citizen Feedbacks Table
CREATE TABLE IF NOT EXISTS feedbacks (
    id VARCHAR(100) PRIMARY KEY,
    citizen_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    citizen_name VARCHAR(255) NOT NULL,
    application_id VARCHAR(100),
    service_id VARCHAR(50),
    department_code VARCHAR(50),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    category VARCHAR(100),
    feedback_text TEXT NOT NULL,
    sentiment VARCHAR(50) DEFAULT 'NEUTRAL',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_citizen_id ON feedbacks(citizen_id);

-- 16. Centralized System Audit Trail
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    actor_id VARCHAR(100),
    actor_role VARCHAR(50),
    target_id VARCHAR(100),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_event_type ON system_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON system_audit_logs(actor_id);
