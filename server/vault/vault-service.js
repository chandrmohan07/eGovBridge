/**
 * SIH Government Service Integration Platform — Digital Document Vault Service
 * Secure citizen document storage, metadata management, application reuse,
 * role-based departmental disclosure, and immutable audit logging.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db } from '../db.js';
import { vaultStorage, sanitizeFileName } from './storage.js';
import { ALLOWED_DOC_EXTENSIONS, FORBIDDEN_EXTENSIONS, MAX_DOC_SIZE_BYTES } from '../validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configured document types
let documentTypesConfig = [];
try {
  const configPath = path.resolve(__dirname, '../../config/document-types.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  documentTypesConfig = JSON.parse(raw).documentTypes;
} catch (e) {
  // Fallback defaults
  documentTypesConfig = [
    { code: 'IDENTITY_PROOF', name: 'Identity Proof', acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] },
    { code: 'ADDRESS_PROOF', name: 'Address Proof', acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] },
    { code: 'INCOME_CERTIFICATE', name: 'Income Certificate', acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] },
    { code: 'CASTE_CERTIFICATE', name: 'Caste Certificate', acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] },
    { code: 'EDUCATION_CERTIFICATE', name: 'Education Certificate', acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] },
    { code: 'LAND_RECORD', name: 'Land Record', acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] },
    { code: 'EMPLOYMENT_DOCUMENT', name: 'Employment Document', acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] },
    { code: 'SCHOLARSHIP_DOCUMENT', name: 'Scholarship Document', acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] },
    { code: 'OTHER', name: 'Other Document', acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] }
  ];
}

// Seed mock storage buffers for pre-seeded documents
(async () => {
  const seedAadhaar = Buffer.from('%PDF-1.4 Mock Government Aadhaar Card Buffer - Rahul Verma', 'utf8');
  const seedIncome = Buffer.from('%PDF-1.4 Mock Revenue Department Income Certificate - FY25-26', 'utf8');
  const seedMarksheet = Buffer.from('%PDF-1.4 Mock Maharashtra State Board Class 12 Marksheet', 'utf8');

  await vaultStorage.save('vault/USR-CIT-001/doc_seed_aadhaar.pdf', seedAadhaar, {
    mimeType: 'application/pdf',
    fileName: 'aadhaar_rahul_verma.pdf'
  }).catch(() => {});

  await vaultStorage.save('vault/USR-CIT-001/doc_seed_income.pdf', seedIncome, {
    mimeType: 'application/pdf',
    fileName: 'income_cert_fy26.pdf'
  }).catch(() => {});

  await vaultStorage.save('vault/USR-CIT-001/doc_seed_marksheet.pdf', seedMarksheet, {
    mimeType: 'application/pdf',
    fileName: 'hsc_marksheet_class12.pdf'
  }).catch(() => {});
})();

export class VaultError extends Error {
  constructor(message, statusCode = 400, code = 'VAULT_ERROR') {
    super(message);
    this.name = 'VaultError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Strips confidential storage references and internal keys from citizen/officer views
 */
export function sanitizeDocumentOutput(doc) {
  if (!doc) return null;
  const { storageReference, ...safeDoc } = doc;
  return safeDoc;
}

/**
 * Returns available document categories / types
 */
export function getDocumentTypes() {
  return documentTypesConfig;
}

/**
 * Validates document type against configured document types
 */
export function isValidDocumentType(typeCode) {
  if (!typeCode || typeof typeCode !== 'string') return false;
  return documentTypesConfig.some(dt => dt.code === typeCode.toUpperCase().trim());
}

/**
 * Securely uploads and registers a citizen document into the Digital Document Vault
 */
