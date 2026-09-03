/**
 * SIH Government Service Integration Platform — Database & In-Memory Data Models
 * Manages users, roles, departments, permissions, sessions, and scoped applications.
 */

import crypto from 'node:crypto';

// Password Hashing Utility using Node native crypto (PBKDF2 / Scrypt)
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

// 1. Roles & Permissions Model
export const ROLES = {
  CITIZEN: {
    id: 'ROLE_CITIZEN',
    name: 'Citizen',
    description: 'Standard citizen access for service discovery, applications, tracking, and vault',
    permissions: [
      'services:read',
      'applications:create',
      'applications:read_own',
      'vault:read_own',
      'notifications:read_own',
      'feedback:create',
      'ai_help:access'
    ]
  },
  OFFICER: {
    id: 'ROLE_OFFICER',
    name: 'Department Officer',
    description: 'Departmental staff authorized to verify and process applications within assigned department',
    permissions: [
      'officer:workspace',
      'applications:read_dept',
      'applications:process_dept',
      'documents:verify_dept'
    ]
  },
  ADMIN: {
    id: 'ROLE_ADMIN',
    name: 'Administrator',
    description: 'Platform administrators managing users, departments, integrations, and audit logs',
    permissions: [
      'admin:manage_users',
      'admin:manage_departments',
      'admin:system_overview',
      'integrations:monitor',
      'audit:read'
    ]
  }
};

// 2. Departments Model
export const DEPARTMENTS = [
  {
    id: 'DEP-EDU',
    code: 'EDUCATION',
    name: 'Department of Higher Education',
    ministry: 'Ministry of Education',
    activeOfficersCount: 14
  },
  {
    id: 'DEP-REV',
    code: 'REVENUE',
    name: 'State Revenue & Land Records Department',
    ministry: 'Ministry of Revenue',
    activeOfficersCount: 22
  },
  {
    id: 'DEP-HLT',
    code: 'HEALTH',
    name: 'Ministry of Health & Family Welfare',
    ministry: 'National Health Mission',
    activeOfficersCount: 18
  },
  {
    id: 'DEP-TRN',
    code: 'TRANSPORT',
    name: 'Ministry of Road Transport & Highways',
    ministry: 'Transport Division',
    activeOfficersCount: 12
  },
  {
    id: 'DEP-AGR',
    code: 'AGRICULTURE',
    name: 'Department of Agriculture & Farmers Welfare',
    ministry: 'Ministry of Agriculture',
    activeOfficersCount: 16
  }
];

// Pre-compute secure hashes for seed users
const citizenCredentials = hashPassword('Citizen@123', 'salt_citizen_1001');
const eduOfficerCredentials = hashPassword('Officer@123', 'salt_officer_1002');
const revOfficerCredentials = hashPassword('Officer@123', 'salt_officer_1003');
const adminCredentials = hashPassword('Admin@123', 'salt_admin_1004');

// 3. User Store (Seed Data)
export const users = [
  {
    id: 'USR-CIT-001',
    email: 'citizen@example.com',
    passwordHash: citizenCredentials.hash,
    salt: citizenCredentials.salt,
    name: 'Rahul Verma',
    role: 'CITIZEN',
    departmentId: null,
    departmentCode: null,
    phone: '+91 98765 43210',
    aadhaarMasked: 'XXXX-XXXX-4819',
    kycStatus: 'Verified (DigiLocker Linked)',
    state: 'Maharashtra',
    district: 'Pune',
    createdAt: '2026-01-15T10:00:00Z'
  },
  {
    id: 'USR-OFF-EDU-001',
    email: 'officer.edu@gov.in',
    passwordHash: eduOfficerCredentials.hash,
    salt: eduOfficerCredentials.salt,
    name: 'Dr. Sunita Sharma',
    role: 'OFFICER',
    departmentId: 'DEP-EDU',
    departmentCode: 'EDUCATION',
    designation: 'Senior Verification Officer (Higher Education)',
    phone: '+91 98111 22334',
    state: 'National / Central',
    createdAt: '2026-02-01T09:00:00Z'
  },
  {
    id: 'USR-OFF-REV-002',
    email: 'officer.rev@gov.in',
    passwordHash: revOfficerCredentials.hash,
    salt: revOfficerCredentials.salt,
    name: 'Vikram Singh',
    role: 'OFFICER',
    departmentId: 'DEP-REV',
    departmentCode: 'REVENUE',
    designation: 'Sub-Divisional Revenue Officer',
    phone: '+91 98222 33445',
    state: 'Maharashtra',
    createdAt: '2026-02-05T09:00:00Z'
  },
  {
    id: 'USR-ADM-001',
    email: 'admin@gov.in',
    passwordHash: adminCredentials.hash,
    salt: adminCredentials.salt,
    name: 'Rajesh Nair',
    role: 'ADMIN',
    departmentId: null,
    departmentCode: null,
    designation: 'Principal Platform Administrator',
    phone: '+91 98999 00112',
    state: 'New Delhi',
    createdAt: '2026-01-01T00:00:00Z'
  }
];

