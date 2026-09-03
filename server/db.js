/**
 * SIH Government Service Integration Platform — Database & In-Memory Data Models
 * Manages users, roles, departments, permissions, sessions, and scoped applications.
 */

import crypto from 'node:crypto';
import { planWorkflow } from './orchestrator.js';

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

// 6. Smart Orchestration Instances Store (Phase 6 Foundation)
export const orchestrations = [];

// 7. Digital Document Vault Store (Phase 13 Foundation)
export const vaultDocuments = [
  {
    id: 'DOC-2026-AADH-01',
    citizenId: 'USR-CIT-001',
    documentType: 'IDENTITY_PROOF',
    documentName: 'Aadhaar e-KYC Card',
    fileName: 'aadhaar_rahul_verma.pdf',
    fileType: 'application/pdf',
    fileSize: 148200,
    storageReference: 'vault/USR-CIT-001/doc_seed_aadhaar.pdf',
    documentStatus: 'VERIFIED',
    uploadedAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
    expiryDate: null,
    metadata: {
      issuingAuthority: 'Unique Identification Authority of India (UIDAI)',
      verificationMode: 'DigiLocker Linked e-KYC'
    },
    applications: ['APP-2026-EDU-8812'],
    version: 1
  },
  {
    id: 'DOC-2026-INCM-02',
    citizenId: 'USR-CIT-001',
    documentType: 'INCOME_CERTIFICATE',
    documentName: 'Annual Family Income Certificate FY25-26',
    fileName: 'income_cert_fy26.pdf',
    fileType: 'application/pdf',
    fileSize: 204800,
    storageReference: 'vault/USR-CIT-001/doc_seed_income.pdf',
    documentStatus: 'VERIFIED',
    uploadedAt: '2026-08-22T14:30:00.000Z',
    updatedAt: '2026-08-22T14:30:00.000Z',
    expiryDate: '2027-03-31',
    metadata: {
      certificateNumber: 'REV/PUN/2026/8841',
      issuingAuthority: 'State Revenue Department, Tahsildar Haveli Pune',
      certifiedAnnualIncome: '₹1,80,000'
    },
    applications: ['APP-2026-EDU-8812'],
    version: 1
  },
  {
    id: 'DOC-2026-MRKS-03',
    citizenId: 'USR-CIT-001',
    documentType: 'EDUCATION_CERTIFICATE',
    documentName: 'Higher Secondary School Certificate (Class 12)',
    fileName: 'hsc_marksheet_class12.pdf',
    fileType: 'application/pdf',
    fileSize: 312400,
    storageReference: 'vault/USR-CIT-001/doc_seed_marksheet.pdf',
    documentStatus: 'VERIFIED',
    uploadedAt: '2026-08-25T09:15:00.000Z',
    updatedAt: '2026-08-25T09:15:00.000Z',
    expiryDate: null,
    metadata: {
      boardName: 'Maharashtra State Board of Secondary and Higher Secondary Education',
      percentage: '92.5%',
      passingYear: '2025'
    },
    applications: ['APP-2026-EDU-8812'],
    version: 1
  }
];

// 8. Vault Audit Trail Store
export const vaultAuditLogs = [];

// 9. Centralized Notifications Store (Phase 14 Foundation)
export const notifications = [
  {
    id: 'NOTIF-2026-001',
    recipientUserId: 'USR-CIT-001',
    recipientRole: 'CITIZEN',
    applicationId: 'APP-2026-EDU-8812',
    type: 'APPLICATION_UNDER_REVIEW',
    title: 'Orchestration In Progress',
    message: 'Your Post-Matric Scholarship application is undergoing automated inter-department cross-verification.',
    status: 'UNREAD',
    priority: 'NORMAL',
    category: 'Application',
    metadata: {
      departmentCode: 'EDUCATION',
      serviceName: 'Post-Matric Scholarship for Higher Education'
    },
    createdAt: '2026-09-02T14:30:00.000Z',
    readAt: null
  },
  {
    id: 'NOTIF-2026-002',
    recipientUserId: 'USR-CIT-001',
    recipientRole: 'CITIZEN',
    applicationId: 'APP-2026-REV-4109',
    type: 'APPLICATION_APPROVED',
    title: 'Income Certificate Approved',
    message: 'Your Income Certificate application has been approved and digitally signed by Tehsildar Haveli.',
    status: 'READ',
    priority: 'HIGH',
    category: 'Application',
    metadata: {
      departmentCode: 'REVENUE',
      serviceName: 'Issuance of Income Certificate'
    },
    createdAt: '2026-08-18T16:00:00.000Z',
    readAt: '2026-08-19T09:00:00.000Z'
  }
];

// 10. User Notification Preferences Store
export const notificationPreferences = new Map();