export async function uploadDocument(user, {
  documentType,
  documentName,
  fileName,
  fileData, // Base64 string or Buffer
  mimeType,
  expiryDate = null,
  metadata = {}
}) {
  if (!user || user.role !== 'CITIZEN') {
    throw new VaultError('Only registered citizens can upload documents to the Digital Vault', 403, 'UNAUTHORIZED_ROLE');
  }

  // 1. Validate Document Type
  const cleanType = (documentType || '').toUpperCase().trim();
  if (!isValidDocumentType(cleanType)) {
    throw new VaultError(`Invalid or unsupported document type: ${documentType}`, 400, 'INVALID_DOCUMENT_TYPE');
  }

  // 2. Validate Document Name
  if (!documentName || typeof documentName !== 'string' || documentName.trim().length < 3) {
    throw new VaultError('Document title/name is required (minimum 3 characters)', 400, 'INVALID_DOCUMENT_NAME');
  }

  // 3. Validate Filename & Extension
  const rawFileName = (fileName || '').toLowerCase().trim();
  if (!rawFileName) {
    throw new VaultError('Document file name is required', 400, 'MISSING_FILE_NAME');
  }

  // Insecure file extensions check
  for (const ext of FORBIDDEN_EXTENSIONS) {
    if (rawFileName.endsWith(ext)) {
      throw new VaultError(`Insecure file extension (${ext}) is forbidden. Only PDF, JPG, and PNG documents are accepted.`, 400, 'INSECURE_EXTENSION');
    }
  }

  // Allowed extensions check
  const hasAllowedExt = ALLOWED_DOC_EXTENSIONS.some(ext => rawFileName.endsWith(ext));
  if (!hasAllowedExt) {
    throw new VaultError(`Unsupported file extension. Allowed extensions are: ${ALLOWED_DOC_EXTENSIONS.join(', ')}`, 400, 'UNSUPPORTED_EXTENSION');
  }

  // 4. Validate MIME Type
  const cleanMime = (mimeType || '').toLowerCase().trim();
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (cleanMime && !allowedMimes.includes(cleanMime)) {
    throw new VaultError(`Unsupported MIME type: ${cleanMime}. Expected PDF or JPEG/PNG image.`, 400, 'UNSUPPORTED_MIME_TYPE');
  }

  // 5. Decode and Validate File Buffer
  let fileBuffer;
  if (Buffer.isBuffer(fileData)) {
    fileBuffer = fileData;
  } else if (typeof fileData === 'string') {
    // Check if Data URI
    let base64Content = fileData;
    if (fileData.startsWith('data:')) {
      const parts = fileData.split(',');
      base64Content = parts[1] || '';
    }
    fileBuffer = Buffer.from(base64Content, 'base64');
  } else {
    throw new VaultError('File content payload (Base64 or binary Buffer) is required', 400, 'MISSING_FILE_CONTENT');
  }

  if (fileBuffer.length === 0) {
    throw new VaultError('Uploaded document file is empty (0 bytes)', 400, 'EMPTY_FILE');
  }

  if (fileBuffer.length > MAX_DOC_SIZE_BYTES) {
    const sizeMb = (fileBuffer.length / (1024 * 1024)).toFixed(2);
    throw new VaultError(`Document file size (${sizeMb} MB) exceeds maximum permitted limit of 5 MB`, 400, 'FILE_TOO_LARGE');
  }

  // Determine final MIME type if omitted
  let finalMime = cleanMime;
  if (!finalMime) {
    if (rawFileName.endsWith('.pdf')) finalMime = 'application/pdf';
    else if (rawFileName.endsWith('.png')) finalMime = 'image/png';
    else finalMime = 'image/jpeg';
  }

  // 6. Persist file into Vault Storage
  const safeName = sanitizeFileName(rawFileName);
  const storageKey = vaultStorage.generateKey(user.id, safeName);
  await vaultStorage.save(storageKey, fileBuffer, {
    mimeType: finalMime,
    fileName: safeName
  });

  // 7. Create database record
  const documentId = `DOC-2026-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const now = new Date().toISOString();

  const docRecord = db.createVaultDocument({
    id: documentId,
    citizenId: user.id,
    documentType: cleanType,
    documentName: documentName.trim(),
    fileName: safeName,
    fileType: finalMime,
    fileSize: fileBuffer.length,
    storageReference: storageKey,
    documentStatus: 'ACTIVE',
    uploadedAt: now,
    updatedAt: now,
    expiryDate: expiryDate ? String(expiryDate).trim() : null,
    metadata: typeof metadata === 'object' && metadata !== null ? metadata : {},
    applications: [],
    version: 1
  });

  // 8. Record audit log
  db.recordVaultAudit({
    documentId,
    citizenId: user.id,
    actorId: user.id,
    actorRole: user.role,
    action: 'DOCUMENT_UPLOADED',
    details: `Uploaded ${cleanType} (${safeName}, ${fileBuffer.length} bytes)`
  });

  return sanitizeDocumentOutput(docRecord);
}

/**
 * Lists documents belonging to the authenticated citizen with search and filter controls
 */
export function listCitizenDocuments(user, filters = {}) {
  if (!user || user.role !== 'CITIZEN') {
    throw new VaultError('Access Denied: Citizen session required', 403, 'UNAUTHORIZED_ROLE');
  }

  const docs = db.getVaultDocuments(user.id, filters);

  db.recordVaultAudit({
    citizenId: user.id,
    actorId: user.id,
    actorRole: user.role,
    action: 'DOCUMENT_LISTED',
    details: `Listed vault documents (count: ${docs.length})`
  });

  return docs.map(sanitizeDocumentOutput);
}

/**
 * Retrieves document metadata with strict ownership or department application scope checks
 */
export function getDocumentMetadata(user, documentId) {
  if (!user || !user.id) {
    throw new VaultError('Authentication required to inspect document', 401, 'UNAUTHENTICATED');
  }

  const doc = db.getVaultDocumentById(documentId);
  if (!doc || doc.documentStatus === 'DELETED') {
    throw new VaultError(`Document not found with ID: ${documentId}`, 404, 'NOT_FOUND');
  }

  // Security Check:
  // 1. Citizen must own the document
  if (user.role === 'CITIZEN') {
    if (doc.citizenId !== user.id) {
      throw new VaultError('Access Denied: You do not have permission to view this document', 403, 'FORBIDDEN');
    }
  } else if (user.role === 'OFFICER') {
    // 2. Department Officer: Can only access document if it is linked to an application in their department
    const isAuthorized = (doc.applications || []).some(appId => {
      const app = db.getApplicationById(appId);
      return app && app.departmentCode === user.departmentCode;
    });

    if (!isAuthorized) {
      throw new VaultError(`Access Denied: Officer of ${user.departmentCode} is not authorized to access unassociated citizen document`, 403, 'FORBIDDEN');
    }
  }

  db.recordVaultAudit({
    documentId: doc.id,
    citizenId: doc.citizenId,
    actorId: user.id,
    actorRole: user.role,
    action: 'DOCUMENT_METADATA_ACCESSED',
    details: `Accessed metadata for ${doc.id}`
  });

  return sanitizeDocumentOutput(doc);
}

/**
 * Securely retrieves file binary stream / buffer for authorized download
 */
export async function downloadDocument(user, documentId) {
  if (!user || !user.id) {
    throw new VaultError('Authentication required to download document', 401, 'UNAUTHENTICATED');
  }

  const doc = db.getVaultDocumentById(documentId);
  if (!doc || doc.documentStatus === 'DELETED') {
    throw new VaultError(`Document not found with ID: ${documentId}`, 404, 'NOT_FOUND');
  }

  // Security Check: Citizen owner or authorized Department Officer
  if (user.role === 'CITIZEN') {
    if (doc.citizenId !== user.id) {
      throw new VaultError('Access Denied: You do not have permission to download this document', 403, 'FORBIDDEN');
    }
  } else if (user.role === 'OFFICER') {
    const isAuthorized = (doc.applications || []).some(appId => {
      const app = db.getApplicationById(appId);
      return app && app.departmentCode === user.departmentCode;
    });

    if (!isAuthorized) {
      throw new VaultError(`Access Denied: Officer of ${user.departmentCode} cannot download document not linked to departmental applications`, 403, 'FORBIDDEN');
    }
  }

  const file = await vaultStorage.get(doc.storageReference);

  db.recordVaultAudit({
    documentId: doc.id,
    citizenId: doc.citizenId,
    actorId: user.id,
    actorRole: user.role,
    action: 'DOCUMENT_DOWNLOADED',
    details: `Downloaded ${doc.fileName} (${file.size} bytes)`
  });

  return {
    buffer: file.buffer,
    mimeType: file.mimeType || doc.fileType,
    fileName: doc.fileName,
    size: file.size
  };
}

/**
 * Securely deletes a citizen document if not actively referenced in an in-progress application
 */
export async function deleteDocument(user, documentId) {
  if (!user || user.role !== 'CITIZEN') {
    throw new VaultError('Access Denied: Only citizen document owner can delete vault documents', 403, 'UNAUTHORIZED_ROLE');
  }

  const doc = db.getVaultDocumentById(documentId);
  if (!doc || doc.documentStatus === 'DELETED') {
    throw new VaultError(`Document not found with ID: ${documentId}`, 404, 'NOT_FOUND');
  }

  if (doc.citizenId !== user.id) {
    throw new VaultError('Access Denied: You cannot delete another citizen\'s document', 403, 'FORBIDDEN');
  }

  // Integrity Check: Prevent deletion if actively linked to an in-progress application
  if (Array.isArray(doc.applications) && doc.applications.length > 0) {
    for (const appId of doc.applications) {
      const app = db.getApplicationById(appId);
      if (app && ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUIRED'].includes(app.status)) {
        throw new VaultError(
          `Cannot delete document: It is actively linked to pending application ${app.id} (${app.serviceName}). Please wait for processing to conclude or submit a replacement.`,
          400,
          'DOCUMENT_IN_USE'
        );
      }
    }
  }

  // Remove from storage
  await vaultStorage.delete(doc.storageReference).catch(() => {});

  // Soft delete in database
  db.deleteVaultDocument(documentId);

  db.recordVaultAudit({
    documentId: doc.id,
    citizenId: user.id,
    actorId: user.id,
    actorRole: user.role,
    action: 'DOCUMENT_DELETED',
    details: `Deleted ${doc.id} (${doc.fileName})`
  });

  return {
    success: true,
    message: `Document ${documentId} deleted successfully`
  };
}

/**
 * Associates an existing vault document with a service application (Phase 5 reuse)
 */
export function associateDocumentWithApplication(user, documentId, applicationId) {
  if (!user || user.role !== 'CITIZEN') {
    throw new VaultError('Only citizens can associate vault documents with applications', 403, 'UNAUTHORIZED_ROLE');
  }

  const doc = db.getVaultDocumentById(documentId);
  if (!doc || doc.documentStatus === 'DELETED') {
    throw new VaultError(`Vault document not found: ${documentId}`, 404, 'DOCUMENT_NOT_FOUND');
  }

  if (doc.citizenId !== user.id) {
    throw new VaultError('Access Denied: You do not own this document', 403, 'FORBIDDEN');
  }

  const app = db.getApplicationById(applicationId);
  if (!app) {
    throw new VaultError(`Application not found: ${applicationId}`, 404, 'APPLICATION_NOT_FOUND');
  }

  if (app.applicantId !== user.id) {
    throw new VaultError('Access Denied: You do not own this application', 403, 'FORBIDDEN');
  }

  // Prevent duplicate association
  if (!doc.applications.includes(applicationId)) {
    doc.applications.push(applicationId);
    doc.updatedAt = new Date().toISOString();
  }

  // Attach document reference to application if not already present
  if (!Array.isArray(app.documents)) {
    app.documents = [];
  }

  const alreadyInApp = app.documents.some(d => d.vaultDocumentId === documentId || d.fileName === doc.fileName);
  if (!alreadyInApp) {
    app.documents.push({
      name: doc.documentName,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      status: 'Verified (From Vault)',
      vaultDocumentId: doc.id,
      documentType: doc.documentType
    });
    app.updatedAt = new Date().toISOString();
  }

  db.recordVaultAudit({
    documentId: doc.id,
    citizenId: user.id,
    actorId: user.id,
    actorRole: user.role,
    action: 'DOCUMENT_ASSOCIATED_WITH_APPLICATION',
    details: `Associated document ${doc.id} with application ${applicationId}`
  });

  return {
    success: true,
    message: `Document ${documentId} associated with application ${applicationId}`,
    document: sanitizeDocumentOutput(doc),
    applicationId
  };
}

/**
 * Retrieves immutable vault audit logs
 */
export function getVaultAuditLogs(user, filter = {}) {
  if (!user || !user.id) {
    throw new VaultError('Authentication required to view audit trail', 401, 'UNAUTHENTICATED');
  }

  const queryFilter = { ...filter };
  if (user.role === 'CITIZEN') {
    queryFilter.citizenId = user.id;
  }

  return db.getVaultAuditLogs(queryFilter);
}
