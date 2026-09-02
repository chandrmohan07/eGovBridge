/**
 * SIH Government Service Integration Platform — Central Client Store & Data Models
 * Single client-side data state for all Phase 2 UI dashboard sections.
 */

export const store = {
  activeTab: 'dashboard',
  searchQuery: '',
  selectedCategory: 'all',
  selectedDepartment: 'all',
  selectedAvailability: 'all',
  activeServiceDetailsId: null,
  activeServiceDetails: null,

  // Authentication & RBAC State (Phase 3)
  token: null,
  isAuthenticated: true,
  currentUser: {
    id: 'USR-CIT-001',
    name: 'Rahul Verma',
    email: 'citizen@example.com',
    role: 'CITIZEN',
    roleTitle: 'Citizen',
    departmentCode: null,
    permissions: ['services:read', 'applications:create', 'applications:read_own', 'vault:read_own'],
    aadhaarMasked: 'XXXX-XXXX-4819',
    phone: '+91 98765 43210',
    kycStatus: 'Verified (DigiLocker Linked)',
    state: 'Maharashtra',
    district: 'Pune'
  },
  authModalOpen: false,
  authModalMode: 'login',
  authError: '',
  authLoading: false,
  officerApplications: [],
  adminUsersList: [],
  adminDepartments: [],

  // Current Citizen Identity
  citizenProfile: {
    id: 'CIT-IN-849204',
    name: 'Rahul Verma',
    aadhaarMasked: 'XXXX-XXXX-4819',
    email: 'citizen@example.com',
    phone: '+91 98765 43210',
    role: 'Citizen',
    kycStatus: 'Verified (DigiLocker Linked)',
    state: 'Maharashtra',
    district: 'Pune',
    joinedDate: '2026-01-15'
  },

  // Dashboard Overview Metrics
  dashboardSummary: {
    activeApplications: 3,
    completedApplications: 8,
    eligibleScholarships: 5,
    vaultDocuments: 12,
    activeGrievances: 1,
    interopHealth: 'Operational'
  },

  // 1. Government Services Catalog (Phase 4 Foundation)
  services: [
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
      integrationStatus: 'Mock Adapter Active',
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
      integrationStatus: 'Mock Adapter Active',
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
      integrationStatus: 'Planned Adapter (Disabled)',
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
      integrationStatus: 'Planned Adapter (Disabled)',
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
      description: 'Income guarantee of ₹6,00,0 per year delivered in three direct installments of ₹2,000 each into linked bank accounts of landholder farmer families.',
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
      integrationStatus: 'Planned Adapter (Disabled)',
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
      integrationStatus: 'Mock Adapter Active',
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
      integrationStatus: 'Mock Adapter Active',
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
      integrationStatus: 'Planned Adapter (Disabled)',
      keywords: ['disability', 'divyangjan', 'udid', 'pension', 'aid', 'welfare', 'social justice', 'handicapped'],
      workflowStages: ['Medical Certificate Cross-Check', 'Social Welfare Officer Sanction', 'Pension Disbursal']
    }
  ],

  // 2. Application Tracking Timeline (Phase 12 Foundation)
  applications: [
    {
      id: 'APP-2026-EDU-8812',
      serviceName: 'Post-Matric Scholarship for Higher Education',
      department: 'Department of Higher Education',
      submittedDate: '2026-08-28',
      lastUpdated: '2026-09-02 14:30 IST',
      currentStatus: 'Smart Orchestration / Cross-Verification',
      statusCode: 'ORCHESTRATING',
      currentStep: 3, // Step 3 of 5
      timeline: [
        { step: 1, name: 'Submitted', date: '2026-08-28 10:15 IST', completed: true, details: 'Application submitted via Unified Form' },
        { step: 2, name: 'Pre-validation', date: '2026-08-29 11:20 IST', completed: true, details: 'Automated schema validation & documents check passed' },
        { step: 3, name: 'Smart Orchestration', date: '2026-09-01 16:45 IST', active: true, details: 'Adapter verifying Income Certificate with Revenue Dept & College Roll with Univ Gateway' },
        { step: 4, name: 'Department Verification', date: 'Pending', completed: false, details: 'Officer review awaiting inter-department verification response' },
        { step: 5, name: 'Approval & Delivery', date: 'Estimated 2026-09-06', completed: false, details: 'Disbursement mandate and digital document issuance' }
      ],
      interopLog: 'Interoperability Request sent to Revenue Adapter (REV-REQ-9012) & Education Adapter (EDU-REQ-3312).'
    },
    {
      id: 'APP-2026-REV-4109',
      serviceName: 'Issuance of Income Certificate',
      department: 'State Revenue Department',
      submittedDate: '2026-08-15',
      lastUpdated: '2026-08-20 09:12 IST',
      currentStatus: 'Approved & Digitally Delivered',
      statusCode: 'APPROVED',
      currentStep: 5,
      timeline: [
        { step: 1, name: 'Submitted', date: '2026-08-15', completed: true },
        { step: 2, name: 'Pre-validation', date: '2026-08-16', completed: true },
        { step: 3, name: 'Smart Orchestration', date: '2026-08-17', completed: true },
        { step: 4, name: 'Department Verification', date: '2026-08-19', completed: true },
        { step: 5, name: 'Approval & Delivery', date: '2026-08-20', completed: true, active: false }
      ],
      interopLog: 'Digital certificate signed and deposited into Digital Document Vault.'
    }
  ],

  // 3. AI Government Help Grounded Knowledge & Conversations (Phase 15 Foundation)
  aiHelpConversation: [
    {
      sender: 'bot',
      text: 'Namaste Rahul! I am your AI Government Service Assistant. I provide verified guidance grounded in official government catalogs. How can I help you today?'
    },
    {
      sender: 'user',
      text: 'How do I apply for the Post-Matric Scholarship, and what documents are required?'
    },
    {
      sender: 'bot',
      text: 'For the **Post-Matric Scholarship for Higher Education (Department of Higher Education)**:\n\n• **Eligibility**: Annual family income must be under ₹2,50,000 with enrollment in a recognized university.\n• **Required Documents**: Income Certificate, Previous Marksheet, College Admission Letter, and Aadhaar Card.\n• **How it works on this platform**: You only need to enter your details once. Our Interoperability Layer automatically fetches and verifies your Income Certificate from the Revenue Department so you don\'t have to visit multiple offices!'
    }
  ],

  // 4. Employment Hub (Phase 16 Foundation)
  employmentListings: [
    {
      id: 'EMP-2026-001',
      title: 'Junior Technical Assistant (IT / Informatics)',
      organization: 'National Informatics Centre (NIC)',
      category: 'Government Jobs',
      eligibility: 'B.Tech/B.E. in Computer Science / IT or MCA with min 60%',
      location: 'New Delhi / Remote Opportunities Available',
      deadline: '2026-09-25',
      vacancies: 45,
      source: 'National Career Service (NCS)',
      sourceUrl: 'https://www.ncs.gov.in',
      verified: true
    },
    {
      id: 'EMP-2026-002',
      title: 'Graduate Apprentice Trainee (Renewable Energy)',
      organization: 'Solar Energy Corporation of India (SECI)',
      category: 'Apprenticeships',
      eligibility: 'Graduates in Electrical / Mechanical / Civil Engineering (Passout 2024-2026)',
      location: 'Multiple State Offices',
      deadline: '2026-09-18',
      vacancies: 120,
      source: 'National Career Service (NCS)',
      sourceUrl: 'https://www.ncs.gov.in',
      verified: true
    },
    {
      id: 'EMP-2026-003',
      title: 'Staff Selection Commission (SSC) Junior Secretariat Assistant',
      organization: 'Staff Selection Commission',
      category: 'Government Jobs',
      eligibility: '12th Standard or equivalent with minimum typing speed of 35 wpm in English',
      location: 'All India Placement',
      deadline: '2026-10-05',
      vacancies: 3400,
      source: 'National Career Service (NCS)',
      sourceUrl: 'https://www.ncs.gov.in',
      verified: true
    }
  ],

  // 5. Scholarships Hub (Phase 17 Foundation)
  scholarshipsListings: [
    {
      id: 'SCH-2026-001',
      title: 'National Means-cum-Merit Scholarship Scheme (NMMSS)',
      ministry: 'Ministry of Education',
      benefitAmount: '₹12,000 per annum',
      eligibility: 'Class 9th to 12th students with parental income ≤ ₹3,50,000 per annum',
      deadline: '2026-09-30',
      source: 'National Scholarship Portal',
      sourceUrl: 'https://scholarships.gov.in',
      verified: true
    },
    {
      id: 'SCH-2026-002',
      title: 'Central Sector Scheme of Scholarships for College and University Students',
      ministry: 'Department of Higher Education',
      benefitAmount: '₹12,000 - ₹20,000 per annum',
      eligibility: 'Students above 80th percentile in Class 12 board exams; family income < ₹4,50,000',
      deadline: '2026-10-15',
      source: 'National Scholarship Portal',
      sourceUrl: 'https://scholarships.gov.in',
      verified: true
    },
    {
      id: 'SCH-2026-003',
      title: 'Pragati Scholarship Scheme for Girl Students (Technical Degree)',
      ministry: 'AICTE',
      benefitAmount: '₹50,000 per annum for tuition & contingency',
      eligibility: 'Girl students admitted to 1st year degree program; max 2 girls per family; income < ₹8,00,000',
      deadline: '2026-10-31',
      source: 'National Scholarship Portal',
      sourceUrl: 'https://scholarships.gov.in',
      verified: true
    }
  ],

  // 6. Government Schemes Hub (Phase 17 Foundation)
  schemesListings: [
    {
      id: 'SCHEME-2026-001',
      title: 'Pradhan Mantri Kaushal Vikas Yojana 4.0 (PMKVY)',
      department: 'Ministry of Skill Development & Entrepreneurship',
      category: 'Skill Development',
      benefits: 'Free industry-aligned certification, soft skills training, and placement support',
      targetAudience: 'Unemployed youth, school/college dropouts (Ages 15-45)',
      source: 'myScheme Portal',
      sourceUrl: 'https://www.myscheme.gov.in',
      verified: true
    },
    {
      id: 'SCHEME-2026-002',
      title: 'PM SVANidhi (Micro-Credit for Street Vendors)',
      department: 'Ministry of Housing and Urban Affairs',
      category: 'Financial Inclusion',
      benefits: 'Collateral-free working capital loan up to ₹50,000 with 7% interest subsidy',
      targetAudience: 'Urban and peri-urban street vendors',
      source: 'myScheme Portal',
      sourceUrl: 'https://www.myscheme.gov.in',
      verified: true
    },
    {
      id: 'SCHEME-2026-003',
      title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
      department: 'Ministry of Agriculture',
      category: 'Agriculture',
      benefits: 'Comprehensive crop insurance against non-preventable natural risks',
      targetAudience: 'Farmers growing notified crops in notified areas',
      source: 'myScheme Portal',
      sourceUrl: 'https://www.myscheme.gov.in',
      verified: true
    }
  ],

  // 7. News & Announcements (Phase 17 Foundation)
  newsListings: [
    {
      id: 'NEWS-2026-001',
      title: 'Ministry of Education extends deadline for Central Sector Scholarships to Oct 15',
      category: 'Deadlines',
      publishedAt: '2026-09-02',
      snippet: 'Eligible undergraduate students can now submit their verified online applications via the unified portal until October 15, 2026.',
      source: 'Press Information Bureau (PIB)',
      sourceUrl: 'https://pib.gov.in',
      verified: true
    },
    {
      id: 'NEWS-2026-002',
      title: 'Interoperable Data Exchange Standard v1.2 implemented across 4 central ministries',
      category: 'Service Updates',
      publishedAt: '2026-08-30',
      snippet: 'New secure gateway reduces citizen document submission burden by cross-validating records automatically between Revenue and Education databases.',
      source: 'Press Information Bureau (PIB)',
      sourceUrl: 'https://pib.gov.in',
      verified: true
    },
    {
      id: 'NEWS-2026-003',
      title: 'Special recruitment drive for 10,000 apprentice positions announced under NCS',
      category: 'Employment',
      publishedAt: '2026-08-25',
      snippet: 'Government undertakings and recognized private partners open registrations for technical apprentices with monthly stipend guarantee.',
      source: 'National Career Service',
      sourceUrl: 'https://www.ncs.gov.in',
      verified: true
    }
  ],

  // 8. Notifications Activity Feed (Phase 14 Foundation)
  notifications: [
    {
      id: 'NOTIF-001',
      title: 'Orchestration In Progress',
      message: 'Your Post-Matric Scholarship application (APP-2026-EDU-8812) has initiated automated Revenue adapter verification.',
      time: '2 hours ago',
      unread: true,
      category: 'Application'
    },
    {
      id: 'NOTIF-002',
      title: 'New Scholarship Matching Your Profile',
      message: 'Central Sector Scheme of Scholarships is now accepting applications. Check eligibility in the Scholarships Hub.',
      time: '1 day ago',
      unread: true,
      category: 'Scholarship'
    },
    {
      id: 'NOTIF-003',
      title: 'Document Verified & Issued',
      message: 'Your Income Certificate has been digitally approved and saved in your Document Vault.',
      time: '3 days ago',
      unread: false,
      category: 'Vault'
    }
  ]
};