// 11. Employment Opportunities Store (Phase 16 Foundation)
// MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION
export const EMPLOYMENT_OPPORTUNITIES = [
  {
    id: 'EMP-2026-001',
    title: 'Scientific Officer / Technical Assistant (IT)',
    organization: 'National Informatics Centre (NIC)',
    department: 'Ministry of Electronics and Information Technology',
    category: 'Government Jobs',
    opportunityType: 'JOB',
    description: 'Recruitment of Scientific Officers and Technical Assistants for cloud engineering, cyber security operations, and digital governance infrastructure.',
    eligibility: 'B.Tech/B.E. in Computer Science / IT or MCA with min 60% aggregate marks.',
    qualification: 'Graduate',
    skills: ['Software Engineering', 'Cloud Infrastructure', 'Cyber Security', 'Python', 'Networking'],
    location: 'New Delhi / Remote Opportunities Available',
    vacancies: 45,
    salary: 'Level 10 (₹56,100 - ₹1,77,500)',
    applicationStartDate: '2026-08-15',
    applicationEndDate: '2026-09-25',
    deadline: '2026-09-25',
    applicationUrl: 'https://www.ncs.gov.in',
    source: 'National Career Service (NCS)',
    sourceType: 'GOVERNMENT_PORTAL',
    status: 'ACTIVE',
    verified: true,
    isMock: true,
    lastVerifiedAt: '2026-09-03',
    createdAt: '2026-08-15T09:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z'
  },
  {
    id: 'EMP-2026-002',
    title: 'Graduate Apprentice Trainee (Renewable Energy)',
    organization: 'Solar Energy Corporation of India (SECI)',
    department: 'Ministry of New and Renewable Energy',
    category: 'Apprenticeships',
    opportunityType: 'APPRENTICESHIP',
    description: 'One-year structured apprenticeship training covering solar PV farm operation, green hydrogen grid interfacing, and project management.',
    eligibility: 'Graduates in Electrical / Mechanical / Civil Engineering (Passout 2024-2026).',
    qualification: 'Graduate',
    skills: ['Electrical Systems', 'Solar PV Design', 'AutoCAD', 'Field Inspection'],
    location: 'Multiple State Offices',
    vacancies: 120,
    salary: 'Stipend: ₹18,000 / month',
    applicationStartDate: '2026-08-20',
    applicationEndDate: '2026-09-18',
    deadline: '2026-09-18',
    applicationUrl: 'https://www.ncs.gov.in',
    source: 'National Career Service (NCS)',
    sourceType: 'GOVERNMENT_PORTAL',
    status: 'ACTIVE',
    verified: true,
    isMock: true,
    lastVerifiedAt: '2026-09-03',
    createdAt: '2026-08-20T09:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z'
  },
  {
    id: 'EMP-2026-003',
    title: 'Staff Selection Commission (SSC) Junior Secretariat Assistant',
    organization: 'Staff Selection Commission',
    department: 'Department of Personnel and Training',
    category: 'Government Jobs',
    opportunityType: 'JOB',
    description: 'Recruitment for Lower Division Clerks (LDC) and Junior Secretariat Assistants (JSA) across Central Ministries and Departments.',
    eligibility: '12th Standard or equivalent with minimum typing speed of 35 wpm in English or 30 wpm in Hindi.',
    qualification: '12th Pass',
    skills: ['Office Administration', 'Typing', 'Data Entry', 'Records Management'],
    location: 'All India Placement',
    vacancies: 3400,
    salary: 'Level 2 (₹19,900 - ₹63,200)',
    applicationStartDate: '2026-08-10',
    applicationEndDate: '2026-10-05',
    deadline: '2026-10-05',
    applicationUrl: 'https://www.ncs.gov.in',
    source: 'National Career Service (NCS)',
    sourceType: 'GOVERNMENT_PORTAL',
    status: 'ACTIVE',
    verified: true,
    isMock: true,
    lastVerifiedAt: '2026-09-03',
    createdAt: '2026-08-10T09:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z'
  },
  {
    id: 'EMP-2026-004',
    title: 'Pradhan Mantri Kaushal Vikas Yojana (PMKVY 4.0) - Drone Technology & AI Operations',
    organization: 'National Skill Development Corporation (NSDC)',
    department: 'Ministry of Skill Development and Entrepreneurship',
    category: 'Skill Development',
    opportunityType: 'TRAINING',
    description: 'Government-sponsored industry training on agricultural drone maintenance, geo-spatial mapping, and AI sensor calibration.',
    eligibility: '10th / 12th / ITI Passouts with keen interest in emerging robotics and spatial tech.',
    qualification: '10th Pass',
    skills: ['Drone Assembly', 'Flight Control', 'Sensor Calibration', 'GIS Basics'],
    location: 'State Skill Development Centres (Hybrid/Offline)',
    vacancies: 500,
    salary: 'Free Certification + ₹8,000 Toolkit Stipend',
    applicationStartDate: '2026-08-01',
    applicationEndDate: '2026-10-15',
    deadline: '2026-10-15',
    applicationUrl: 'https://www.myscheme.gov.in',
    source: 'National Skill Development Portal',
    sourceType: 'GOVERNMENT_PORTAL',
    status: 'ACTIVE',
    verified: true,
    isMock: true,
    lastVerifiedAt: '2026-09-03',
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z'
  },
  {
    id: 'EMP-2026-005',
    title: 'Mahatma Gandhi National Rural Employment Guarantee Scheme (MGNREGS) Work Allocation',
    organization: 'Ministry of Rural Development',
    department: 'Department of Rural Development',
    category: 'Employment Schemes',
    opportunityType: 'SCHEME',
    description: 'Statutory 100 days of guaranteed wage employment in every financial year to every rural household whose adult members volunteer for unskilled manual work.',
    eligibility: 'Adult members of rural households holding verified Job Cards.',
    qualification: 'None (Unskilled/Semi-Skilled)',
    skills: ['Water Conservation', 'Rural Infrastructure', 'Afforestation', 'Land Levelling'],
    location: 'Gram Panchayat Jurisdictions Nationwide',
    vacancies: 10000,
    salary: 'State Daily Wage Rate (₹240 - ₹374 / day)',
    applicationStartDate: '2026-04-01',
    applicationEndDate: '2027-03-31',
    deadline: '2027-03-31',
    applicationUrl: 'https://www.myscheme.gov.in',
    source: 'Ministry of Rural Development Portal',
    sourceType: 'GOVERNMENT_PORTAL',
    status: 'ACTIVE',
    verified: true,
    isMock: true,
    lastVerifiedAt: '2026-09-03',
    createdAt: '2026-04-01T09:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z'
  }
];

// 12. User Saved Opportunities Map (userId -> Set<opportunityId>)
export const savedOpportunities = new Map();