// 4. Scoped Applications Data (for Officer / Citizen queries)
export const departmentalApplications = [
  {
    id: 'APP-2026-EDU-8812',
    applicantId: 'USR-CIT-001',
    applicantName: 'Rahul Verma',
    serviceName: 'Post-Matric Scholarship for Higher Education',
    departmentCode: 'EDUCATION',
    departmentId: 'DEP-EDU',
    submittedDate: '2026-08-28',
    status: 'ORCHESTRATING',
    currentStage: 'Smart Orchestration / Revenue Cross-Verification',
    amount: '₹25,000 / year',
    documents: ['Income Certificate', 'Previous Marksheet', 'Admission Letter']
  },
  {
    id: 'APP-2026-EDU-9043',
    applicantId: 'USR-CIT-002',
    applicantName: 'Pooja Patil',
    serviceName: 'Central Sector University Scholarship',
    departmentCode: 'EDUCATION',
    departmentId: 'DEP-EDU',
    submittedDate: '2026-08-30',
    status: 'VERIFICATION_PENDING',
    currentStage: 'Officer Document Review',
    amount: '₹20,000 / year',
    documents: ['12th Marksheet', 'Income Certificate']
  },
  {
    id: 'APP-2026-REV-4109',
    applicantId: 'USR-CIT-001',
    applicantName: 'Rahul Verma',
    serviceName: 'Issuance of Income Certificate',
    departmentCode: 'REVENUE',
    departmentId: 'DEP-REV',
    submittedDate: '2026-08-15',
    status: 'APPROVED',
    currentStage: 'Approved & Digitally Signed',
    amount: 'N/A',
    documents: ['Salary Slips', 'Ration Card']
  },
  {
    id: 'APP-2026-REV-4521',
    applicantId: 'USR-CIT-003',
    applicantName: 'Anil Deshmukh',
    serviceName: 'Issuance of Income Certificate',
    departmentCode: 'REVENUE',
    departmentId: 'DEP-REV',
    submittedDate: '2026-09-01',
    status: 'PENDING_REVIEW',
    currentStage: 'Revenue Inspector Verification',
    amount: 'N/A',
    documents: ['Affidavit', 'Land Holding Slip']
  }
];

// 5. Active Sessions Store (Token -> Session)
export const sessions = new Map();

