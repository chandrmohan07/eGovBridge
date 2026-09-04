/**
-- =============================================================================
-- SIH Unified Government Service Integration Platform — PostgreSQL Repository
-- Asynchronous data access layer mapping platform domain models to PostgreSQL tables.
-- =============================================================================
*/

import crypto from 'node:crypto';
import { postgres } from './postgres.js';

// Password hashing helper (compatible with native crypto)
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export const postgresRepository = {
  // ---------------------------------------------------------------------------
  // 1. Users & Authentication
  // ---------------------------------------------------------------------------
  async findUserByEmail(email) {
    if (!email) return null;
    const res = await postgres.query(
      `SELECT id, email, password_hash as "passwordHash", salt, name, role, 
              department_id as "departmentId", department_code as "departmentCode", 
              designation, phone, aadhaar_masked as "aadhaarMasked", 
              kyc_status as "kycStatus", state, district, created_at as "createdAt"
       FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email.trim()]
    );
    return res.rows[0] || null;
  },

  async findUserById(id) {
    if (!id) return null;
    const res = await postgres.query(
      `SELECT id, email, password_hash as "passwordHash", salt, name, role, 
              department_id as "departmentId", department_code as "departmentCode", 
              designation, phone, aadhaar_masked as "aadhaarMasked", 
              kyc_status as "kycStatus", state, district, created_at as "createdAt"
       FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async getUsersByRole(role) {
    const res = await postgres.query(
      `SELECT id, email, name, role, department_id as "departmentId", 
              department_code as "departmentCode", designation, phone, 
              aadhaar_masked as "aadhaarMasked", kyc_status as "kycStatus", 
              state, district, created_at as "createdAt"
       FROM users WHERE role = $1 ORDER BY created_at DESC`,
      [role]
    );
    return res.rows;
  },

  async getAllUsersSafe() {
    const res = await postgres.query(
      `SELECT id, email, name, role, department_id as "departmentId", 
              department_code as "departmentCode", designation, phone, 
              aadhaar_masked as "aadhaarMasked", kyc_status as "kycStatus", 
              state, district, created_at as "createdAt"
       FROM users ORDER BY created_at DESC`
    );
    return res.rows;
  },

  async createUser({ email, password, name, phone, state, district }) {
    const existing = await this.findUserByEmail(email);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const { hash, salt } = hashPassword(password);
    const id = `USR-CIT-${Date.now()}`;
    const maskedAadhaar = 'XXXX-XXXX-' + Math.floor(1000 + Math.random() * 9000);

    const res = await postgres.query(
      `INSERT INTO users (id, email, password_hash, salt, name, role, phone, aadhaar_masked, state, district)
       VALUES ($1, $2, $3, $4, $5, 'CITIZEN', $6, $7, $8, $9)
       RETURNING id, email, password_hash as "passwordHash", salt, name, role, phone, 
                 aadhaar_masked as "aadhaarMasked", kyc_status as "kycStatus", state, district, created_at as "createdAt"`,
      [id, email.toLowerCase().trim(), hash, salt, name, phone || '', maskedAadhaar, state || 'General', district || 'General']
    );
    return res.rows[0];
  },

  // ---------------------------------------------------------------------------
  // 2. Sessions Store
  // ---------------------------------------------------------------------------
  async createSession(user) {
    const token = `sih_sess_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await postgres.query(
      `INSERT INTO sessions (token, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [token, user.id, expiresAt]
    );

    return { token, userId: user.id, role: user.role, expiresAt: expiresAt.toISOString() };
  },

  async getSession(token) {
    if (!token) return null;
    const res = await postgres.query(
      `SELECT token, user_id as "userId", expires_at as "expiresAt", created_at as "createdAt"
       FROM sessions 
       WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP LIMIT 1`,
      [token]
    );
    return res.rows[0] || null;
  },

  async deleteSession(token) {
    if (!token) return false;
    const res = await postgres.query(
      `DELETE FROM sessions WHERE token = $1`,
      [token]
    );
    return res.rowCount > 0;
  },

  // ---------------------------------------------------------------------------
  // 3. Departments & Services
  // ---------------------------------------------------------------------------
  async getAllDepartments() {
    const res = await postgres.query(
      `SELECT id, code, name, ministry, active_officers_count as "activeOfficersCount"
       FROM departments ORDER BY name ASC`
    );
    return res.rows;
  },

  async getAllServices() {
    const res = await postgres.query(
      `SELECT id, code, title, department, department_id as "departmentId", 
              department_code as "departmentCode", adapter_code as "adapterCode", 
              category, description, who_can_apply as "whoCanApply", eligibility, 
              required_documents as "requiredDocuments", turnaround_time as "turnaroundTime", 
              application_method as "applicationMethod", service_status as "serviceStatus", 
              application_availability as "applicationAvailability", official_url as "officialUrl", 
              fee, integration_mode as "integrationMode", keywords, workflow_stages as "workflowStages"
       FROM services ORDER BY id ASC`
    );
    return res.rows;
  },

  async getServiceById(id) {
    const res = await postgres.query(
      `SELECT id, code, title, department, department_id as "departmentId", 
              department_code as "departmentCode", adapter_code as "adapterCode", 
              category, description, who_can_apply as "whoCanApply", eligibility, 
              required_documents as "requiredDocuments", turnaround_time as "turnaroundTime", 
              application_method as "applicationMethod", service_status as "serviceStatus", 
              application_availability as "applicationAvailability", official_url as "officialUrl", 
              fee, integration_mode as "integrationMode", keywords, workflow_stages as "workflowStages"
       FROM services WHERE id = $1 OR code = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  },

  // ---------------------------------------------------------------------------
  // 4. Scoped Applications & Officer Workspace
  // ---------------------------------------------------------------------------
  async getDepartmentalApplications(departmentCode) {
    const res = await postgres.query(
      `SELECT id, applicant_id as "applicantId", applicant_name as "applicantName", 
              service_id as "serviceId", service_name as "serviceName", 
              department_id as "departmentId", department_code as "departmentCode", 
              status, current_stage as "currentStage", amount, form_data as "formData", 
              documents, timeline, officer_notes as "officerNotes", remarks, 
              submitted_date as "submittedDate", created_at as "createdAt", updated_at as "updatedAt"
       FROM applications 
       WHERE department_code = $1 
       ORDER BY created_at DESC`,
      [departmentCode]
    );
    return res.rows;
  },

  async getCitizenApplications(applicantId) {
    const res = await postgres.query(
      `SELECT id, applicant_id as "applicantId", applicant_name as "applicantName", 
              service_id as "serviceId", service_name as "serviceName", 
              department_id as "departmentId", department_code as "departmentCode", 
              status, current_stage as "currentStage", amount, form_data as "formData", 
              documents, timeline, officer_notes as "officerNotes", remarks, 
              submitted_date as "submittedDate", created_at as "createdAt", updated_at as "updatedAt"
       FROM applications 
       WHERE applicant_id = $1 
       ORDER BY created_at DESC`,
      [applicantId]
    );
    return res.rows;
  },

  async getApplicationById(id) {
    const res = await postgres.query(
      `SELECT id, applicant_id as "applicantId", applicant_name as "applicantName", 
              service_id as "serviceId", service_name as "serviceName", 
              department_id as "departmentId", department_code as "departmentCode", 
              status, current_stage as "currentStage", amount, form_data as "formData", 
              documents, timeline, officer_notes as "officerNotes", remarks, 
              submitted_date as "submittedDate", created_at as "createdAt", updated_at as "updatedAt"
       FROM applications 
       WHERE id = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async createApplication({ applicantId, applicantName, serviceId, formData = {}, documents = [], status = 'SUBMITTED' }) {
    const service = await this.getServiceById(serviceId);
    const deptCode = service ? service.departmentCode : 'GENERAL';
    const deptId = service ? service.departmentId : 'DEP-GEN';
    const serviceTitle = service ? service.title : 'Government Citizen Service';

    const appId = `APP-2026-${deptCode.slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = new Date().toISOString().split('T')[0];

    const initialTimeline = [
      {
        stage: 'Application Submission',
        status: 'COMPLETED',
        timestamp: new Date().toISOString(),
        actor: applicantName,
        remarks: 'Application successfully received by Unified Citizen Gateway.'
      }
    ];

    const res = await postgres.query(
      `INSERT INTO applications (id, applicant_id, applicant_name, service_id, service_name, 
                                 department_id, department_code, status, current_stage, 
                                 form_data, documents, timeline, submitted_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, applicant_id as "applicantId", applicant_name as "applicantName", 
                 service_id as "serviceId", service_name as "serviceName", 
                 department_id as "departmentId", department_code as "departmentCode", 
                 status, current_stage as "currentStage", form_data as "formData", 
                 documents, timeline, submitted_date as "submittedDate", created_at as "createdAt"`,
      [
        appId, applicantId, applicantName, serviceId, serviceTitle,
        deptId, deptCode, status, 'Awaiting Department Scrutiny',
        JSON.stringify(formData), JSON.stringify(documents), JSON.stringify(initialTimeline), today
      ]
    );
    return res.rows[0];
  },

  async updateApplication(id, applicantId, updates = {}) {
    const current = await this.getApplicationById(id);
    if (!current) return null;

    // Optional ownership verification
    if (applicantId && current.applicantId !== applicantId) {
      throw new Error('Forbidden: You do not have permission to modify this application');
    }

    const updatedFormData = updates.formData ? JSON.stringify({ ...current.formData, ...updates.formData }) : JSON.stringify(current.formData);
    const updatedDocs = updates.documents ? JSON.stringify(updates.documents) : JSON.stringify(current.documents);
    const updatedStatus = updates.status || current.status;
    const updatedStage = updates.currentStage || current.currentStage;
    const updatedRemarks = updates.remarks || current.remarks;
    const updatedTimeline = updates.timeline ? JSON.stringify(updates.timeline) : JSON.stringify(current.timeline);
    const updatedNotes = updates.officerNotes ? JSON.stringify(updates.officerNotes) : JSON.stringify(current.officerNotes);

    const res = await postgres.query(
      `UPDATE applications 
       SET form_data = $1, documents = $2, status = $3, current_stage = $4, 
           remarks = $5, timeline = $6, officer_notes = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING id, applicant_id as "applicantId", applicant_name as "applicantName", 
                 service_id as "serviceId", service_name as "serviceName", 
                 department_id as "departmentId", department_code as "departmentCode", 
                 status, current_stage as "currentStage", form_data as "formData", 
                 documents, timeline, officer_notes as "officerNotes", remarks, updated_at as "updatedAt"`,
      [updatedFormData, updatedDocs, updatedStatus, updatedStage, updatedRemarks, updatedTimeline, updatedNotes, id]
    );
    return res.rows[0];
  },

  // ---------------------------------------------------------------------------
  // 5. Digital Document Vault
  // ---------------------------------------------------------------------------
  async getVaultDocuments(citizenId, filters = {}) {
    let query = `SELECT id, citizen_id as "citizenId", document_type as "documentType", 
                        document_name as "documentName", file_name as "fileName", 
                        file_type as "fileType", file_size as "fileSize", 
                        storage_reference as "storageReference", document_status as "documentStatus", 
                        metadata, applications, version, expiry_date as "expiryDate", 
                        uploaded_at as "uploadedAt", updated_at as "updatedAt"
                 FROM vault_documents WHERE citizen_id = $1`;
    const params = [citizenId];

    if (filters.documentType && filters.documentType !== 'ALL') {
      params.push(filters.documentType);
      query += ` AND document_type = $${params.length}`;
    }

    if (filters.status && filters.status !== 'ALL') {
      params.push(filters.status);
      query += ` AND document_status = $${params.length}`;
    }

    query += ` ORDER BY uploaded_at DESC`;

    const res = await postgres.query(query, params);
    return res.rows;
  },

  async getVaultDocumentById(id) {
    const res = await postgres.query(
      `SELECT id, citizen_id as "citizenId", document_type as "documentType", 
              document_name as "documentName", file_name as "fileName", 
              file_type as "fileType", file_size as "fileSize", 
              storage_reference as "storageReference", document_status as "documentStatus", 
              file_content_base64 as "fileContentBase64", metadata, applications, 
              version, expiry_date as "expiryDate", uploaded_at as "uploadedAt", updated_at as "updatedAt"
       FROM vault_documents WHERE id = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async createVaultDocument(docData) {
    const id = docData.id || `DOC-2026-${Date.now()}`;
    const res = await postgres.query(
      `INSERT INTO vault_documents (id, citizen_id, document_type, document_name, file_name, 
                                   file_type, file_size, storage_reference, document_status, 
                                   file_content_base64, metadata, applications, version, expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, citizen_id as "citizenId", document_type as "documentType", 
                 document_name as "documentName", file_name as "fileName", 
                 file_type as "fileType", file_size as "fileSize", 
                 storage_reference as "storageReference", document_status as "documentStatus", 
                 metadata, applications, version, uploaded_at as "uploadedAt"`,
      [
        id, docData.citizenId, docData.documentType, docData.documentName, docData.fileName,
        docData.fileType, docData.fileSize, docData.storageReference, docData.documentStatus || 'PENDING',
        docData.fileContentBase64 || null, JSON.stringify(docData.metadata || {}),
        JSON.stringify(docData.applications || []), docData.version || 1, docData.expiryDate || null
      ]
    );
    return res.rows[0];
  },

  async deleteVaultDocument(id) {
    const res = await postgres.query(
      `DELETE FROM vault_documents WHERE id = $1`,
      [id]
    );
    return res.rowCount > 0;
  },

  async recordVaultAudit(entry) {
    const id = `VAUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await postgres.query(
      `INSERT INTO vault_audit_logs (id, document_id, actor_id, actor_role, action, timestamp, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id, entry.documentId, entry.actorId, entry.actorRole, entry.action,
        entry.timestamp || new Date(), JSON.stringify(entry.details || {})
      ]
    );
    return { id, ...entry };
  },

  // ---------------------------------------------------------------------------
  // 6. Notifications
  // ---------------------------------------------------------------------------
  async getNotifications(recipientUserId, filters = {}) {
    let query = `SELECT id, recipient_id as "recipientId", type, title, message, 
                        channel, is_read as "isRead", metadata, created_at as "createdAt"
                 FROM notifications WHERE recipient_id = $1`;
    const params = [recipientUserId];

    if (filters.unreadOnly === true || filters.unreadOnly === 'true') {
      query += ` AND is_read = false`;
    }

    query += ` ORDER BY created_at DESC`;
    const res = await postgres.query(query, params);
    return res.rows;
  },

  async getUnreadNotificationsCount(recipientUserId) {
    const res = await postgres.query(
      `SELECT COUNT(*)::int as count FROM notifications WHERE recipient_id = $1 AND is_read = false`,
      [recipientUserId]
    );
    return res.rows[0]?.count || 0;
  },

  async markNotificationAsRead(id, userId) {
    const res = await postgres.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND recipient_id = $2 RETURNING id`,
      [id, userId]
    );
    return res.rowCount > 0;
  },

  async markAllNotificationsAsRead(recipientUserId) {
    const res = await postgres.query(
      `UPDATE notifications SET is_read = true WHERE recipient_id = $1 AND is_read = false`,
      [recipientUserId]
    );
    return res.rowCount;
  },

  // ---------------------------------------------------------------------------
  // 7. Grievances & Citizen Feedback
  // ---------------------------------------------------------------------------
  async getGrievances(filters = {}) {
    let query = `SELECT id, citizen_id as "citizenId", citizen_name as "citizenName", 
                        department_id as "departmentId", department_code as "departmentCode", 
                        application_id as "applicationId", title, description, status, 
                        priority, officer_notes as "officerNotes", resolution_remarks as "resolutionRemarks", 
                        created_at as "createdAt", updated_at as "updatedAt"
                 FROM grievances WHERE 1=1`;
    const params = [];

    if (filters.citizenId) {
      params.push(filters.citizenId);
      query += ` AND citizen_id = $${params.length}`;
    }

    if (filters.departmentCode) {
      params.push(filters.departmentCode);
      query += ` AND department_code = $${params.length}`;
    }

    if (filters.status && filters.status !== 'ALL') {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;
    const res = await postgres.query(query, params);
    return res.rows;
  },

  async createGrievance(data) {
    const id = `GRV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const res = await postgres.query(
      `INSERT INTO grievances (id, citizen_id, citizen_name, department_id, department_code, 
                               application_id, title, description, status, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'SUBMITTED', $9)
       RETURNING id, citizen_id as "citizenId", citizen_name as "citizenName", 
                 department_code as "departmentCode", title, description, status, priority, created_at as "createdAt"`,
      [
        id, data.citizenId, data.citizenName, data.departmentId || null,
        data.departmentCode, data.applicationId || null, data.title, data.description,
        data.priority || 'MEDIUM'
      ]
    );
    return res.rows[0];
  },

  async getFeedback(filters = {}) {
    let query = `SELECT id, citizen_id as "citizenId", citizen_name as "citizenName", 
                        application_id as "applicationId", service_id as "serviceId", 
                        department_code as "departmentCode", rating, category, 
                        feedback_text as "feedbackText", sentiment, created_at as "createdAt"
                 FROM feedbacks WHERE 1=1`;
    const params = [];

    if (filters.departmentCode) {
      params.push(filters.departmentCode);
      query += ` AND department_code = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;
    const res = await postgres.query(query, params);
    return res.rows;
  },

  async createFeedback(data) {
    const id = `FB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const res = await postgres.query(
      `INSERT INTO feedbacks (id, citizen_id, citizen_name, application_id, service_id, 
                             department_code, rating, category, feedback_text, sentiment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, citizen_id as "citizenId", citizen_name as "citizenName", 
                 rating, feedback_text as "feedbackText", created_at as "createdAt"`,
      [
        id, data.citizenId, data.citizenName, data.applicationId || null,
        data.serviceId || null, data.departmentCode || null, data.rating,
        data.category || 'General Service', data.feedbackText, data.sentiment || 'NEUTRAL'
      ]
    );
    return res.rows[0];
  }
};