// 13. Scholarships Store (Phase 17 Foundation)
// MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION
export const SCHOLARSHIPS = [
  {
    id: 'SCH-2026-001',
    name: 'National Means-cum-Merit Scholarship Scheme (NMMSS)',
    title: 'National Means-cum-Merit Scholarship Scheme (NMMSS)',
    provider: 'Ministry of Education',
    ministry: 'Ministry of Education',
    department: 'Department of School Education & Literacy',
    category: 'Need-based / School Education',
    description: 'Centrally sponsored scheme providing scholarships to meritorious students of economically weaker sections to arrest their drop out at class VIII and encourage them to continue study at secondary stage.',
    eligibility: 'Class 9th to 12th students with parental income ≤ ₹3,50,000 per annum and min 55% marks in Class 7 exam.',
    qualification: 'Class 8 / 9',
    incomeCriteria: 'Parental income ≤ ₹3,50,000 per annum',
    benefit: '₹12,000 per annum',
    benefitAmount: '₹12,000 per annum',
    requiredDocuments: [
      'Income Certificate',
      'Class 7 / 8 Marksheet',
      'Aadhaar Card',
      'Bank Account Passbook'
    ],
    applicationStartDate: '2026-08-01',
    applicationEndDate: '2026-09-30',
    deadline: '2026-09-30',
    applicationUrl: 'https://scholarships.gov.in',
    relatedServiceId: 'SRV-EDU-001',
    source: 'National Scholarship Portal',
    sourceType: 'GOVERNMENT_PORTAL',
    status: 'ACTIVE',
    verified: true,
    isMock: true,
    lastVerifiedAt: '2026-09-03',
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z'
  },
  {
    id: 'SCH-2026-002',
    name: 'Central Sector Scheme of Scholarships for College and University Students',
    title: 'Central Sector Scheme of Scholarships for College and University Students',
    provider: 'Department of Higher Education',
    ministry: 'Department of Higher Education',
    department: 'Department of Higher Education',
    category: 'Merit-based / Higher Education',
    description: 'Financial assistance to meritorious students from low-income families to meet day-to-day expenses while pursuing higher studies in colleges and universities.',
    eligibility: 'Students scoring above the 80th percentile in relevant stream in Class 12 board exams; family income < ₹4,50,000 per annum.',
    qualification: 'Graduate / Class 12 Passed',
    incomeCriteria: 'Family income < ₹4,50,000 per annum',
    benefit: '₹12,000 - ₹20,000 per annum',
    benefitAmount: '₹12,000 - ₹20,000 per annum',
    requiredDocuments: [
      'Class 12 Board Marksheet',
      'Income Certificate',
      'College Admission ID Card',
      'Bank Account Passbook'
    ],
    applicationStartDate: '2026-08-15',
    applicationEndDate: '2026-10-15',
    deadline: '2026-10-15',
    applicationUrl: 'https://scholarships.gov.in',
    relatedServiceId: 'SRV-EDU-007',
    source: 'National Scholarship Portal',
    sourceType: 'GOVERNMENT_PORTAL',
    status: 'ACTIVE',
    verified: true,
    isMock: true,
    lastVerifiedAt: '2026-09-03',
    createdAt: '2026-08-15T09:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z'
  },
  {
    id: 'SCH-2026-003',
    name: 'Pragati Scholarship Scheme for Girl Students (Technical Degree)',
    title: 'Pragati Scholarship Scheme for Girl Students (Technical Degree)',
    provider: 'All India Council for Technical Education (AICTE)',
    ministry: 'AICTE',
    department: 'Ministry of Education',
    category: 'Girls Empowerment / Technical Education',
    description: 'Scheme aimed at providing assistance for advancement of girls pursuing technical education with tuition assistance and annual contingency.',
    eligibility: 'Girl students admitted to 1st year degree program; maximum 2 girls per family; family income < ₹8,00,000 per annum.',
    qualification: 'Technical Undergraduate Degree (B.Tech / B.E.)',
    incomeCriteria: 'Family income < ₹8,00,000 per annum',
    benefit: '₹50,000 per annum for tuition & contingency',
    benefitAmount: '₹50,000 per annum for tuition & contingency',
    requiredDocuments: [
      'College Admission Letter',
      'Income Certificate',
      'Aadhaar Card',
      'Family Ration Card'
    ],
    applicationStartDate: '2026-08-20',
    applicationEndDate: '2026-10-31',
    deadline: '2026-10-31',
    applicationUrl: 'https://scholarships.gov.in',
    relatedServiceId: 'SRV-EDU-001',
    source: 'National Scholarship Portal',
    sourceType: 'GOVERNMENT_PORTAL',
    status: 'ACTIVE',
    verified: true,
    isMock: true,
    lastVerifiedAt: '2026-09-03',
    createdAt: '2026-08-20T09:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z'
  }
];

