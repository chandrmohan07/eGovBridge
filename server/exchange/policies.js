/**
 * SIH Government Service Integration Platform — Inter-Department Exchange Security Policies
 * Defines explicit allowed department pairs, authorized purposes, and strict field-level access control.
 */

export const EXCHANGE_STATUS = {
  PENDING: 'PENDING',
  AUTHORIZED: 'AUTHORIZED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED'
};

/**
 * Department Exchange Security Policy Matrix
 * Format: Map key: `${SOURCE_DEPT}->${TARGET_DEPT}`
 */
export const EXCHANGE_POLICIES = {
  // 1. DigiLocker (Identity) -> Education Board
  'DIGILOCKER->EDUCATION': {
    allowedPurposes: ['ACADEMIC_ENROLLMENT_VERIFICATION', 'STUDENT_IDENTITY_CHECK'],
    allowedFields: ['citizenId', 'name', 'dateOfBirth', 'gender', 'mobile', 'address'],
    requiresConsent: true,
    description: 'Verify candidate identity and age eligibility for higher education admission.'
  },

  // 2. Revenue Department -> Education Department
  'REVENUE->EDUCATION': {
    allowedPurposes: ['INCOME_SCHOLARSHIP_VERIFICATION', 'EWS_QUOTA_VALIDATION'],
    allowedFields: ['citizenId', 'name', 'revenueDetails', 'address'],
    requiresConsent: true,
    description: 'Verify annual family income and landholding for fee waiver or scholarship.'
  },

  // 3. Education Department -> Finance / PFMS
  'EDUCATION->FINANCE': {
    allowedPurposes: ['SCHOLARSHIP_DISBURSEMENT_VALIDATION', 'MERIT_LIST_AUDIT'],
    allowedFields: ['citizenId', 'name', 'academicDetails', 'mobile'],
    requiresConsent: true,
    description: 'Validate academic merit score prior to releasing Direct Benefit Transfer grants.'
  },

  // 4. DigiLocker (Identity) -> Health Authority (PM-JAY)
  'DIGILOCKER->HEALTH': {
    allowedPurposes: ['AYUSHMAN_BENEFICIARY_VERIFICATION', 'IDENTITY_LINKAGE'],
    allowedFields: ['citizenId', 'name', 'dateOfBirth', 'gender', 'mobile', 'address'],
    requiresConsent: true,
    description: 'e-KYC verification for issuing PM-JAY Golden Card.'
  },

  // 5. Revenue Department -> Health Authority
  'REVENUE->HEALTH': {
    allowedPurposes: ['SECC_POVERTY_LINE_VERIFICATION'],
    allowedFields: ['citizenId', 'name', 'revenueDetails'],
    requiresConsent: true,
    description: 'Verify socioeconomic category for cashless hospitalization coverage.'
  },

  // 6. DigiLocker (Identity) -> Transport Department
  'DIGILOCKER->TRANSPORT': {
    allowedPurposes: ['DRIVING_LICENSE_VERIFICATION', 'ADDRESS_PROOF_CHECK'],
    allowedFields: ['citizenId', 'name', 'dateOfBirth', 'address', 'mobile'],
    requiresConsent: true,
    description: 'Verify residential address and age for driving license renewal.'
  },

  // 7. Finance / PFMS -> Education Department
  'FINANCE->EDUCATION': {
    allowedPurposes: ['DBT_DISBURSEMENT_AUDIT'],
    allowedFields: ['citizenId', 'financialDetails'],
    requiresConsent: true,
    description: 'Audit disbursement confirmations and bank transaction references.'
  }
};

/**
 * Evaluates whether an inter-department exchange request complies with security policies
 */
export function evaluateExchangePolicy({ sourceDepartment, targetDepartment, purpose, requestedFields = [] }) {
  if (!sourceDepartment || !targetDepartment) {
    return {
      allowed: false,
      code: 'MISSING_DEPARTMENT',
      reason: 'Both sourceDepartment and targetDepartment are required.'
    };
  }

  const src = String(sourceDepartment).trim().toUpperCase();
  const tgt = String(targetDepartment).trim().toUpperCase();
  const pairKey = `${src}->${tgt}`;

  const policy = EXCHANGE_POLICIES[pairKey];
  if (!policy) {
    return {
      allowed: false,
      code: 'UNAUTHORIZED_DEPARTMENT_PAIR',
      reason: `Data exchange between ${src} and ${tgt} is not permitted by government policy.`
    };
  }

  const p = String(purpose || '').trim().toUpperCase();
  if (!policy.allowedPurposes.includes(p)) {
    return {
      allowed: false,
      code: 'INVALID_PURPOSE',
      reason: `Purpose "${p}" is not authorized for data exchange between ${src} and ${tgt}. Allowed: ${policy.allowedPurposes.join(', ')}`
    };
  }

  if (!Array.isArray(requestedFields) || requestedFields.length === 0) {
    return {
      allowed: false,
      code: 'EMPTY_FIELD_REQUEST',
      reason: 'At least one requested field must be specified for data exchange.'
    };
  }

  const unauthorizedFields = requestedFields.filter(f => !policy.allowedFields.includes(f));
  if (unauthorizedFields.length > 0) {
    return {
      allowed: false,
      code: 'UNAUTHORIZED_FIELD_REQUEST',
      unauthorizedFields,
      reason: `The following requested fields are not permitted under this policy: ${unauthorizedFields.join(', ')}. Permitted: ${policy.allowedFields.join(', ')}`
    };
  }

  return {
    allowed: true,
    policy,
    permittedFields: requestedFields
  };
}
