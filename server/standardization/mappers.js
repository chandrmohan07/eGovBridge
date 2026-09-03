/**
 * SIH Government Service Integration Platform — Department Data Mappers
 * Bidirectional mappers translating department-specific proprietary structures
 * into the Canonical Data Model and vice versa.
 * MOCK / DEMO DATA — NOT REAL GOVERNMENT DATA
 */

import { normalizeDate, normalizePhone, normalizeAddress, normalizeGender, normalizeStatus } from './normalizers.js';
import { CANONICAL_VERSION } from './schemas.js';

export const DepartmentMappers = {
  /**
   * 1. Identity / DigiLocker Mapper
   * Translates UIDAI / DigiLocker payloads <--> Canonical Citizen & Document Reference
   */
  Identity: {
    toCanonical(deptPayload) {
      if (!deptPayload) return null;
      return {
        canonicalVersion: CANONICAL_VERSION,
        citizenId: deptPayload.uid_ref || deptPayload.aadhaar_ref || `CIT-${Date.now()}`,
        name: deptPayload.full_name || deptPayload.citizen_name || deptPayload.name || '',
        dateOfBirth: normalizeDate(deptPayload.dob_ddmmyyyy || deptPayload.dob || deptPayload.birth_date),
        gender: normalizeGender(deptPayload.gender_code || deptPayload.gender),
        mobile: normalizePhone(deptPayload.phone_number || deptPayload.mobile_no || deptPayload.mobile),
        email: deptPayload.email_addr || deptPayload.email || null,
        address: normalizeAddress(deptPayload.permanent_addr || deptPayload.address),
        sourceDepartment: 'DIGILOCKER'
      };
    },

    fromCanonical(canonical) {
      if (!canonical) return null;
      return {
        uid_ref: canonical.citizenId,
        full_name: canonical.name,
        dob_ddmmyyyy: canonical.dateOfBirth ? canonical.dateOfBirth.split('-').reverse().join('-') : null,
        gender_code: canonical.gender ? canonical.gender[0] : 'U',
        phone_number: canonical.mobile ? canonical.mobile.replace(/\D/g, '').slice(-10) : '',
        email_addr: canonical.email || '',
        permanent_addr: canonical.address ? `${canonical.address.addressLine}, ${canonical.address.district}, ${canonical.address.state} - ${canonical.address.pincode}` : ''
      };
    }
  },

  /**
   * 2. Education Board Mapper
   * Translates Academic Board / University records <--> Canonical
   */
  Education: {
    toCanonical(deptPayload) {
      if (!deptPayload) return null;
      return {
        canonicalVersion: CANONICAL_VERSION,
        citizenId: deptPayload.student_id || deptPayload.enrollment_no || `CIT-${Date.now()}`,
        name: deptPayload.student_name || deptPayload.candidate_name || deptPayload.name || '',
        dateOfBirth: normalizeDate(deptPayload.birth_dt || deptPayload.dob),
        gender: normalizeGender(deptPayload.gender),
        mobile: normalizePhone(deptPayload.contact_no || deptPayload.mobile),
        email: deptPayload.student_email || deptPayload.email || null,
        address: normalizeAddress(deptPayload.residential_address || deptPayload.address),
        academicDetails: {
          institution: deptPayload.institute_name || deptPayload.college_name || '',
          course: deptPayload.course_title || deptPayload.program || '',
          marksPercentage: parseFloat(deptPayload.aggregate_pct || deptPayload.percentage || '0')
        },
        sourceDepartment: 'EDUCATION'
      };
    },

    fromCanonical(canonical) {
      if (!canonical) return null;
      return {
        student_id: canonical.citizenId,
        student_name: canonical.name,
        birth_dt: canonical.dateOfBirth,
        contact_no: canonical.mobile ? canonical.mobile.replace(/\D/g, '').slice(-10) : '',
        student_email: canonical.email || '',
        residential_address: canonical.address ? canonical.address.addressLine : '',
        institute_name: canonical.academicDetails?.institution || '',
        course_title: canonical.academicDetails?.course || '',
        aggregate_pct: canonical.academicDetails?.marksPercentage || 0
      };
    }
  },

  /**
   * 3. Health / PM-JAY Mapper
   * Translates National Health Authority payloads <--> Canonical
   */
  Health: {
    toCanonical(deptPayload) {
      if (!deptPayload) return null;
      return {
        canonicalVersion: CANONICAL_VERSION,
        citizenId: deptPayload.beneficiary_id || deptPayload.pmjay_id || `CIT-${Date.now()}`,
        name: deptPayload.beneficiary_name || deptPayload.name || '',
        dateOfBirth: normalizeDate(deptPayload.dob || (deptPayload.birth_year ? `${deptPayload.birth_year}-01-01` : null)),
        gender: normalizeGender(deptPayload.gender),
        mobile: normalizePhone(deptPayload.mobile_num || deptPayload.phone),
        email: deptPayload.email || null,
        address: normalizeAddress(deptPayload.residence_location || deptPayload.address),
        healthQuota: {
          rationCardNumber: deptPayload.ration_card_no || '',
          seccCategory: deptPayload.secc_category || 'D1'
        },
        sourceDepartment: 'HEALTH'
      };
    },

    fromCanonical(canonical) {
      if (!canonical) return null;
      return {
        beneficiary_id: canonical.citizenId,
        beneficiary_name: canonical.name,
        dob: canonical.dateOfBirth,
        mobile_num: canonical.mobile ? canonical.mobile.replace(/\D/g, '').slice(-10) : '',
        ration_card_no: canonical.healthQuota?.rationCardNumber || '',
        secc_category: canonical.healthQuota?.seccCategory || 'D1'
      };
    }
  },

  /**
   * 4. Land Records / State Revenue Mapper
   * Translates Bhulekh / Tehsil Income records <--> Canonical
   */
  Revenue: {
    toCanonical(deptPayload) {
      if (!deptPayload) return null;
      return {
        canonicalVersion: CANONICAL_VERSION,
        citizenId: deptPayload.khatoni_id || deptPayload.citizen_id || `CIT-${Date.now()}`,
        name: deptPayload.applicant_nm || deptPayload.land_owner || deptPayload.name || '',
        dateOfBirth: normalizeDate(deptPayload.d_o_b || deptPayload.dob),
        gender: normalizeGender(deptPayload.gender),
        mobile: normalizePhone(deptPayload.mobile || deptPayload.phone),
        email: deptPayload.email || null,
        address: normalizeAddress({
          addressLine: deptPayload.village_name || deptPayload.address,
          tehsil: deptPayload.tehsil_name || deptPayload.taluk,
          district: deptPayload.district_name || deptPayload.district,
          state: deptPayload.state_name || deptPayload.state,
          pincode: deptPayload.pin_code || deptPayload.pincode
        }),
        revenueDetails: {
          khasraNumber: deptPayload.khasra_no || '',
          annualIncome: parseFloat(deptPayload.annual_inc || deptPayload.income || '0')
        },
        sourceDepartment: 'REVENUE'
      };
    },

    fromCanonical(canonical) {
      if (!canonical) return null;
      return {
        applicant_nm: canonical.name,
        d_o_b: canonical.dateOfBirth,
        mobile: canonical.mobile ? canonical.mobile.replace(/\D/g, '').slice(-10) : '',
        khasra_no: canonical.revenueDetails?.khasraNumber || '',
        annual_inc: canonical.revenueDetails?.annualIncome || 0,
        tehsil_name: canonical.address?.city || '',
        district_name: canonical.address?.district || '',
        state_name: canonical.address?.state || '',
        pin_code: canonical.address?.pincode || ''
      };
    }
  },

  /**
   * 5. Transport / Sarathi Mapper
   * Translates Parivahan / Sarathi driving license records <--> Canonical
   */
  Transport: {
    toCanonical(deptPayload) {
      if (!deptPayload) return null;
      return {
        canonicalVersion: CANONICAL_VERSION,
        citizenId: deptPayload.dl_number || deptPayload.appl_num || `CIT-${Date.now()}`,
        name: deptPayload.dl_applicant_name || deptPayload.holder_name || deptPayload.name || '',
        dateOfBirth: normalizeDate(deptPayload.date_of_birth || deptPayload.dob),
        gender: normalizeGender(deptPayload.gender_desc || deptPayload.gender),
        mobile: normalizePhone(deptPayload.cell_number || deptPayload.mobile),
        email: deptPayload.email_address || deptPayload.email || null,
        address: normalizeAddress(deptPayload.residential_address || deptPayload.address),
        transportDetails: {
          rtoCode: deptPayload.rto_office_code || deptPayload.rto_code || 'MH12',
          licenseClass: deptPayload.vehicle_class || 'LMV'
        },
        sourceDepartment: 'TRANSPORT'
      };
    },

    fromCanonical(canonical) {
      if (!canonical) return null;
      return {
        dl_applicant_name: canonical.name,
        date_of_birth: canonical.dateOfBirth,
        cell_number: canonical.mobile ? canonical.mobile.replace(/\D/g, '').slice(-10) : '',
        residential_address: canonical.address ? canonical.address.addressLine : '',
        rto_office_code: canonical.transportDetails?.rtoCode || 'MH12',
        vehicle_class: canonical.transportDetails?.licenseClass || 'LMV'
      };
    }
  },

  /**
   * 6. Welfare / PFMS Mapper
   * Translates Public Financial Management System payloads <--> Canonical
   */
  Welfare: {
    toCanonical(deptPayload) {
      if (!deptPayload) return null;
      return {
        canonicalVersion: CANONICAL_VERSION,
        citizenId: deptPayload.beneficiary_code || deptPayload.pfms_id || `CIT-${Date.now()}`,
        name: deptPayload.beneficiary_name || deptPayload.account_holder || deptPayload.name || '',
        dateOfBirth: normalizeDate(deptPayload.dob || deptPayload.birth_date),
        gender: normalizeGender(deptPayload.gender),
        mobile: normalizePhone(deptPayload.contact_mobile || deptPayload.mobile),
        email: deptPayload.email || null,
        address: normalizeAddress(deptPayload.address),
        financialDetails: {
          accountNumberMasked: deptPayload.account_no ? `XXXX-${deptPayload.account_no.slice(-4)}` : '',
          ifsc: deptPayload.bank_ifsc || '',
          schemeCode: deptPayload.scheme_code || ''
        },
        sourceDepartment: 'FINANCE'
      };
    },

    fromCanonical(canonical) {
      if (!canonical) return null;
      return {
        beneficiary_name: canonical.name,
        dob: canonical.dateOfBirth,
        contact_mobile: canonical.mobile ? canonical.mobile.replace(/\D/g, '').slice(-10) : '',
        scheme_code: canonical.financialDetails?.schemeCode || '',
        bank_ifsc: canonical.financialDetails?.ifsc || ''
      };
    }
  }
};