// 14. Government Schemes Store (Phase 17 Foundation)
// MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION
export const GOVERNMENT_SCHEMES = [
  {
    id: 'SCHEME-2026-001',
    name: 'Pradhan Mantri Kaushal Vikas Yojana 4.0 (PMKVY)',
    title: 'Pradhan Mantri Kaushal Vikas Yojana 4.0 (PMKVY)',
    department: 'Ministry of Skill Development & Entrepreneurship',
    category: 'Skill Development',
    description: 'Flagship scheme for skill training of youth across emerging sectors including Industry 4.0, drones, AI, and green energy.',
    purpose: 'To enable Indian youth to take up industry-relevant skill training that will help them in securing a better livelihood.',
    eligibility: 'Unemployed youth or school/college dropouts aged 15-45 holding valid Aadhaar.',
    benefits: 'Free industry-aligned certification, soft skills training, toolkit stipend, and placement support',
    targetAudience: 'Unemployed youth, school/college dropouts (Ages 15-45)',
    requiredDocuments: [
      'Aadhaar Card',
      'Educational Certificate / School Leaving Proof',
      'Bank Account Details'
    ],
    applicationProcess: 'Online via Skill India Digital platform or physical registration at Pradhan Mantri Kaushal Kendra (PMKK).',
    applicationUrl: 'https://www.myscheme.gov.in',
    source: 'myScheme Portal',
    sourceType: 'GOVERNMENT_PORTAL',
    status: 'ACTIVE',
    verified: true,
    isMock: true,
    lastVerifiedAt: '2026-09-03',
    createdAt: '2026-07-01T09:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z'
  },
  {
    id: 'SCHEME-2026-002',
    name: 'PM SVANidhi (Micro-Credit for Street Vendors)',
    title: 'PM SVANidhi (Micro-Credit for Street Vendors)',
    department: 'Ministry of Housing and Urban Affairs',
    category: 'Financial Inclusion',
    description: 'Special micro-credit facility providing affordable working capital loans to street vendors to resume their livelihoods.',
    purpose: 'To facilitate collateral-free working capital loans with interest subsidies and digital transaction incentives.',
    eligibility: 'Urban and peri-urban street vendors possessing Certificate of Vending or Identity Card issued by Urban Local Bodies.',
    benefits: 'Collateral-free working capital loan up to ₹50,000 with 7% interest subsidy and digital cashback',
    targetAudience: 'Urban and peri-urban street vendors',
    requiredDocuments: [
      'Vending Certificate / Letter of Recommendation from ULB',
      'Aadhaar Card',
      'Bank Account Passbook'
    ],
    applicationProcess: 'Direct application through PM SVANidhi Portal or via designated Common Service Centres (CSC).',
    applicationUrl: 'https://www.myscheme.gov.in',
    source: 'myScheme Portal',
    sourceType: 'GOVERNMENT_PORTAL',
    status: 'ACTIVE',
    verified: true,
    isMock: true,
    lastVerifiedAt: '2026-09-03',
    createdAt: '2026-07-15T09:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z'
  },
  {
    id: 'SCHEME-2026-003',
    name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    department: 'Ministry of Agriculture & Farmers Welfare',
    category: 'Agriculture',
    description: 'Actuarial yield and weather-based insurance scheme providing comprehensive financial support to farmers suffering crop loss/damage.',
    purpose: 'To stabilize the income of farmers to ensure their continuance in farming and encourage adoption of modern practices.',
    eligibility: 'All farmers growing notified crops in notified areas including sharecroppers and tenant farmers.',
    benefits: 'Comprehensive crop insurance against non-preventable natural risks with premium capped at 1.5% to 2%',
    targetAudience: 'Farmers growing notified crops in notified areas',
    requiredDocuments: [
      'Land Record (Khasra/Khatauni/ROR)',
      'Sowing Certificate / Crop Declaration',
      'Aadhaar Card',
      'Bank Account Passbook'
    ],
    applicationProcess: 'Online through National Crop Insurance Portal or via financial institutions / PACS / CSC.',
    applicationUrl: 'https://www.myscheme.gov.in',
    relatedServiceId: 'SRV-AGR-005',
    source: 'myScheme Portal',
    sourceType: 'GOVERNMENT_PORTAL',
    status: 'ACTIVE',
    verified: true,
    isMock: true,
    lastVerifiedAt: '2026-09-03',
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z'
  }
];

// 15. News & Announcements Store (Phase 17 Foundation)
// MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION
export const ANNOUNCEMENTS = [
  {
    id: 'NEWS-2026-001',
    title: 'Ministry of Education extends deadline for Central Sector Scholarships to Oct 15',
    summary: 'Eligible undergraduate students can now submit their verified online applications via the unified portal until October 15, 2026.',
    content: 'The Department of Higher Education has officially extended the deadline for both fresh and renewal applications under the Central Sector Scheme of Scholarships for College and University Students. Verification windows for participating institutions have been extended synchronously.',
    department: 'Ministry of Education',
    category: 'Deadlines',
    publishedAt: '2026-09-02',
    expiryDate: '2026-10-15',
    source: 'Press Information Bureau (PIB)',
    sourceType: 'GOVERNMENT_PORTAL',
    sourceUrl: 'https://pib.gov.in',
    officialReference: 'PIB-PR-2026-EDU-9912',
    status: 'PUBLISHED',
    verified: true,
    isMock: true,
    lastVerifiedAt: '2026-09-03',
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z'
  },
  {
    id: 'NEWS-2026-002',
    title: 'Interoperable Data Exchange Standard v1.2 implemented across 4 central ministries',
    summary: 'New secure gateway reduces citizen document submission burden by cross-validating records automatically between Revenue and Education databases.',
    content: 'The National e-Governance Division (NeGD) has certified compliance with Inter-Department Data Exchange Specifications v1.2. The system guarantees end-to-end payload sanitization and eliminates redundant physical paper submissions.',
    department: 'Ministry of Electronics and IT',
    category: 'Service Updates',
    publishedAt: '2026-08-30',
    expiryDate: '2026-12-31',
    source: 'Press Information Bureau (PIB)',
    sourceType: 'GOVERNMENT_PORTAL',
    sourceUrl: 'https://pib.gov.in',
    officialReference: 'PIB-PR-2026-MEITY-4410',
    status: 'PUBLISHED',
    verified: true,
    isMock: true,
    lastVerifiedAt: '2026-09-03',
    createdAt: '2026-08-30T14:30:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z'
  },
  {
    id: 'NEWS-2026-003',
    title: 'Special recruitment drive for 10,000 apprentice positions announced under NCS',
    summary: 'Government undertakings and recognized private partners open registrations for technical apprentices with monthly stipend guarantee.',
    content: 'The Ministry of Labour & Employment has unveiled opportunities across 28 states and union territories for ITI, diploma, and engineering degree graduates under the National Apprenticeship Promotion Scheme (NAPS).',
    department: 'Ministry of Labour & Employment',
    category: 'Employment',
    publishedAt: '2026-08-25',
    expiryDate: '2026-10-31',
    source: 'Press Information Bureau (PIB)',
    sourceType: 'GOVERNMENT_PORTAL',
    sourceUrl: 'https://pib.gov.in',
    officialReference: 'PIB-PR-2026-MOLE-1102',
    status: 'PUBLISHED',
    verified: true,
    isMock: true,
    lastVerifiedAt: '2026-09-03',
    createdAt: '2026-08-25T11:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z'
  }
];

