/**
 * SIH Government Service Integration Platform — Validation Utility
 * Reusable validation logic for citizen information, service-specific fields, and documents.
 */

// Allowed document extensions and MIME types
export const ALLOWED_DOC_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
export const MAX_DOC_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const FORBIDDEN_EXTENSIONS = ['.exe', '.bat', '.sh', '.cmd', '.msi', '.js', '.vbs', '.py', '.php'];

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  // Clean spaces, hyphens
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Matches +91XXXXXXXXXX or standard 10 digits
  const re = /^(\+?\d{1,3})?\d{10}$/;
  return re.test(cleaned);
}

export function validateDocument(doc) {
  if (!doc) return { valid: false, error: 'Document metadata is required' };
  
  const fileName = (doc.fileName || '').toLowerCase().trim();
  if (!fileName) {
    return { valid: false, error: 'Document file name is missing' };
  }

  // Check forbidden executable files
  for (const ext of FORBIDDEN_EXTENSIONS) {
    if (fileName.endsWith(ext)) {
      return { valid: false, error: `Insecure file type (${ext}) is not permitted. Only PDF and image files are accepted.` };
    }
  }

  // Check allowed extensions
  const hasAllowedExt = ALLOWED_DOC_EXTENSIONS.some(ext => fileName.endsWith(ext));
  if (!hasAllowedExt) {
    return { valid: false, error: `File type is not supported. Please upload one of: ${ALLOWED_DOC_EXTENSIONS.join(', ')}` };
  }

  // Check file size (max 5 MB)
  const fileSize = Number(doc.fileSize || 0);
  if (fileSize > MAX_DOC_SIZE_BYTES) {
    return { valid: false, error: `File size (${(fileSize / (1024 * 1024)).toFixed(2)} MB) exceeds the 5 MB limit` };
  }

  return { valid: true };
}

export function validateApplicationPayload({ service, formData = {}, documents = [], isDraft = false }) {
  const errors = [];

  if (!service) {
    return { isValid: false, errors: ['Selected service is invalid or does not exist'] };
  }

  // Drafts have relaxed requirements to allow in-progress saving
  if (isDraft) {
    // Only basic check that applicantName or email is present if provided
    if (formData.email && !validateEmail(formData.email)) {
      errors.push('Please provide a valid email format if entering an email.');
    }
    return { isValid: errors.length === 0, errors };
  }

  // --- 1. Validate Applicant Information ---
  const fullName = (formData.fullName || formData.applicantName || '').trim();
  if (!fullName || fullName.length < 3) {
    errors.push('Full name is required (minimum 3 characters).');
  }

  if (!formData.email || !validateEmail(formData.email)) {
    errors.push('A valid email address is required.');
  }

  if (!formData.phone || !validatePhone(formData.phone)) {
    errors.push('A valid 10-digit mobile number is required.');
  }

  const address = (formData.address || '').trim();
  if (!address || address.length < 5) {
    errors.push('Permanent residential address is required (minimum 5 characters).');
  }

  if (!formData.district || formData.district.trim() === '') {
    errors.push('District is required.');
  }

  if (!formData.state || formData.state.trim() === '') {
    errors.push('State is required.');
  }

  // --- 2. Validate Service-Specific Fields ---
  const serviceCode = (service.code || service.id || '').toUpperCase();
  const category = (service.category || '').toLowerCase();

  if (category.includes('scholarship') || serviceCode.includes('SCHOLARSHIP')) {
    if (!formData.institution || formData.institution.trim().length < 3) {
      errors.push('Educational institution name is required.');
    }
    if (!formData.course || formData.course.trim().length < 2) {
      errors.push('Enrolled course/degree name is required.');
    }
    const income = Number(formData.annualIncome);
    if (isNaN(income) || income <= 0) {
      errors.push('Valid annual family income in ₹ is required.');
    }
  } else if (category.includes('certificate') || serviceCode.includes('INCOME_CERT') || serviceCode.includes('CASTE_CERT')) {
    const income = Number(formData.annualIncome);
    if (isNaN(income) || income <= 0) {
      errors.push('Valid declared annual income in ₹ is required.');
    }
    if (!formData.purpose || formData.purpose.trim().length < 3) {
      errors.push('Purpose for obtaining the certificate is required.');
    }
    if (!formData.occupation || formData.occupation.trim().length < 2) {
      errors.push('Primary occupation is required.');
    }
  } else if (category.includes('health') || serviceCode.includes('HEALTH')) {
    if (!formData.rationCardNumber || formData.rationCardNumber.trim().length < 5) {
      errors.push('Ration Card or Beneficiary ID number is required.');
    }
  } else if (category.includes('transport') || serviceCode.includes('DL_')) {
    if (!formData.licenseNumber || formData.licenseNumber.trim().length < 5) {
      errors.push('Current Driving License number is required.');
    }
  } else if (category.includes('agriculture') || serviceCode.includes('PM_KISAN')) {
    if (!formData.khasraNumber || formData.khasraNumber.trim().length < 2) {
      errors.push('Land record Khasra / Survey number is required.');
    }
  }

  // --- 3. Validate Documents ---
  const requiredDocList = service.requiredDocuments || [];
  if (requiredDocList.length > 0) {
    if (!Array.isArray(documents) || documents.length === 0) {
      errors.push(`At least one required verification document must be uploaded (${requiredDocList[0]}).`);
    } else {
      // Validate each uploaded document
      for (const doc of documents) {
        const docRes = validateDocument(doc);
        if (!docRes.valid) {
          errors.push(`Document error (${doc.name || 'Unnamed'}): ${docRes.error}`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
