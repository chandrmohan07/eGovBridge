/**
 * SIH Government Service Integration Platform — Canonical Normalization Utilities
 * Normalizes dates, phone numbers, addresses, PIN codes, and department status enums.
 */

/**
 * Normalizes various date inputs into standard ISO 8601 date string (YYYY-MM-DD)
 * Supports: 'DD-MM-YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'YYYY/MM/DD', Date objects, timestamps.
 */
export function normalizeDate(input) {
  if (!input) return null;

  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return input.toISOString().split('T')[0];
  }

  const str = String(input).trim();
  if (!str) return null;

  // Pattern: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
    if (isNaN(date.getTime())) return null;
    return `${year}-${month}-${day}`;
  }

  // Pattern: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
    if (isNaN(date.getTime())) return null;
    return `${year}-${month}-${day}`;
  }

  // Standard Date parse fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Normalizes Indian phone numbers into canonical international format: +91 [5 digits] [5 digits]
 */
export function normalizePhone(input) {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, '');

  let nationalDigits = '';
  if (digits.length === 10) {
    nationalDigits = digits;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    nationalDigits = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    nationalDigits = digits.slice(2);
  } else {
    return null; // Invalid length for Indian mobile number
  }

  // Mobile number must begin with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(nationalDigits)) {
    return null;
  }

  return `+91 ${nationalDigits.slice(0, 5)} ${nationalDigits.slice(5)}`;
}

/**
 * Normalizes 6-digit Indian PIN codes
 */
export function normalizePincode(input) {
  if (!input) return null;
  const str = String(input).trim().replace(/\D/g, '');
  if (/^[1-9]\d{5}$/.test(str)) {
    return str;
  }
  return null;
}

/**
 * Normalizes Gender to standard canonical enum: MALE, FEMALE, TRANSGENDER, OTHER
 */
export function normalizeGender(input) {
  if (!input) return 'OTHER';
  const str = String(input).trim().toUpperCase();

  if (['M', 'MALE', 'MAN', 'BOY'].includes(str)) return 'MALE';
  if (['F', 'FEMALE', 'WOMAN', 'GIRL'].includes(str)) return 'FEMALE';
  if (['T', 'TG', 'TRANS', 'TRANSGENDER'].includes(str)) return 'TRANSGENDER';
  return 'OTHER';
}

/**
 * Normalizes canonical address structure
 */
export function normalizeAddress(input) {
  if (!input) return null;

  if (typeof input === 'string') {
    return {
      addressLine: input.trim(),
      city: 'Pune',
      district: 'Pune',
      state: 'Maharashtra',
      pincode: '411001'
    };
  }

  return {
    addressLine: (input.addressLine || input.street || input.address || input.addr || '').trim(),
    city: (input.city || input.town || input.village || input.tehsil || '').trim(),
    district: (input.district || input.dist || '').trim(),
    state: (input.state || input.province || '').trim(),
    pincode: normalizePincode(input.pincode || input.pin || input.postalCode || input.zip)
  };
}

/**
 * Normalizes department status values to canonical application statuses
 */
export function normalizeStatus(input, customMapping = {}) {
  if (!input) return 'PENDING';
  const key = String(input).trim().toUpperCase();

  if (customMapping[key]) {
    return customMapping[key];
  }

  const defaultMapping = {
    'APPROVED': 'COMPLETED',
    'CLEARED': 'COMPLETED',
    'VERIFIED': 'COMPLETED',
    'SUCCESS': 'COMPLETED',
    'ISSUED': 'COMPLETED',
    'REJECTED': 'FAILED',
    'FAILED': 'FAILED',
    'DISMISSED': 'FAILED',
    'IN_REVIEW': 'IN_PROGRESS',
    'PROCESSING': 'IN_PROGRESS',
    'PENDING_VERIFICATION': 'PENDING',
    'SUBMITTED': 'PENDING'
  };

  return defaultMapping[key] || key;
}