// 16. User Saved Content Map (userId -> Set<type:id>)
export const savedHubItems = new Map();

// Helper database functions
export const db = {
  findUserByEmail(email) {
    return users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  },

  findUserById(id) {
    return users.find(u => u.id === id);
  },

  getUsersByRole(role) {
    return users.filter(u => u.role === role);
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
      currentStage: status === 'SUBMITTED' ? 'Smart Orchestration / Inter-Department Verification' : 'Draft in Progress',
      amount: formData.amount || service.fee || 'N/A',
      orchestrationId: null
    };

    if (newApp.status === 'SUBMITTED') {
      const orch = this.createOrchestration({
        applicationId: newApp.id,
        applicantId: newApp.applicantId,
        serviceId: newApp.serviceId,
        formData: newApp.formData
      });
      newApp.orchestrationId = orch.id;
    }

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
        app.currentStage = 'Smart Orchestration / Inter-Department Verification';
        if (!app.orchestrationId) {
          const orch = this.createOrchestration({
            applicationId: app.id,
            applicantId: app.applicantId,
            serviceId: app.serviceId,
            formData: app.formData
          });
          app.orchestrationId = orch.id;
        }
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

  // Orchestration Methods (Phase 6)
  createOrchestration({ applicationId, applicantId, serviceId, formData = {} }) {
    const service = this.getServiceById(serviceId);
    if (!service) {
      throw new Error(`Service not found with ID: ${serviceId}`);
    }

    const tasks = planWorkflow(service, formData);
    const id = `ORCH-2026-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();

    const orchestration = {
      id,
      applicationId,
      applicantId,
      serviceId: service.id,
      serviceName: service.title,
      department: service.department,
      departmentCode: service.departmentCode,
      tasks,
      status: 'CREATED',
      retryCount: 0,
      error: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null
    };

    orchestrations.push(orchestration);
    return orchestration;
  },

  getOrchestrationById(id) {
    if (!id) return null;
    return orchestrations.find(o => o.id.toLowerCase() === id.toLowerCase().trim()) || null;
  },

  getOrchestrationByApplicationId(applicationId) {
    if (!applicationId) return null;
    return orchestrations.find(o => o.applicationId.toLowerCase() === applicationId.toLowerCase().trim()) || null;
  },

  getCitizenOrchestrations(applicantId) {
    if (!applicantId) return [];
    return orchestrations.filter(o => o.applicantId === applicantId);
  },

  getDepartmentalOrchestrations(departmentCode) {
    if (!departmentCode) return [];
    return orchestrations.filter(o => o.departmentCode === departmentCode);
  },

  getAllOrchestrations() {
    return orchestrations;
  },

  updateOrchestration(id, updates = {}) {
    const orch = this.getOrchestrationById(id);
    if (!orch) {
      throw new Error(`Orchestration not found with ID: ${id}`);
    }

    Object.assign(orch, updates, { updatedAt: new Date().toISOString() });
    return orch;
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
  },

  // --- Digital Document Vault Methods (Phase 13) ---
  getVaultDocuments(citizenId, filters = {}) {
    let docs = vaultDocuments.filter(d => d.citizenId === citizenId && d.documentStatus !== 'DELETED');

    if (filters.type && filters.type !== 'ALL') {
      docs = docs.filter(d => d.documentType === filters.type);
    }
    if (filters.status && filters.status !== 'ALL') {
      docs = docs.filter(d => d.documentStatus === filters.status);
    }
    if (filters.search) {
      const q = String(filters.search).toLowerCase().trim();
      docs = docs.filter(d => 
        (d.documentName && d.documentName.toLowerCase().includes(q)) ||
        (d.fileName && d.fileName.toLowerCase().includes(q)) ||
        (d.id && d.id.toLowerCase().includes(q))
      );
    }

    return docs;
  },

  getVaultDocumentById(id) {
    if (!id) return null;
    return vaultDocuments.find(d => d.id === id) || null;
  },

  createVaultDocument(docData) {
    const newDoc = {
      ...docData,
      version: docData.version || 1,
      applications: Array.isArray(docData.applications) ? [...docData.applications] : [],
      documentStatus: docData.documentStatus || 'ACTIVE',
      uploadedAt: docData.uploadedAt || new Date().toISOString(),
      updatedAt: docData.updatedAt || new Date().toISOString()
    };
    vaultDocuments.push(newDoc);
    return newDoc;
  },

  updateVaultDocument(id, updates = {}) {
    const doc = this.getVaultDocumentById(id);
    if (!doc) return null;
    Object.assign(doc, updates, { updatedAt: new Date().toISOString() });
    return doc;
  },

  deleteVaultDocument(id) {
    const doc = this.getVaultDocumentById(id);
    if (!doc) return false;
    doc.documentStatus = 'DELETED';
    doc.updatedAt = new Date().toISOString();
    return true;
  },

  recordVaultAudit(entry) {
    const log = {
      id: `VAUD-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    vaultAuditLogs.unshift(log);
    return log;
  },

  getVaultAuditLogs(filter = {}) {
    let logs = [...vaultAuditLogs];
    if (filter.documentId) {
      logs = logs.filter(l => l.documentId === filter.documentId);
    }
    if (filter.citizenId) {
      logs = logs.filter(l => l.citizenId === filter.citizenId);
    }
    if (filter.limit) {
      logs = logs.slice(0, filter.limit);
    }
    return logs;
  },

  // --- Notification System Methods (Phase 14) ---
  getNotifications(recipientUserId, filters = {}) {
    let list = notifications.filter(n => n.recipientUserId === recipientUserId && n.status !== 'ARCHIVED');
    if (filters.status && filters.status !== 'ALL') {
      list = list.filter(n => n.status === filters.status);
    }
    if (filters.type && filters.type !== 'ALL') {
      list = list.filter(n => n.type === filters.type);
    }
    return list;
  },

  getUnreadNotificationsCount(recipientUserId) {
    return notifications.filter(n => n.recipientUserId === recipientUserId && n.status === 'UNREAD').length;
  },

  getNotificationById(id) {
    if (!id) return null;
    return notifications.find(n => n.id === id) || null;
  },

  markNotificationAsRead(id, userId) {
    const notif = this.getNotificationById(id);
    if (!notif) return null;
    notif.status = 'READ';
    notif.readAt = new Date().toISOString();
    return notif;
  },

  markAllNotificationsAsRead(recipientUserId) {
    let updated = 0;
    const now = new Date().toISOString();
    for (const notif of notifications) {
      if (notif.recipientUserId === recipientUserId && notif.status === 'UNREAD') {
        notif.status = 'READ';
        notif.readAt = now;
        updated++;
      }
    }
    return updated;
  },

  getNotificationPreferences(userId) {
    if (notificationPreferences.has(userId)) {
      return notificationPreferences.get(userId);
    }
    const defaultPrefs = {
      inAppEnabled: true,
      emailEnabled: true,
      smsEnabled: false
    };
    notificationPreferences.set(userId, defaultPrefs);
    return defaultPrefs;
  },

  updateNotificationPreferences(userId, prefs = {}) {
    const current = this.getNotificationPreferences(userId);
    const updated = { ...current, ...prefs };
    notificationPreferences.set(userId, updated);
    return updated;
  },

  getEmploymentOpportunities(filters = {}) {
    let list = [...EMPLOYMENT_OPPORTUNITIES];

    if (filters.status && filters.status !== 'ALL') {
      const st = filters.status.toUpperCase();
      list = list.filter(o => o.status === st);
    } else if (!filters.status) {
      list = list.filter(o => o.status === 'ACTIVE');
    }

    if (filters.category && filters.category !== 'ALL') {
      const cat = filters.category.toLowerCase();
      list = list.filter(o => o.category.toLowerCase() === cat);
    }

    if (filters.opportunityType && filters.opportunityType !== 'ALL') {
      const tp = filters.opportunityType.toUpperCase();
      list = list.filter(o => o.opportunityType === tp);
    }

    if (filters.qualification && filters.qualification !== 'ALL') {
      const q = filters.qualification.toLowerCase();
      list = list.filter(o => o.qualification.toLowerCase().includes(q));
    }

    if (filters.search) {
      const s = filters.search.toLowerCase().trim();
      list = list.filter(o => 
        o.title.toLowerCase().includes(s) ||
        o.organization.toLowerCase().includes(s) ||
        o.department.toLowerCase().includes(s) ||
        o.description.toLowerCase().includes(s) ||
        (o.skills || []).some(sk => sk.toLowerCase().includes(s))
      );
    }

    if (filters.closingSoon) {
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      list = list.filter(o => {
        if (!o.deadline) return false;
        const d = new Date(o.deadline).getTime();
        return d > now && (d - now) <= sevenDays;
      });
    }

    if (filters.sort === 'deadline') {
      list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const limit = Math.min(parseInt(filters.limit || '50', 10), 100);
    const offset = Math.max(parseInt(filters.offset || '0', 10), 0);
    const paged = list.slice(offset, offset + limit);

    return {
      total: list.length,
      limit,
      offset,
      opportunities: paged
    };
  },

  getEmploymentOpportunityById(id) {
    return EMPLOYMENT_OPPORTUNITIES.find(o => o.id === id);
  },

  createEmploymentOpportunity(data) {
    const newId = `EMP-2026-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();
    const opportunity = {
      id: newId,
      title: data.title,
      organization: data.organization,
      department: data.department || 'Central/State Government',
      category: data.category || 'Government Jobs',
      opportunityType: data.opportunityType || 'JOB',
      description: data.description || '',
      eligibility: data.eligibility || 'As per official advertisement',
      qualification: data.qualification || 'Graduate',
      skills: Array.isArray(data.skills) ? data.skills : [],
      location: data.location || 'All India',
      vacancies: Number(data.vacancies) || 1,
      salary: data.salary || 'As per rules',
      applicationStartDate: data.applicationStartDate || now.slice(0, 10),
      applicationEndDate: data.applicationEndDate || data.deadline,
      deadline: data.deadline,
      applicationUrl: data.applicationUrl || 'https://www.ncs.gov.in',
      source: data.source || 'National Career Service (NCS)',
      sourceType: data.sourceType || 'GOVERNMENT_PORTAL',
      status: data.status || 'ACTIVE',
      verified: true,
      isMock: data.isMock !== undefined ? data.isMock : true,
      lastVerifiedAt: now.slice(0, 10),
      createdAt: now,
      updatedAt: now
    };
    EMPLOYMENT_OPPORTUNITIES.unshift(opportunity);
    return opportunity;
  },

  updateEmploymentOpportunity(id, updates) {
    const opp = this.getEmploymentOpportunityById(id);
    if (!opp) return null;
    Object.assign(opp, updates, { updatedAt: new Date().toISOString() });
    return opp;
  },

  deleteEmploymentOpportunity(id) {
    const index = EMPLOYMENT_OPPORTUNITIES.findIndex(o => o.id === id);
    if (index === -1) return false;
    EMPLOYMENT_OPPORTUNITIES[index].status = 'INACTIVE';
    EMPLOYMENT_OPPORTUNITIES[index].updatedAt = new Date().toISOString();
    return true;
  },

  saveUserOpportunity(userId, oppId) {
    if (!savedOpportunities.has(userId)) {
      savedOpportunities.set(userId, new Set());
    }
    savedOpportunities.get(userId).add(oppId);
    return true;
  },

  removeUserOpportunity(userId, oppId) {
    if (!savedOpportunities.has(userId)) return false;
    return savedOpportunities.get(userId).delete(oppId);
  },

  getUserSavedOpportunities(userId) {
    const oppIds = savedOpportunities.get(userId) || new Set();
    return EMPLOYMENT_OPPORTUNITIES.filter(o => oppIds.has(o.id));
  },

  // ----------------------------------------------------
  // Phase 17 — Scholarships, Schemes & Announcements Helpers
  // ----------------------------------------------------
  getScholarships(filters = {}) {
    let list = [...SCHOLARSHIPS];

    if (filters.status && filters.status !== 'ALL') {
      const st = filters.status.toUpperCase();
      list = list.filter(s => s.status === st);
    } else if (!filters.status) {
      list = list.filter(s => s.status === 'ACTIVE');
    }

    if (filters.category && filters.category !== 'ALL') {
      const cat = filters.category.toLowerCase();
      list = list.filter(s => s.category.toLowerCase().includes(cat));
    }

    if (filters.search) {
      const s = filters.search.toLowerCase().trim();
      list = list.filter(item => 
        item.title.toLowerCase().includes(s) ||
        item.ministry.toLowerCase().includes(s) ||
        item.eligibility.toLowerCase().includes(s) ||
        item.description.toLowerCase().includes(s)
      );
    }

    if (filters.closingSoon) {
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      list = list.filter(item => {
        if (!item.deadline) return false;
        const d = new Date(item.deadline).getTime();
        return d > now && (d - now) <= sevenDays;
      });
    }

    if (filters.sort === 'deadline') {
      list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const limit = Math.min(parseInt(filters.limit || '50', 10), 100);
    const offset = Math.max(parseInt(filters.offset || '0', 10), 0);
    const paged = list.slice(offset, offset + limit);

    return {
      total: list.length,
      limit,
      offset,
      scholarships: paged
    };
  },

  getScholarshipById(id) {
    return SCHOLARSHIPS.find(s => s.id === id);
  },

  createScholarship(data) {
    const newId = `SCH-2026-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();
    const sch = {
      id: newId,
      name: data.name || data.title,
      title: data.title || data.name,
      provider: data.provider || data.ministry || 'Ministry of Education',
      ministry: data.ministry || data.provider || 'Ministry of Education',
      department: data.department || 'Central Scholarship Division',
      category: data.category || 'General',
      description: data.description || '',
      eligibility: data.eligibility || 'As per scheme guidelines',
      qualification: data.qualification || 'Graduate',
      incomeCriteria: data.incomeCriteria || '',
      benefit: data.benefit || data.benefitAmount || 'Financial Support',
      benefitAmount: data.benefitAmount || data.benefit || 'Financial Support',
      requiredDocuments: Array.isArray(data.requiredDocuments) ? data.requiredDocuments : ['Income Certificate', 'Aadhaar Card'],
      applicationStartDate: data.applicationStartDate || now.slice(0, 10),
      applicationEndDate: data.applicationEndDate || data.deadline,
      deadline: data.deadline,
      applicationUrl: data.applicationUrl || 'https://scholarships.gov.in',
      relatedServiceId: data.relatedServiceId || null,
      source: data.source || 'National Scholarship Portal',
      sourceType: data.sourceType || 'GOVERNMENT_PORTAL',
      status: data.status || 'ACTIVE',
      verified: true,
      isMock: true,
      lastVerifiedAt: now.slice(0, 10),
      createdAt: now,
      updatedAt: now
    };
    SCHOLARSHIPS.unshift(sch);
    return sch;
  },

  updateScholarship(id, updates) {
    const sch = this.getScholarshipById(id);
    if (!sch) return null;
    Object.assign(sch, updates, { updatedAt: new Date().toISOString() });
    return sch;
  },

  deleteScholarship(id) {
    const idx = SCHOLARSHIPS.findIndex(s => s.id === id);
    if (idx === -1) return false;
    SCHOLARSHIPS[idx].status = 'INACTIVE';
    SCHOLARSHIPS[idx].updatedAt = new Date().toISOString();
    return true;
  },

  getSchemes(filters = {}) {
    let list = [...GOVERNMENT_SCHEMES];

    if (filters.status && filters.status !== 'ALL') {
      const st = filters.status.toUpperCase();
      list = list.filter(s => s.status === st);
    } else if (!filters.status) {
      list = list.filter(s => s.status === 'ACTIVE');
    }

    if (filters.category && filters.category !== 'ALL') {
      const cat = filters.category.toLowerCase();
      list = list.filter(s => s.category.toLowerCase().includes(cat));
    }

    if (filters.department && filters.department !== 'ALL') {
      const dep = filters.department.toLowerCase();
      list = list.filter(s => s.department.toLowerCase().includes(dep));
    }

    if (filters.search) {
      const s = filters.search.toLowerCase().trim();
      list = list.filter(item => 
        item.title.toLowerCase().includes(s) ||
        item.department.toLowerCase().includes(s) ||
        item.benefits.toLowerCase().includes(s) ||
        (item.description && item.description.toLowerCase().includes(s))
      );
    }

    const limit = Math.min(parseInt(filters.limit || '50', 10), 100);
    const offset = Math.max(parseInt(filters.offset || '0', 10), 0);
    const paged = list.slice(offset, offset + limit);

    return {
      total: list.length,
      limit,
      offset,
      schemes: paged
    };
  },

  getSchemeById(id) {
    return GOVERNMENT_SCHEMES.find(s => s.id === id);
  },

  createScheme(data) {
    const newId = `SCHEME-2026-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();
    const sc = {
      id: newId,
      name: data.name || data.title,
      title: data.title || data.name,
      department: data.department || 'Central Ministry',
      category: data.category || 'Welfare Schemes',
      description: data.description || '',
      purpose: data.purpose || data.description || '',
      eligibility: data.eligibility || 'As per official guidelines',
      benefits: data.benefits || '',
      targetAudience: data.targetAudience || 'General Public',
      requiredDocuments: Array.isArray(data.requiredDocuments) ? data.requiredDocuments : ['Aadhaar Card'],
      applicationProcess: data.applicationProcess || 'Online via Portal',
      applicationUrl: data.applicationUrl || 'https://www.myscheme.gov.in',
      relatedServiceId: data.relatedServiceId || null,
      source: data.source || 'myScheme Portal',
      sourceType: data.sourceType || 'GOVERNMENT_PORTAL',
      status: data.status || 'ACTIVE',
      verified: true,
      isMock: true,
      lastVerifiedAt: now.slice(0, 10),
      createdAt: now,
      updatedAt: now
    };
    GOVERNMENT_SCHEMES.unshift(sc);
    return sc;
  },

  updateScheme(id, updates) {
    const sc = this.getSchemeById(id);
    if (!sc) return null;
    Object.assign(sc, updates, { updatedAt: new Date().toISOString() });
    return sc;
  },

  deleteScheme(id) {
    const idx = GOVERNMENT_SCHEMES.findIndex(s => s.id === id);
    if (idx === -1) return false;
    GOVERNMENT_SCHEMES[idx].status = 'INACTIVE';
    GOVERNMENT_SCHEMES[idx].updatedAt = new Date().toISOString();
    return true;
  },

  getAnnouncements(filters = {}) {
    let list = [...ANNOUNCEMENTS];

    if (filters.status && filters.status !== 'ALL') {
      const st = filters.status.toUpperCase();
      list = list.filter(a => a.status === st);
    } else if (!filters.status) {
      list = list.filter(a => a.status === 'PUBLISHED');
    }

    if (filters.category && filters.category !== 'ALL') {
      const cat = filters.category.toLowerCase();
      list = list.filter(a => a.category.toLowerCase().includes(cat));
    }

    if (filters.search) {
      const s = filters.search.toLowerCase().trim();
      list = list.filter(a => 
        a.title.toLowerCase().includes(s) ||
        a.department.toLowerCase().includes(s) ||
        a.summary.toLowerCase().includes(s)
      );
    }

    list.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    const limit = Math.min(parseInt(filters.limit || '50', 10), 100);
    const offset = Math.max(parseInt(filters.offset || '0', 10), 0);
    const paged = list.slice(offset, offset + limit);

    return {
      total: list.length,
      limit,
      offset,
      announcements: paged
    };
  },

  getAnnouncementById(id) {
    return ANNOUNCEMENTS.find(a => a.id === id);
  },

  createAnnouncement(data) {
    const newId = `NEWS-2026-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();
    const ann = {
      id: newId,
      title: data.title,
      summary: data.summary || data.snippet || '',
      snippet: data.summary || data.snippet || '',
      content: data.content || data.summary || '',
      department: data.department || 'Press Information Bureau',
      category: data.category || 'Service Updates',
      publishedAt: data.publishedAt || now.slice(0, 10),
      expiryDate: data.expiryDate || null,
      source: data.source || 'Press Information Bureau (PIB)',
      sourceType: data.sourceType || 'GOVERNMENT_PORTAL',
      sourceUrl: data.sourceUrl || 'https://pib.gov.in',
      officialReference: data.officialReference || `PIB-PR-2026-${newId}`,
      status: data.status || 'PUBLISHED',
      verified: true,
      isMock: true,
      lastVerifiedAt: now.slice(0, 10),
      createdAt: now,
      updatedAt: now
    };
    ANNOUNCEMENTS.unshift(ann);
    return ann;
  },

  updateAnnouncement(id, updates) {
    const ann = this.getAnnouncementById(id);
    if (!ann) return null;
    Object.assign(ann, updates, { updatedAt: new Date().toISOString() });
    return ann;
  },

  deleteAnnouncement(id) {
    const idx = ANNOUNCEMENTS.findIndex(a => a.id === id);
    if (idx === -1) return false;
    ANNOUNCEMENTS[idx].status = 'ARCHIVED';
    ANNOUNCEMENTS[idx].updatedAt = new Date().toISOString();
    return true;
  },

  saveHubItem(userId, type, id) {
    if (!savedHubItems.has(userId)) {
      savedHubItems.set(userId, new Set());
    }
    const key = `${type}:${id}`;
    savedHubItems.get(userId).add(key);
    return true;
  },

  removeHubItem(userId, type, id) {
    if (!savedHubItems.has(userId)) return false;
    const key = `${type}:${id}`;
    return savedHubItems.get(userId).delete(key);
  },

  getUserSavedHubItems(userId, type) {
    const keys = savedHubItems.get(userId) || new Set();
    const prefix = `${type}:`;
    const ids = [];
    for (const k of keys) {
      if (k.startsWith(prefix)) {
        ids.push(k.slice(prefix.length));
      }
    }
    if (type === 'scholarship') {
      return SCHOLARSHIPS.filter(s => ids.includes(s.id));
    }
    if (type === 'scheme') {
      return GOVERNMENT_SCHEMES.filter(sc => ids.includes(sc.id));
    }
    return [];
  }
};

db.notifications = notifications;
db.notificationPreferences = notificationPreferences;
db.vaultDocuments = vaultDocuments;
db.vaultAuditLogs = vaultAuditLogs;
db.employmentOpportunities = EMPLOYMENT_OPPORTUNITIES;
db.savedOpportunities = savedOpportunities;
db.scholarships = SCHOLARSHIPS;
db.governmentSchemes = GOVERNMENT_SCHEMES;
db.announcements = ANNOUNCEMENTS;
db.savedHubItems = savedHubItems;

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
