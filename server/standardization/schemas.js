/**
 * SIH Government Service Integration Platform — Canonical Schemas & Data Models
 * Defines standard internal entity contracts and versioning across all government integrations.
 */

export const CANONICAL_VERSION = '1.0';

export const GENDER_ENUM = ['MALE', 'FEMALE', 'TRANSGENDER', 'OTHER'];

export const APPLICATION_STATUS_ENUM = [
  'DRAFT',
  'SUBMITTED',
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'REJECTED'
];

export const DOCUMENT_STATUS_ENUM = [
  'PENDING',
  'UPLOADED',
  'VERIFIED',
  'REJECTED'
];

export const CATEGORY_ENUM = [
  'EDUCATION',
  'REVENUE',
  'HEALTH',
  'WELFARE',
  'TRANSPORT',
  'IDENTITY',
  'AGRICULTURE',
  'EMPLOYMENT'
];

/**
 * Canonical Schema Definitions
 */
export const SCHEMAS = {
  version: CANONICAL_VERSION,

  Address: {
    type: 'object',
    required: ['addressLine', 'district', 'state', 'pincode'],
    properties: {
      addressLine: { type: 'string', minLength: 3, maxLength: 200 },
      city: { type: 'string', maxLength: 100 },
      district: { type: 'string', minLength: 2, maxLength: 100 },
      state: { type: 'string', minLength: 2, maxLength: 100 },
      pincode: { type: 'string', pattern: '^[1-9][0-9]{5}$' }
    }
  },

  Citizen: {
    type: 'object',
    required: ['citizenId', 'name', 'mobile', 'address'],
    properties: {
      citizenId: { type: 'string', minLength: 3 },
      name: { type: 'string', minLength: 2, maxLength: 120 },
      dateOfBirth: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      gender: { type: 'string', enum: GENDER_ENUM },
      mobile: { type: 'string', pattern: '^\\+91 \\d{5} \\d{5}$' },
      email: { type: 'string', pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' },
      address: { $ref: '#/schemas/Address' }
    }
  },

  DocumentReference: {
    type: 'object',
    required: ['documentId', 'documentType', 'verificationStatus'],
    properties: {
      documentId: { type: 'string' },
      documentType: { type: 'string' },
      documentNumber: { type: 'string' },
      issuedBy: { type: 'string' },
      issuedDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      verificationStatus: { type: 'string', enum: DOCUMENT_STATUS_ENUM },
      fileUrl: { type: 'string' }
    }
  },

  Application: {
    type: 'object',
    required: ['applicationId', 'citizenId', 'serviceId', 'departmentCode', 'status', 'submittedAt'],
    properties: {
      applicationId: { type: 'string', pattern: '^APP-\\d{4}-[A-Z0-9]+$' },
      citizenId: { type: 'string' },
      serviceId: { type: 'string' },
      departmentCode: { type: 'string' },
      status: { type: 'string', enum: APPLICATION_STATUS_ENUM },
      submittedAt: { type: 'string' },
      formData: { type: 'object' },
      documents: { type: 'array', items: { $ref: '#/schemas/DocumentReference' } },
      canonicalVersion: { type: 'string', default: CANONICAL_VERSION }
    }
  },

  Service: {
    type: 'object',
    required: ['serviceId', 'serviceName', 'departmentCode', 'category'],
    properties: {
      serviceId: { type: 'string' },
      serviceName: { type: 'string', minLength: 3 },
      departmentCode: { type: 'string' },
      category: { type: 'string', enum: CATEGORY_ENUM },
      description: { type: 'string' }
    }
  }
};