/**
 * Normalizes any department payload into Canonical format by department key
 */
export function normalizeDepartmentPayload(deptKey, payload) {
  const norm = String(deptKey).toUpperCase().trim();
  const mapperKey = Object.keys(DepartmentMappers).find(k => k.toUpperCase() === norm || norm.includes(k.toUpperCase()));

  if (!mapperKey) {
    // Fallback: Generic normalization
    return {
      canonicalVersion: CANONICAL_VERSION,
      citizenId: payload.id || `CIT-${Date.now()}`,
      name: payload.name || payload.fullName || payload.citizen_name || '',
      dateOfBirth: normalizeDate(payload.dob || payload.birthDate || payload.dateOfBirth),
      gender: normalizeGender(payload.gender),
      mobile: normalizePhone(payload.mobile || payload.phone || payload.contact),
      email: payload.email || null,
      address: normalizeAddress(payload.address),
      sourceDepartment: deptKey
    };
  }

  return DepartmentMappers[mapperKey].toCanonical(payload);
}

/**
 * Transforms a Canonical object into department-specific payload by department key
 */
export function transformCanonicalToDepartment(deptKey, canonical) {
  const norm = String(deptKey).toUpperCase().trim();
  const mapperKey = Object.keys(DepartmentMappers).find(k => k.toUpperCase() === norm || norm.includes(k.toUpperCase()));

  if (!mapperKey) {
    return { ...canonical };
  }

  return DepartmentMappers[mapperKey].fromCanonical(canonical);
}
