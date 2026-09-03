/**
 * SIH Government Service Integration Platform — Canonical Data Validator
 * Validates canonical payloads against schema contracts, types, patterns, and versions.
 */

import { CANONICAL_VERSION, GENDER_ENUM, APPLICATION_STATUS_ENUM, DOCUMENT_STATUS_ENUM, CATEGORY_ENUM } from './schemas.js';

export class CanonicalValidationError extends Error {
  constructor(message, errors = [], statusCode = 400) {
    super(message);
    this.name = 'CanonicalValidationError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

/**
 * Validates an Address canonical object
 */
export function validateAddress(address) {
  const errors = [];
  if (!address || typeof address !== 'object') {
    return { valid: false, errors: [{ field: 'address', message: 'Address must be a non-null object', code: 'REQUIRED' }] };
  }

  if (!address.addressLine || typeof address.addressLine !== 'string' || address.addressLine.trim().length < 3) {
    errors.push({ field: 'address.addressLine', message: 'Address line must be at least 3 characters', code: 'INVALID_STRING' });
  }

  if (!address.district || typeof address.district !== 'string') {
    errors.push({ field: 'address.district', message: 'District is required', code: 'REQUIRED' });
  }

  if (!address.state || typeof address.state !== 'string') {
    errors.push({ field: 'address.state', message: 'State is required', code: 'REQUIRED' });
  }

  if (!address.pincode || !/^[1-9][0-9]{5}$/.test(String(address.pincode).trim())) {
    errors.push({ field: 'address.pincode', message: 'Pincode must be a valid 6-digit Indian PIN code', code: 'INVALID_PINCODE' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a Citizen canonical object
 */
export function validateCitizen(citizen) {
  const errors = [];
  if (!citizen || typeof citizen !== 'object') {
    return { valid: false, errors: [{ field: 'citizen', message: 'Citizen data must be a non-null object', code: 'REQUIRED' }] };
  }

  if (!citizen.citizenId || typeof citizen.citizenId !== 'string') {
    errors.push({ field: 'citizenId', message: 'Citizen ID is required', code: 'REQUIRED' });
  }

  if (!citizen.name || typeof citizen.name !== 'string' || citizen.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Citizen name must be at least 2 characters', code: 'INVALID_NAME' });
  }

  if (citizen.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(citizen.dateOfBirth)) {
    errors.push({ field: 'dateOfBirth', message: 'Date of birth must follow YYYY-MM-DD format', code: 'INVALID_DATE' });
  }

  if (citizen.gender && !GENDER_ENUM.includes(citizen.gender)) {
    errors.push({ field: 'gender', message: `Gender must be one of: ${GENDER_ENUM.join(', ')}`, code: 'INVALID_ENUM' });
  }

  if (!citizen.mobile || !/^\+91 \d{5} \d{5}$/.test(citizen.mobile)) {
    errors.push({ field: 'mobile', message: 'Mobile must follow canonical format: +91 XXXXX XXXXX', code: 'INVALID_PHONE' });
  }

  if (citizen.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(citizen.email)) {
    errors.push({ field: 'email', message: 'Invalid email address', code: 'INVALID_EMAIL' });
  }

  const addrResult = validateAddress(citizen.address);
  if (!addrResult.valid) {
    errors.push(...addrResult.errors);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a DocumentReference canonical object
 */
export function validateDocumentReference(doc) {
  const errors = [];
  if (!doc || typeof doc !== 'object') {
    return { valid: false, errors: [{ field: 'document', message: 'Document must be an object', code: 'REQUIRED' }] };
  }

  if (!doc.documentId) {
    errors.push({ field: 'documentId', message: 'Document ID is required', code: 'REQUIRED' });
  }

  if (!doc.documentType) {
    errors.push({ field: 'documentType', message: 'Document type is required', code: 'REQUIRED' });
  }

  if (doc.verificationStatus && !DOCUMENT_STATUS_ENUM.includes(doc.verificationStatus)) {
    errors.push({ field: 'verificationStatus', message: `Status must be one of: ${DOCUMENT_STATUS_ENUM.join(', ')}`, code: 'INVALID_ENUM' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates an Application canonical object
 */
export function validateApplication(app) {
  const errors = [];
  if (!app || typeof app !== 'object') {
    return { valid: false, errors: [{ field: 'application', message: 'Application must be a non-null object', code: 'REQUIRED' }] };
  }

  // Schema version check
  if (app.canonicalVersion && app.canonicalVersion !== CANONICAL_VERSION) {
    errors.push({
      field: 'canonicalVersion',
      message: `Unsupported canonical schema version: ${app.canonicalVersion}. Expected: ${CANONICAL_VERSION}`,
      code: 'UNSUPPORTED_VERSION'
    });
  }

  if (!app.applicationId || typeof app.applicationId !== 'string') {
    errors.push({ field: 'applicationId', message: 'Application ID is required', code: 'REQUIRED' });
  }

  if (!app.citizenId || typeof app.citizenId !== 'string') {
    errors.push({ field: 'citizenId', message: 'Citizen ID is required', code: 'REQUIRED' });
  }

  if (!app.serviceId || typeof app.serviceId !== 'string') {
    errors.push({ field: 'serviceId', message: 'Service ID is required', code: 'REQUIRED' });
  }

  if (!app.departmentCode || typeof app.departmentCode !== 'string') {
    errors.push({ field: 'departmentCode', message: 'Department code is required', code: 'REQUIRED' });
  }

  if (!app.status || !APPLICATION_STATUS_ENUM.includes(app.status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${APPLICATION_STATUS_ENUM.join(', ')}`, code: 'INVALID_ENUM' });
  }

  if (!app.submittedAt) {
    errors.push({ field: 'submittedAt', message: 'Submission timestamp is required', code: 'REQUIRED' });
  }

  if (app.documents && Array.isArray(app.documents)) {
    app.documents.forEach((doc, idx) => {
      const docRes = validateDocumentReference(doc);
      if (!docRes.valid) {
        errors.push(...docRes.errors.map(e => ({ ...e, field: `documents[${idx}].${e.field}` })));
      }
    });
  }

  return { valid: errors.length === 0, errors };
}
