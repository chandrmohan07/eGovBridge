-- =============================================================================
-- SIH Unified Government Service Integration Platform — PostgreSQL Seed Data
-- =============================================================================

-- 1. Departments Seed
INSERT INTO departments (id, code, name, ministry, active_officers_count) VALUES
('DEP-EDU', 'EDUCATION', 'Department of Higher Education', 'Ministry of Education', 14),
('DEP-REV', 'REVENUE', 'State Revenue & Land Records Department', 'Ministry of Revenue', 22),
('DEP-HLT', 'HEALTH', 'Ministry of Health & Family Welfare', 'National Health Mission', 18),
('DEP-TRN', 'TRANSPORT', 'Ministry of Road Transport & Highways', 'Transport Division', 12),
('DEP-AGR', 'AGRICULTURE', 'Department of Agriculture & Farmers Welfare', 'Ministry of Agriculture', 16)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    ministry = EXCLUDED.ministry,
    active_officers_count = EXCLUDED.active_officers_count;

-- 2. Users Seed (Pre-hashed Scrypt)
INSERT INTO users (id, email, password_hash, salt, name, role, department_id, department_code, designation, phone, aadhaar_masked, kyc_status, state, district, created_at) VALUES
('USR-CIT-001', 'citizen@example.com', '5234395a232f504a8d902447a0194150e5379616f296dca885fa68dcf3157bf5e20dc94f98f25e497b83878ff1a28897dab3d29a0871129b62ab57056a93e02e', 'salt_citizen_1001', 'Rahul Verma', 'CITIZEN', NULL, NULL, NULL, '+91 98765 43210', 'XXXX-XXXX-4819', 'Verified (DigiLocker Linked)', 'Maharashtra', 'Pune', '2026-01-15T10:00:00Z'),
('USR-OFF-EDU-001', 'officer.edu@gov.in', 'a41c2b57ab6f958f9614731aaa2296800893bb51e6d385a152817283c83fa6af047b5238c0274ed2b07703511b04e35aed41b571b0cc6dff8b4b7a478ae208db', 'salt_officer_1002', 'Dr. Sunita Sharma', 'OFFICER', 'DEP-EDU', 'EDUCATION', 'Senior Verification Officer (Higher Education)', '+91 98111 22334', NULL, 'Pending Verification', 'National / Central', 'General', '2026-02-01T09:00:00Z'),
('USR-OFF-REV-002', 'officer.rev@gov.in', '0dc19ef19a929726a0adf077d104f14f955f92f4fcab7279ce6d21ea4a40bc2625adddbb5a15716b9562acab5f46aa1abd753e6003672d4f6b16c2e88e12c969', 'salt_officer_1003', 'Vikram Singh', 'OFFICER', 'DEP-REV', 'REVENUE', 'Sub-Divisional Revenue Officer', '+91 98222 33445', NULL, 'Pending Verification', 'Maharashtra', 'General', '2026-02-05T09:00:00Z'),
('USR-ADM-001', 'admin@gov.in', '0864c80471d0f48e1ca48b08fd6c9ca0e482d3cb7219881bbd53757d1ce98d7761ff3c98889650f558848b20a3e32e1af5fe500e73edf0459bd5968608726a05', 'salt_admin_1004', 'Rajesh Nair', 'ADMIN', NULL, NULL, 'Principal Platform Administrator', '+91 98999 00112', NULL, 'Pending Verification', 'New Delhi', 'General', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role;

-- 3. Services Seed
INSERT INTO services (id, code, title, department, department_id, department_code, adapter_code, category, description, who_can_apply, eligibility, required_documents, turnaround_time, fee, integration_mode, keywords, workflow_stages) VALUES
('SRV-EDU-001', 'SCHOLARSHIP_POST_MATRIC', 'Post-Matric Scholarship for Higher Education', 'Department of Higher Education', 'DEP-EDU', 'EDUCATION', 'EDU_ADAPTER', 'Scholarships', 'Financial support for post-matriculation students pursuing approved undergraduate or graduate courses.', 'SC/ST/OBC and economically weaker section students admitted to recognized colleges/universities.', 'Annual family income under ₹2,50,000; Minimum 60% marks in previous examination.', '["Income Certificate", "Caste Certificate", "Previous Marksheet", "Admission Fee Receipt", "Bank Passbook"]'::jsonb, '7-10 Working Days', 'Free', 'Live Native Adapter', '["scholarship", "education", "post-matric", "college", "university", "grant"]'::jsonb, '["Automated Eligibility Verification", "Department Officer Document Scrutiny", "Sanction & Disbursal Notification"]'::jsonb),
('SRV-REV-002', 'CERT_INCOME', 'Issuance of Income Certificate', 'State Revenue & Land Records Department', 'DEP-REV', 'REVENUE', 'REV_ADAPTER', 'Certificates', 'Official statutory certificate verifying an individual or family annual household income.', 'All state residents requiring proof of annual income for government schemes or educational admissions.', 'Resident of the state for minimum 3 years with valid proof of earnings.', '["Salary Certificate / Form 16", "Ration Card", "Affidavit of Income", "Aadhaar Card"]'::jsonb, '3-5 Working Days', '₹30 (e-Challan)', 'Live Native Adapter', '["income", "certificate", "revenue", "tehsildar", "proof"]'::jsonb, '["Document Verification by Revenue Inspector", "Tehsildar Digital Signature", "Certificate Delivery to Digital Vault"]'::jsonb),
('SRV-HLT-003', 'HEALTH_AYUSHMAN_CARD', 'Ayushman Bharat Golden Health Card', 'Ministry of Health & Family Welfare', 'DEP-HLT', 'HEALTH', 'HLT_ADAPTER', 'Healthcare', 'Cashless secondary and tertiary hospitalization cover up to ₹5 Lakh per family per year.', 'Eligible families mapped under SECC 2011 database or state health entitlement lists.', 'Listed in NFSA / PM-JAY beneficiary rolls; valid Aadhaar authentication.', '["Aadhaar Card", "Ration Card", "PM-JAY Family ID Slip"]'::jsonb, '1-2 Working Days', 'Free', 'Live Native Adapter', '["health", "insurance", "ayushman", "pmjay", "hospital", "cashless"]'::jsonb, '["SECC Database Entitlement Lookup", "e-KYC Biometric Verification", "Instant Digital Card Generation"]'::jsonb),
('SRV-TRN-004', 'TRANSPORT_DL_RENEWAL', 'Driving License Renewal & Address Update', 'Ministry of Road Transport & Highways', 'DEP-TRN', 'TRANSPORT', 'TRN_ADAPTER', 'Transport', 'Facilitates seamless online renewal and residential endorsement for non-transport motor vehicle licenses.', 'Holders of expired or soon-to-expire driving licenses.', 'Current driving license expired within less than 1 year; Valid medical self-declaration Form 1A.', '["Expired Driving License", "Medical Certificate (Form 1A)", "Address Proof (Aadhaar/Utility Bill)"]'::jsonb, '5-7 Working Days', '₹200 + Postal Fee', 'Live Native Adapter', '["license", "driving", "transport", "renewal", "sarathi", "rto"]'::jsonb, '["Sarathi Central Portal Synchronisation", "RTO Automated Scrutiny", "Smart Card Dispatch"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description;

-- 4. Applications Seed
INSERT INTO applications (id, applicant_id, applicant_name, service_id, service_name, department_id, department_code, status, current_stage, amount, form_data, documents, submitted_date) VALUES
('APP-2026-EDU-8812', 'USR-CIT-001', 'Rahul Verma', 'SRV-EDU-001', 'Post-Matric Scholarship for Higher Education', 'DEP-EDU', 'EDUCATION', 'ORCHESTRATING', 'Smart Orchestration / Revenue Cross-Verification', '₹25,000 / year', '{"college": "Pune Institute of Technology", "course": "B.Tech Computer Science", "annualIncome": 180000}'::jsonb, '["Income Certificate", "Previous Marksheet", "Admission Letter"]'::jsonb, '2026-08-28'),
('APP-2026-REV-4109', 'USR-CIT-001', 'Rahul Verma', 'SRV-REV-002', 'Issuance of Income Certificate', 'DEP-REV', 'REVENUE', 'APPROVED', 'Approved & Digitally Signed', 'N/A', '{"declaredIncome": 180000, "tehsil": "Haveli", "occupation": "Salaried"}'::jsonb, '["Salary Slips", "Ration Card"]'::jsonb, '2026-08-15')
ON CONFLICT (id) DO NOTHING;

-- 5. Vault Documents Seed
INSERT INTO vault_documents (id, citizen_id, document_type, document_name, file_name, file_type, file_size, storage_reference, document_status, metadata, applications, version) VALUES
('DOC-2026-AADH-01', 'USR-CIT-001', 'IDENTITY_PROOF', 'Aadhaar e-KYC Card', 'aadhaar_rahul_verma.pdf', 'application/pdf', 148200, 'vault/USR-CIT-001/doc_seed_aadhaar.pdf', 'VERIFIED', '{"issuingAuthority": "Unique Identification Authority of India (UIDAI)", "verificationMode": "DigiLocker Linked e-KYC"}'::jsonb, '["APP-2026-EDU-8812"]'::jsonb, 1),
('DOC-2026-INCM-02', 'USR-CIT-001', 'INCOME_PROOF', 'State Revenue Income Certificate', 'income_cert_2026.pdf', 'application/pdf', 214500, 'vault/USR-CIT-001/doc_seed_income.pdf', 'VERIFIED', '{"issuingAuthority": "Sub-Divisional Magistrate, State Revenue Dept", "annualIncome": "₹1,80,000", "validThrough": "2027-03-31"}'::jsonb, '["APP-2026-EDU-8812"]'::jsonb, 1)
ON CONFLICT (id) DO NOTHING;

-- 6. Notifications Seed
INSERT INTO notifications (id, recipient_id, type, title, message, channel, is_read) VALUES
('NOTIF-2026-001', 'USR-CIT-001', 'APPLICATION_STATUS', 'Application Cross-Verification Underway', 'Your application APP-2026-EDU-8812 has completed Stage 1 Identity validation and is now under Revenue cross-verification.', 'IN_APP', false),
('NOTIF-2026-002', 'USR-CIT-001', 'SECURITY_ALERT', 'New Login from Known Device', 'Your account was accessed via Unified Portal on 2026-09-01.', 'IN_APP', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Notification Preferences Seed
INSERT INTO notification_preferences (user_id, in_app, email, sms, categories) VALUES
('USR-CIT-001', true, true, false, '{"statusUpdates": true, "reminders": true, "broadcasts": true}'::jsonb)
ON CONFLICT (user_id) DO NOTHING;
