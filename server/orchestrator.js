/**
 * SIH Government Service Integration Platform — Smart Orchestration Engine
 * Intelligently manages multi-department workflow execution, dependencies, retries, and task tracking.
 */

import crypto from 'node:crypto';

// Task Lifecycle States
export const TASK_STATUS = {
  PENDING: 'PENDING',
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
  BLOCKED: 'BLOCKED'
};

// Overall Orchestration Lifecycle States
export const ORCHESTRATION_STATUS = {
  CREATED: 'CREATED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  PARTIALLY_COMPLETED: 'PARTIALLY_COMPLETED',
  FAILED: 'FAILED'
};

export const MAX_TASK_RETRIES = 2;

/**
 * Workflow Task Planner
 * Determines required tasks, dependencies (DAG), and assigned departments for a given service.
 */
export function planWorkflow(service, formData = {}) {
  const serviceCode = (service.code || service.id || '').toUpperCase();
  const category = (service.category || '').toLowerCase();

  let taskTemplates = [];

  if (category.includes('scholarship') || serviceCode.includes('SCHOLARSHIP')) {
    taskTemplates = [
      {
        code: 'TASK_IDENTITY_VERIFY',
        title: 'DigiLocker Citizen Identity Verification',
        department: 'National Informatics Centre / DigiLocker',
        departmentCode: 'DIGILOCKER',
        adapterCode: 'DIGILOCKER_ADAPTER',
        description: 'Verify Aadhaar e-KYC and citizen identity credentials via DigiLocker sandbox.',
        dependencies: []
      },
      {
        code: 'TASK_ACADEMIC_RECORD',
        title: 'University / Board Academic Record Check',
        department: 'Department of Higher Education',
        departmentCode: 'EDUCATION',
        adapterCode: 'EDU_ADAPTER',
        description: 'Verify qualifying marks, enrollment status, and college credentials.',
        dependencies: [] // Independent task! Can run parallel to identity
      },
      {
        code: 'TASK_REVENUE_INCOME_CHECK',
        title: 'Revenue Department Income Cross-Verification',
        department: 'State Revenue & Land Records Department',
        departmentCode: 'REVENUE',
        adapterCode: 'REV_ADAPTER',
        description: 'Cross-verify declared family income certificate against computerized revenue databases.',
        dependencies: ['TASK_IDENTITY_VERIFY'] // Dependent on identity
      },
      {
        code: 'TASK_OFFICER_NODAL_REVIEW',
        title: 'Higher Education Nodal Officer Scrutiny',
        department: 'Department of Higher Education',
        departmentCode: 'EDUCATION',
        adapterCode: 'EDU_ADAPTER',
        description: 'Departmental scrutiny of academic eligibility and verified income quotas.',
        dependencies: ['TASK_ACADEMIC_RECORD', 'TASK_REVENUE_INCOME_CHECK'] // Dependent on both
      },
      {
        code: 'TASK_DISBURSEMENT_SANCTION',
        title: 'Direct Benefit Transfer (DBT) Sanction Order',
        department: 'Public Financial Management System',
        departmentCode: 'FINANCE',
        adapterCode: 'PFMS_ADAPTER',
        description: 'Generate electronic sanction token for bank account scholarship credit.',
        dependencies: ['TASK_OFFICER_NODAL_REVIEW']
      }
    ];
  } else if (category.includes('certificate') || serviceCode.includes('INCOME_CERT') || serviceCode.includes('CASTE_CERT')) {
    taskTemplates = [
      {
        code: 'TASK_IDENTITY_VERIFY',
        title: 'Citizen Identity Verification',
        department: 'UIDAI / DigiLocker Gateway',
        departmentCode: 'DIGILOCKER',
        adapterCode: 'DIGILOCKER_ADAPTER',
        description: 'Aadhaar e-KYC token verification and demographic integrity check.',
        dependencies: []
      },
      {
        code: 'TASK_RESIDENCE_CHECK',
        title: 'Municipal / Electoral Residence Verification',
        department: 'State Urban / Rural Local Bodies',
        departmentCode: 'MUNICIPAL',
        adapterCode: 'MUNICIPAL_ADAPTER',
        description: 'Validate residential address against state electoral/utility registry.',
        dependencies: [] // Independent task
      },
      {
        code: 'TASK_REVENUE_INSPECTION',
        title: 'Taluk Revenue Inspector Field Enquiry',
        department: 'State Revenue & Land Records Department',
        departmentCode: 'REVENUE',
        adapterCode: 'REV_ADAPTER',
        description: 'Field verification of annual earnings and landholding records.',
        dependencies: ['TASK_IDENTITY_VERIFY', 'TASK_RESIDENCE_CHECK']
      },
      {
        code: 'TASK_TEHSILDAR_DIGITAL_SIGN',
        title: 'Tehsildar Digital Signature & Vault Issue',
        department: 'State Revenue & Land Records Department',
        departmentCode: 'REVENUE',
        adapterCode: 'REV_ADAPTER',
        description: 'Issue cryptographic digital signature on formal certificate.',
        dependencies: ['TASK_REVENUE_INSPECTION']
      }
    ];
  } else if (category.includes('health') || serviceCode.includes('HEALTH')) {
    taskTemplates = [
      {
        code: 'TASK_IDENTITY_VERIFY',
        title: 'Beneficiary Identity Verification',
        department: 'UIDAI Gateway',
        departmentCode: 'DIGILOCKER',
        adapterCode: 'DIGILOCKER_ADAPTER',
        description: 'Verify citizen Aadhaar details and mobile linkage.',
        dependencies: []
      },
      {
        code: 'TASK_SECC_ELIGIBILITY',
        title: 'SECC / NFSA Beneficiary Quota Validation',
        department: 'Ministry of Health & Family Welfare',
        departmentCode: 'HEALTH',
        adapterCode: 'HLT_ADAPTER',
        description: 'Verify socio-economic category against PM-JAY national beneficiary database.',
        dependencies: ['TASK_IDENTITY_VERIFY']
      },
      {
        code: 'TASK_GOLDEN_CARD_ISSUE',
        title: 'Ayushman Golden e-Card Generation',
        department: 'National Health Authority',
        departmentCode: 'HEALTH',
        adapterCode: 'HLT_ADAPTER',
        description: 'Generate cashless insurance policy card and link to hospital network.',
        dependencies: ['TASK_SECC_ELIGIBILITY']
      }
    ];
  } else {
    // Standard Canonical 3-stage Workflow
    taskTemplates = [
      {
        code: 'TASK_IDENTITY_VERIFY',
        title: 'Identity Verification & Validation',
        department: 'Citizen Identity Gateway',
        departmentCode: 'DIGILOCKER',
        adapterCode: 'DIGILOCKER_ADAPTER',
        description: 'Verify applicant identity and authenticity of submitted credentials.',
        dependencies: []
      },
      {
        code: 'TASK_DEPT_VERIFICATION',
        title: `${service.department} Scrutiny`,
        department: service.department,
        departmentCode: service.departmentCode,
        adapterCode: service.adapterCode || 'CANONICAL_ADAPTER',
        description: `Departmental evaluation of criteria for ${service.title}.`,
        dependencies: ['TASK_IDENTITY_VERIFY']
      },
      {
        code: 'TASK_FINAL_DISPOSITION',
        title: 'Service Fulfillment & Certification',
        department: service.department,
        departmentCode: service.departmentCode,
        adapterCode: service.adapterCode || 'CANONICAL_ADAPTER',
        description: 'Final issuance of approved service or digital certificate.',
        dependencies: ['TASK_DEPT_VERIFICATION']
      }
    ];
  }

  // Instantiate task objects with initial status
  return taskTemplates.map((tmpl, index) => ({
    id: `TSK-${String(index + 1).padStart(2, '0')}-${tmpl.code}`,
    code: tmpl.code,
    title: tmpl.title,
    department: tmpl.department,
    departmentCode: tmpl.departmentCode,
    adapterCode: tmpl.adapterCode,
    description: tmpl.description,
    dependencies: [...tmpl.dependencies],
    status: tmpl.dependencies.length === 0 ? TASK_STATUS.READY : TASK_STATUS.PENDING,
    retryCount: 0,
    maxRetries: MAX_TASK_RETRIES,
    error: null,
    startedAt: null,
    completedAt: null,
    output: null
  }));
}