// Helper database functions
export const db = {
  findUserByEmail(email) {
    return users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  },

  findUserById(id) {
    return users.find(u => u.id === id);
  },

  createUser({ email, password, name, phone, state, district }) {
    const existing = this.findUserByEmail(email);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const { hash, salt } = hashPassword(password);
    const newUser = {
      id: `USR-CIT-${Date.now()}`,
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      salt,
      name,
      role: 'CITIZEN',
      departmentId: null,
      departmentCode: null,
      phone: phone || '',
      aadhaarMasked: 'XXXX-XXXX-' + Math.floor(1000 + Math.random() * 9000),
      kycStatus: 'Pending Verification',
      state: state || 'General',
      district: district || 'General',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    return newUser;
  },

  createSession(user) {
    const token = `sih_sess_${crypto.randomBytes(24).toString('hex')}`;
    const session = {
      token,
      userId: user.id,
      role: user.role,
      departmentId: user.departmentId,
      departmentCode: user.departmentCode,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    };
    sessions.set(token, session);
    return session;
  },

  getSession(token) {
    if (!token) return null;
    const session = sessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      sessions.delete(token);
      return null;
    }
    return session;
  },

  deleteSession(token) {
    return sessions.delete(token);
  },

  getDepartmentalApplications(departmentCode) {
    return departmentalApplications.filter(a => a.departmentCode === departmentCode);
  },

  createApplication({ applicantId, applicantName, serviceId, formData = {}, documents = [], status = 'SUBMITTED' }) {
    const service = this.getServiceById(serviceId);
    if (!service) {
      throw new Error(`Service not found with ID: ${serviceId}`);
    }

    const deptPrefix = service.departmentCode ? service.departmentCode.slice(0, 3) : 'GEN';
    const randSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const id = `APP-2026-${deptPrefix}-${randSuffix}`;
    const now = new Date().toISOString();

    const newApp = {
      id,
      applicantId,
      applicantName: applicantName || 'Citizen Applicant',
      serviceId: service.id,
      serviceName: service.title,
      departmentId: service.departmentId,
      departmentCode: service.departmentCode,
      status: status || 'SUBMITTED',
      formData: { ...formData },
      documents: Array.isArray(documents) ? [...documents] : [],
      createdAt: now,
      updatedAt: now,
      submittedAt: status === 'SUBMITTED' ? now : null,
      submittedDate: now.slice(0, 10),
      currentStage: status === 'SUBMITTED' ? 'Application Submitted & Awaiting Processing' : 'Draft in Progress',
      amount: formData.amount || service.fee || 'N/A'
    };

    departmentalApplications.push(newApp);
    return newApp;
  },

  updateApplication(id, applicantId, { formData, documents, status } = {}) {
    const app = this.getApplicationById(id);
    if (!app) {
      const err = new Error(`Application not found with ID: ${id}`);
      err.statusCode = 404;
      throw err;
    }

    if (app.applicantId !== applicantId) {
      const err = new Error('Access Denied: You do not own this application');
      err.statusCode = 403;
      throw err;
    }

    const now = new Date().toISOString();
    if (formData) {
      app.formData = { ...app.formData, ...formData };
    }
    if (documents) {
      app.documents = Array.isArray(documents) ? [...documents] : app.documents;
    }
    if (status) {
      app.status = status;
      if (status === 'SUBMITTED' && !app.submittedAt) {
        app.submittedAt = now;
        app.submittedDate = now.slice(0, 10);
        app.currentStage = 'Application Submitted & Awaiting Processing';
      }
    }
    app.updatedAt = now;
    return app;
  },

  getApplicationById(id) {
    if (!id) return null;
    return departmentalApplications.find(a => a.id.toLowerCase() === id.toLowerCase().trim()) || null;
  },

  getCitizenApplications(applicantId) {
    if (!applicantId) return [];
    return departmentalApplications.filter(a => a.applicantId === applicantId);
  },

  getAllUsersSafe() {
    return users.map(({ passwordHash, salt, ...safeUser }) => safeUser);
  },

  getAllDepartments() {
    return DEPARTMENTS;
  },

  getAllServices() {
    return SERVICES;
  },

  getServices({ search = '', category = 'all', department = 'all', availability = 'all' } = {}) {
    const q = search.toLowerCase().trim();
    return SERVICES.filter(service => {
      // Category filter
      if (category && category !== 'all' && service.category.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
      // Department filter
      if (department && department !== 'all' && 
          service.departmentCode.toLowerCase() !== department.toLowerCase() && 
          service.department.toLowerCase() !== department.toLowerCase()) {
        return false;
      }
      // Availability filter
      if (availability && availability !== 'all' && service.applicationAvailability.toLowerCase() !== availability.toLowerCase()) {
        return false;
      }
      // Search term matching: title, description, category, department, keywords, eligibility
      if (q) {
        const matchesTitle = service.title.toLowerCase().includes(q);
        const matchesDesc = service.description.toLowerCase().includes(q);
        const matchesCategory = service.category.toLowerCase().includes(q);
        const matchesDept = service.department.toLowerCase().includes(q);
        const matchesEligibility = service.eligibility.toLowerCase().includes(q);
        const matchesKeywords = service.keywords && service.keywords.some(k => k.toLowerCase().includes(q));
        const matchesDocs = service.requiredDocuments && service.requiredDocuments.some(d => d.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesCategory && !matchesDept && !matchesEligibility && !matchesKeywords && !matchesDocs) {
          return false;
        }
      }
      return true;
    });
  },

  getServiceById(id) {
    if (!id) return null;
    return SERVICES.find(s => s.id.toLowerCase() === id.toLowerCase().trim()) || null;
  },

  getServiceCategories() {
    const cats = new Set(SERVICES.map(s => s.category));
    return Array.from(cats);
  }
};

// 6. Canonical Government Service Catalog (Phase 4 Foundation)
export const SERVICES = [
  {
    id: 'SRV-EDU-001',
    code: 'SCHOLARSHIP_001',
    title: 'Post-Matric Scholarship for Higher Education',
    department: 'Department of Higher Education',
    departmentId: 'DEP-EDU',
    departmentCode: 'EDUCATION',
    adapterCode: 'EDU_ADAPTER',
    category: 'Scholarships',
    description: 'Financial assistance for meritorious post-secondary students belonging to economically disadvantaged backgrounds to pursue accredited degree courses.',
    whoCanApply: 'Students enrolled in recognized college or university undergraduate/postgraduate programs.',
    eligibility: 'Annual gross family income must be under ₹2,50,000; Minimum 50% aggregate in qualifying examination; Enrolled in recognized institution.',
    requiredDocuments: [
      'Income Certificate (Issued by Revenue Dept)',
      'Previous Academic Marksheet',
      'College Admission & Fee Receipt',
      'Aadhaar Card Copy',
      'Active Bank Account Passbook'
    ],
    turnaroundTime: '5-7 Working Days',
    applicationMethod: 'Online (Unified Citizen Portal)',
    serviceStatus: 'Active',
    applicationAvailability: 'Open',
    officialUrl: 'https://scholarships.gov.in',
    fee: 'Free',
    integrationMode: 'Mock Adapter Active',
    keywords: ['scholarship', 'education', 'college', 'student', 'tuition', 'post-matric', 'grant'],
    workflowStages: ['Form Submission', 'Automated Income Verification', 'University Verification', 'Disbursement Approval']
  },
  {
    id: 'SRV-REV-002',
    code: 'INCOME_CERT_001',
    title: 'Issuance of Income Certificate',
    department: 'State Revenue & Land Records Department',
    departmentId: 'DEP-REV',
    departmentCode: 'REVENUE',
    adapterCode: 'REV_ADAPTER',
    category: 'Certificates',
    description: 'Official revenue document certifying annual family income from all sources, essential for government reservations, welfare schemes, and scholarships.',
    whoCanApply: 'State residents or heads of households needing legal certification of annual earnings.',
    eligibility: 'Resident of the state holding valid proof of residence and documentary proof of monthly or annual income.',
    requiredDocuments: [
      'Salary Slips / Income Affidavit',
      'Ration Card / Utility Bill Proof',
      'Aadhaar Card',
      'Passport Sized Photograph'
    ],
    turnaroundTime: '3-5 Working Days',
    applicationMethod: 'Online (Unified Citizen Portal)',
    serviceStatus: 'Active',
    applicationAvailability: 'Open',
    officialUrl: 'https://www.myscheme.gov.in',
    fee: '₹20',
    integrationMode: 'Mock Adapter Active',
    keywords: ['income', 'certificate', 'revenue', 'tahsildar', 'salary', 'affidavit', 'verification'],
    workflowStages: ['Unified Submission', 'Revenue Inspector Review', 'Tehsildar Digital Signature', 'Vault Delivery']
  },
  {
    id: 'SRV-HLT-003',
    code: 'HEALTH_CARD_001',
    title: 'Ayushman Bharat PM-JAY Health Coverage',
    department: 'Ministry of Health & Family Welfare',
    departmentId: 'DEP-HLT',
    departmentCode: 'HEALTH',
    adapterCode: 'HLT_ADAPTER',
    category: 'Health',
    description: 'Comprehensive cashless healthcare cover up to ₹5,00,000 per family per year for secondary and tertiary hospitalization across empaneled public and private hospitals.',
    whoCanApply: 'Families identified under the national Socio-Economic Caste Census (SECC) or eligible state welfare lists.',
    eligibility: 'Families belonging to bottom 40% vulnerable economic strata without prior commercial medical insurance cover.',
    requiredDocuments: [
      'Ration Card / NFSA Beneficiary Card',
      'Aadhaar Card',
      'Active Mobile Number for OTP Verification'
    ],
    turnaroundTime: '1 Working Day (Instant e-Card)',
    applicationMethod: 'Online (Unified Citizen Portal)',
    serviceStatus: 'Active',
    applicationAvailability: 'Open',
    officialUrl: 'https://www.myscheme.gov.in',
    fee: 'Free',
    integrationMode: 'Planned Adapter',
    keywords: ['health', 'hospital', 'insurance', 'ayushman', 'medical', 'pmjay', 'treatment', 'cashless'],
    workflowStages: ['Eligibility Cross-Check', 'Aadhaar e-KYC', 'Golden Card Generation']
  },
  {
    id: 'SRV-TRN-004',
    code: 'DL_RENEWAL_001',
    title: 'Driving License Renewal & Duplicate',
    department: 'Ministry of Road Transport & Highways',
    departmentId: 'DEP-TRN',
    departmentCode: 'TRANSPORT',
    adapterCode: 'TRN_ADAPTER',
    category: 'Transport',
    description: 'Online application for renewal of expired motor vehicle driving license or issuance of duplicate smart card for lost or mutilated licenses.',
    whoCanApply: 'Any licensed driver whose license validity has expired or is expiring within 365 days.',
    eligibility: 'Holder of an authentic driving license issued by any State Transport Authority.',
    requiredDocuments: [
      'Existing / Expired Driving License Copy',
      'Medical Fitness Certificate (Form 1A for applicants > 40 yrs)',
      'Proof of Current Residential Address'
    ],
    turnaroundTime: '7-10 Working Days',
    applicationMethod: 'Online (Unified Citizen Portal)',
    serviceStatus: 'Active',
    applicationAvailability: 'Open',
    officialUrl: 'https://pib.gov.in',
    fee: '₹200',
    integrationMode: 'Planned Adapter',
    keywords: ['transport', 'license', 'driving', 'rto', 'dl', 'vehicle', 'renewal', 'duplicate'],
    workflowStages: ['License Database Lookup', 'Medical Form Upload', 'RTO Processing', 'Smart Card Dispatch']
  },
  {
    id: 'SRV-AGR-005',
    code: 'PM_KISAN_001',
    title: 'PM-Kisan Samman Nidhi Income Support',
    department: 'Department of Agriculture & Farmers Welfare',
    departmentId: 'DEP-AGR',
    departmentCode: 'AGRICULTURE',
    adapterCode: 'AGR_ADAPTER',
    category: 'Welfare Schemes',
    description: 'Income guarantee of ₹6,000 per year delivered in three direct installments of ₹2,000 each into linked bank accounts of landholder farmer families.',
    whoCanApply: 'Small and marginal landholder farmer families owning cultivable agricultural land.',
    eligibility: 'Ownership of cultivable landholding verified against computerized state land revenue records.',
    requiredDocuments: [
      'Land Record Record-of-Rights (RoR / Khasra / Khatoni)',
      'Aadhaar Card Linked to Bank Account',
      'Bank Account Passbook Details'
    ],
    turnaroundTime: '10-15 Working Days',
    applicationMethod: 'Online (Unified Citizen Portal)',
    serviceStatus: 'Active',
    applicationAvailability: 'Open',
    officialUrl: 'https://www.myscheme.gov.in',
    fee: 'Free',
    integrationMode: 'Planned Adapter',
    keywords: ['farmer', 'agriculture', 'kisan', 'land', 'subsidy', 'scheme', 'welfare', 'crop'],
    workflowStages: ['Land Record Digital Fetch', 'Aadhaar e-KYC', 'State Revenue Clearance', 'DBT Mandate']
  },
  {
    id: 'SRV-REV-006',
    code: 'CASTE_CERT_001',
    title: 'Issuance of Community / Caste Certificate',
    department: 'State Revenue & Land Records Department',
    departmentId: 'DEP-REV',
    departmentCode: 'REVENUE',
    adapterCode: 'REV_ADAPTER',
    category: 'Certificates',
    description: 'Official legal proof of social category (SC / ST / OBC / EWS) required for education admissions, scholarships, and public employment benefits.',
    whoCanApply: 'Citizens belonging to reserved categories with ancestral roots in the state.',
    eligibility: 'Belonging to a notified caste / tribe in the state list with documented family lineage.',
    requiredDocuments: [
      "Father's or Paternal Relative's Caste Certificate",
      'School Leaving Certificate / Birth Certificate',
      'Permanent Residence Proof'
    ],
    turnaroundTime: '10-14 Working Days',
    applicationMethod: 'Online (Unified Citizen Portal)',
    serviceStatus: 'Active',
    applicationAvailability: 'Open',
    officialUrl: 'https://www.myscheme.gov.in',
    fee: '₹20',
    integrationMode: 'Mock Adapter Active',
    keywords: ['caste', 'certificate', 'sc', 'st', 'obc', 'ews', 'revenue', 'tahsildar', 'reservation'],
    workflowStages: ['Lineage Record Verification', 'Field Enquiry', 'Tehsildar Certification']
  },
  {
    id: 'SRV-EDU-007',
    code: 'SCHOLARSHIP_002',
    title: 'Central Sector Scheme of Scholarships for College Students',
    department: 'Department of Higher Education',
    departmentId: 'DEP-EDU',
    departmentCode: 'EDUCATION',
    adapterCode: 'EDU_ADAPTER',
    category: 'Scholarships',
    description: 'Centrally sponsored scholarship providing financial aid of ₹12,000 to ₹20,000 annually for meritorious undergraduate and postgraduate students.',
    whoCanApply: 'Students scoring above the 80th percentile in relevant stream in Class 12 board exams.',
    eligibility: 'Passed Class 12 board with >80th percentile; pursuing regular undergraduate degree; family income < ₹4.5 Lakhs/year.',
    requiredDocuments: [
      'Class 12 Board Marksheet',
      'Income Certificate',
      'College Admission ID Card',
      'Bank Account Passbook'
    ],
    turnaroundTime: '10-12 Working Days',
    applicationMethod: 'Online (Unified Citizen Portal)',
    serviceStatus: 'Active',
    applicationAvailability: 'Open',
    officialUrl: 'https://scholarships.gov.in',
    fee: 'Free',
    integrationMode: 'Mock Adapter Active',
    keywords: ['scholarship', 'merit', 'university', 'college', 'central sector', 'higher education'],
    workflowStages: ['Board Mark Verification', 'Income Validation', 'College Nodal Officer Approval']
  },
  {
    id: 'SRV-SOC-008',
    code: 'DISABILITY_AID_001',
    title: 'Divyangjan Disability Assistance & Subsistence',
    department: 'Ministry of Social Justice & Empowerment',
    departmentId: 'DEP-SOC',
    departmentCode: 'SOCIAL_WELFARE',
    adapterCode: 'SOC_ADAPTER',
    category: 'Welfare Schemes',
    description: 'Monthly subsistence pension and assistive prosthetic equipment support for citizens with benchmark permanent disabilities.',
    whoCanApply: 'Individuals holding verified Unique Disability Identity (UDID) cards.',
    eligibility: 'Benchmark disability of 40% or higher certified by authorized medical board; family income within state poverty threshold.',
    requiredDocuments: [
      'UDID Card / Disability Certificate from CMO',
      'Income Certificate',
      'Aadhaar Card',
      'Bank Account Details'
    ],
    turnaroundTime: '15 Working Days',
    applicationMethod: 'Online (Unified Citizen Portal)',
    serviceStatus: 'Active',
    applicationAvailability: 'Open',
    officialUrl: 'https://www.myscheme.gov.in',
    fee: 'Free',
    integrationMode: 'Planned Adapter',
    keywords: ['disability', 'divyangjan', 'udid', 'pension', 'aid', 'welfare', 'social justice', 'handicapped'],
    workflowStages: ['Medical Certificate Cross-Check', 'Social Welfare Officer Sanction', 'Pension Disbursal']
  }
];