/**
 * Task Sandbox Executor
 * Simulates deterministic execution of a service/department task.
 */
export async function executeTask(task, context = {}) {
  task.status = TASK_STATUS.IN_PROGRESS;
  task.startedAt = new Date().toISOString();

  // Simulated execution delay (10-30ms)
  await new Promise(r => setTimeout(r, 20));

  // Check for intentional failure trigger in context for testing
  const shouldFail = context.simulateFailureTask === task.code || 
                     (context.simulateFailure && context.failedTaskCodes && context.failedTaskCodes.includes(task.code));

  if (shouldFail) {
    task.retryCount += 1;
    task.error = context.failureReason || `Simulated departmental outage or validation rejection in ${task.department}`;
    if (task.retryCount <= task.maxRetries) {
      task.status = TASK_STATUS.RETRYING;
    } else {
      task.status = TASK_STATUS.FAILED;
    }
    return { success: false, task };
  }

  // Successful execution
  task.status = TASK_STATUS.COMPLETED;
  task.completedAt = new Date().toISOString();
  task.error = null;
  task.output = {
    verifiedBy: task.adapterCode,
    referenceId: `REF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    timestamp: task.completedAt,
    verdict: 'APPROVED'
  };

  return { success: true, task };
}

/**
 * Evaluate DAG Dependency State
 * Updates task statuses based on completed/failed prerequisites.
 */
export function updateTaskDependencies(tasks) {
  const completedCodes = new Set(
    tasks.filter(t => t.status === TASK_STATUS.COMPLETED).map(t => t.code)
  );
  const failedCodes = new Set(
    tasks.filter(t => t.status === TASK_STATUS.FAILED || t.status === TASK_STATUS.BLOCKED).map(t => t.code)
  );

  for (const task of tasks) {
    // If already finished or running, keep status
    if (task.status === TASK_STATUS.COMPLETED || task.status === TASK_STATUS.IN_PROGRESS || task.status === TASK_STATUS.FAILED) {
      continue;
    }

    // Check if any prerequisite failed -> mark as BLOCKED
    const hasFailedPrereq = task.dependencies.some(depCode => failedCodes.has(depCode));
    if (hasFailedPrereq) {
      task.status = TASK_STATUS.BLOCKED;
      task.error = `Blocked because prerequisite task (${task.dependencies.join(', ')}) failed or is blocked.`;
      continue;
    }

    // Check if all prerequisites are completed -> mark as READY
    const allPrereqsMet = task.dependencies.every(depCode => completedCodes.has(depCode));
    if (allPrereqsMet && task.status === TASK_STATUS.PENDING) {
      task.status = TASK_STATUS.READY;
    }
  }

  return tasks;
}

/**
 * Calculate Overall Orchestration Status
 */
export function computeOrchestrationStatus(tasks) {
  const allCompleted = tasks.every(t => t.status === TASK_STATUS.COMPLETED);
  if (allCompleted) return ORCHESTRATION_STATUS.COMPLETED;

  const anyInProgress = tasks.some(t => t.status === TASK_STATUS.IN_PROGRESS || t.status === TASK_STATUS.RETRYING);
  if (anyInProgress) return ORCHESTRATION_STATUS.RUNNING;

  const hasFailed = tasks.some(t => t.status === TASK_STATUS.FAILED);
  const hasCompleted = tasks.some(t => t.status === TASK_STATUS.COMPLETED);

  if (hasFailed) {
    return hasCompleted ? ORCHESTRATION_STATUS.PARTIALLY_COMPLETED : ORCHESTRATION_STATUS.FAILED;
  }

  const anyReady = tasks.some(t => t.status === TASK_STATUS.READY);
  if (anyReady) return ORCHESTRATION_STATUS.RUNNING;

  return ORCHESTRATION_STATUS.CREATED;
}

/**
 * Orchestrator Step / Runner
 * Executes ready tasks in dependency order.
 */
export async function stepOrchestration(orchestration, { maxSteps = 10, context = {} } = {}) {
  orchestration.status = ORCHESTRATION_STATUS.RUNNING;
  orchestration.updatedAt = new Date().toISOString();

  let stepsTaken = 0;

  while (stepsTaken < maxSteps) {
    updateTaskDependencies(orchestration.tasks);

    // Find tasks that are READY to execute
    const readyTasks = orchestration.tasks.filter(t => t.status === TASK_STATUS.READY);
    if (readyTasks.length === 0) {
      break; // No more tasks can run right now
    }

    // Execute first ready task
    const taskToRun = readyTasks[0];
    await executeTask(taskToRun, context);
    stepsTaken++;

    updateTaskDependencies(orchestration.tasks);
  }

  orchestration.status = computeOrchestrationStatus(orchestration.tasks);
  orchestration.updatedAt = new Date().toISOString();
  if (orchestration.status === ORCHESTRATION_STATUS.COMPLETED) {
    orchestration.completedAt = new Date().toISOString();
  }

  return orchestration;
}
