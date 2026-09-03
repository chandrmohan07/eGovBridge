import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { store } from '../public/js/store.js';
import { renderOrchestrationView } from '../public/js/components/OrchestrationView.js';
import { 
  planWorkflow, 
  executeTask, 
  updateTaskDependencies, 
  computeOrchestrationStatus, 
  stepOrchestration,
  TASK_STATUS, 
  ORCHESTRATION_STATUS,
  MAX_TASK_RETRIES 
} from '../server/orchestrator.js';

describe('Phase 6 — Smart Orchestration Engine Verification', () => {
  let server;
  let port;

  const request = (method, pathUrl, body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: pathUrl,
        method,
        headers
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, headers: res.headers, data: JSON.parse(data) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, headers: res.headers, raw: data });
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
      req.end();
    });
  };

  it('Start dev server for orchestration tests', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  // 1. Workflow Planner & DAG Generation Tests (Unit Level)
  describe('Workflow Planner & Dependency Specification', () => {
    it('generates multi-department tasks for Scholarship service (EDU, DIGILOCKER, REVENUE, FINANCE)', () => {
      const service = { id: 'SRV-EDU-001', code: 'SCHOLARSHIP_POST_MATRIC', category: 'Education', department: 'Higher Education' };
      const tasks = planWorkflow(service);

      assert.ok(tasks.length >= 4);
      const codes = tasks.map(t => t.code);
      assert.ok(codes.includes('TASK_IDENTITY_VERIFY'));
      assert.ok(codes.includes('TASK_ACADEMIC_RECORD'));
      assert.ok(codes.includes('TASK_REVENUE_INCOME_CHECK'));
      assert.ok(codes.includes('TASK_OFFICER_NODAL_REVIEW'));
      assert.ok(codes.includes('TASK_DISBURSEMENT_SANCTION'));

      // Check initial states: Independent tasks have no dependencies and are READY
      const identityTask = tasks.find(t => t.code === 'TASK_IDENTITY_VERIFY');
      assert.equal(identityTask.dependencies.length, 0);
      assert.equal(identityTask.status, TASK_STATUS.READY);

      const academicTask = tasks.find(t => t.code === 'TASK_ACADEMIC_RECORD');
      assert.equal(academicTask.dependencies.length, 0);
      assert.equal(academicTask.status, TASK_STATUS.READY);

      // Income check depends on identity
      const incomeTask = tasks.find(t => t.code === 'TASK_REVENUE_INCOME_CHECK');
      assert.deepEqual(incomeTask.dependencies, ['TASK_IDENTITY_VERIFY']);
      assert.equal(incomeTask.status, TASK_STATUS.PENDING);

      // Nodal review depends on both academic and revenue
      const reviewTask = tasks.find(t => t.code === 'TASK_OFFICER_NODAL_REVIEW');
      assert.deepEqual(reviewTask.dependencies, ['TASK_ACADEMIC_RECORD', 'TASK_REVENUE_INCOME_CHECK']);
      assert.equal(reviewTask.status, TASK_STATUS.PENDING);
    });

    it('generates revenue inspection and Tehsildar signing tasks for Income Certificate', () => {
      const service = { id: 'SRV-REV-002', code: 'INCOME_CERT_STATE', category: 'Certificates & Revenue', department: 'Revenue & Land Records' };
      const tasks = planWorkflow(service);

      const codes = tasks.map(t => t.code);
      assert.ok(codes.includes('TASK_IDENTITY_VERIFY'));
      assert.ok(codes.includes('TASK_RESIDENCE_CHECK'));
      assert.ok(codes.includes('TASK_REVENUE_INSPECTION'));
      assert.ok(codes.includes('TASK_TEHSILDAR_DIGITAL_SIGN'));

      const inspectionTask = tasks.find(t => t.code === 'TASK_REVENUE_INSPECTION');
      assert.ok(inspectionTask.dependencies.includes('TASK_IDENTITY_VERIFY'));
      assert.ok(inspectionTask.dependencies.includes('TASK_RESIDENCE_CHECK'));
    });
  });

  // 2. Dependency Evaluation, Execution & Failure Propagation
  describe('DAG Execution, Retry Limits & Failure Blocking', () => {
    it('executes tasks in correct dependency order and transitions to COMPLETED', async () => {
      const service = { id: 'SRV-EDU-001', code: 'SCHOLARSHIP_POST_MATRIC', category: 'Education', department: 'Higher Education' };
      const tasks = planWorkflow(service);
      const orchestration = {
        id: 'ORCH-TEST-01',
        tasks,
        status: ORCHESTRATION_STATUS.CREATED
      };

      await stepOrchestration(orchestration, { maxSteps: 10 });

      assert.equal(orchestration.status, ORCHESTRATION_STATUS.COMPLETED);
      assert.ok(orchestration.completedAt);
      for (const t of orchestration.tasks) {
        assert.equal(t.status, TASK_STATUS.COMPLETED);
        assert.ok(t.output);
        assert.equal(t.output.verdict, 'APPROVED');
      }
    });

    it('blocks downstream dependent tasks when a prerequisite task fails and exhausts retries', async () => {
      const service = { id: 'SRV-EDU-001', code: 'SCHOLARSHIP_POST_MATRIC', category: 'Education', department: 'Higher Education' };
      const tasks = planWorkflow(service);
      const orchestration = {
        id: 'ORCH-TEST-FAIL',
        tasks,
        status: ORCHESTRATION_STATUS.CREATED
      };

      // Force TASK_IDENTITY_VERIFY to fail and exhaust retries
      const identityTask = tasks.find(t => t.code === 'TASK_IDENTITY_VERIFY');
      identityTask.retryCount = MAX_TASK_RETRIES; // Will hit max retries on next execution
      
      await stepOrchestration(orchestration, { 
        maxSteps: 10,
        context: { simulateFailureTask: 'TASK_IDENTITY_VERIFY' }
      });

      assert.equal(identityTask.status, TASK_STATUS.FAILED);
      assert.equal(identityTask.retryCount, MAX_TASK_RETRIES + 1);

      // TASK_ACADEMIC_RECORD was independent, so it should still have completed!
      const academicTask = tasks.find(t => t.code === 'TASK_ACADEMIC_RECORD');
      assert.equal(academicTask.status, TASK_STATUS.COMPLETED);

      // TASK_REVENUE_INCOME_CHECK depended on identity, so it must be BLOCKED
      const incomeTask = tasks.find(t => t.code === 'TASK_REVENUE_INCOME_CHECK');
      assert.equal(incomeTask.status, TASK_STATUS.BLOCKED);

      // Downstream TASK_OFFICER_NODAL_REVIEW must also be BLOCKED
      const reviewTask = tasks.find(t => t.code === 'TASK_OFFICER_NODAL_REVIEW');
      assert.equal(reviewTask.status, TASK_STATUS.BLOCKED);

      // Overall orchestration status should be PARTIALLY_COMPLETED (since academic completed, but identity failed)
      assert.equal(orchestration.status, ORCHESTRATION_STATUS.PARTIALLY_COMPLETED);
    });
  });

  // 3. Live HTTP API & Security Integration
  describe('Orchestration HTTP REST APIs & Security Matrix', () => {
    let citizen1Token = '';
    let citizen2Token = '';
    let eduOfficerToken = '';
    let revOfficerToken = '';
    let citizen1AppId = '';
    let citizen1OrchId = '';

    it('Setup: Register Citizen 1, Citizen 2, and Login Officers', async () => {
      const c1 = await request('POST', '/api/v1/auth/register', {
        name: 'Devanagari Citizen',
        email: `orch_cit1_${Date.now()}@example.com`,
        password: 'Password@123',
        phone: '+91 98765 33333',
        state: 'Maharashtra',
        district: 'Pune'
      });
      assert.equal(c1.statusCode, 201);
      citizen1Token = c1.data.token;

      const c2 = await request('POST', '/api/v1/auth/register', {
        name: 'Another Citizen',
        email: `orch_cit2_${Date.now()}@example.com`,
        password: 'Password@123',
        phone: '+91 98765 44444',
        state: 'Karnataka',
        district: 'Bengaluru'
      });
      assert.equal(c2.statusCode, 201);
      citizen2Token = c2.data.token;

      const offEdu = await request('POST', '/api/v1/auth/login', {
        email: 'officer.edu@gov.in',
        password: 'Officer@123'
      });
      assert.equal(offEdu.statusCode, 200);
      eduOfficerToken = offEdu.data.token;

      const offRev = await request('POST', '/api/v1/auth/login', {
        email: 'officer.rev@gov.in',
        password: 'Officer@123'
      });
      assert.equal(offRev.statusCode, 200);
      revOfficerToken = offRev.data.token;
    });

    it('Citizen 1 submits an application in Phase 5 -> automatically creates an orchestration instance', async () => {
      const appRes = await request('POST', '/api/v1/applications', {
        serviceId: 'SRV-EDU-001',
        formData: {
          fullName: 'Devanagari Citizen',
          email: 'citizen1@example.com',
          phone: '+91 98765 33333',
          address: '402 Shivajinagar',
          district: 'Pune',
          state: 'Maharashtra',
          institution: 'Pune University',
          course: 'B.Tech AI',
          annualIncome: '180000',
          previousMarks: '85.0'
        },
        documents: [
          { name: 'Income Certificate', fileName: 'income.pdf', fileSize: 100000, status: 'Uploaded' }
        ],
        status: 'SUBMITTED'
      }, citizen1Token);

      assert.equal(appRes.statusCode, 201);
      citizen1AppId = appRes.data.application.id;
      assert.ok(citizen1AppId.startsWith('APP-2026-EDU-'));
      assert.ok(appRes.data.application.orchestrationId);
      citizen1OrchId = appRes.data.application.orchestrationId;
    });

    it('Citizen 1 can fetch orchestration details (GET /api/v1/orchestrations/:id)', async () => {
      const res = await request('GET', `/api/v1/orchestrations/${citizen1OrchId}`, null, citizen1Token);
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.orchestration.id, citizen1OrchId);
      assert.equal(res.data.orchestration.applicationId, citizen1AppId);
      assert.ok(res.data.orchestration.tasks.length >= 4);
    });

    it('Citizen 2 CANNOT access Citizen 1 orchestration (returns HTTP 403 Forbidden)', async () => {
      const res = await request('GET', `/api/v1/orchestrations/${citizen1OrchId}`, null, citizen2Token);
      assert.equal(res.statusCode, 403);
      assert.equal(res.data.success, false);
      assert.ok(res.data.error.includes('Access Denied'));
    });

    it('Citizen 2 CANNOT execute Citizen 1 orchestration (returns HTTP 403 Forbidden)', async () => {
      const res = await request('POST', `/api/v1/orchestrations/${citizen1OrchId}/execute`, {}, citizen2Token);
      assert.equal(res.statusCode, 403);
    });

    it('Revenue Officer CANNOT access Education Department orchestration (returns HTTP 403 Forbidden)', async () => {
      const res = await request('GET', `/api/v1/orchestrations/${citizen1OrchId}`, null, revOfficerToken);
      assert.equal(res.statusCode, 403);
    });

    it('Education Officer CAN access Education Department orchestration', async () => {
      const res = await request('GET', `/api/v1/orchestrations/${citizen1OrchId}`, null, eduOfficerToken);
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.orchestration.departmentCode, 'EDUCATION');
    });

    it('Citizen 1 can step-execute orchestration tasks (/execute)', async () => {
      const res = await request('POST', `/api/v1/orchestrations/${citizen1OrchId}/execute`, {
        maxSteps: 1
      }, citizen1Token);

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      const completedCount = res.data.orchestration.tasks.filter(t => t.status === 'COMPLETED').length;
      assert.ok(completedCount >= 1);
    });

    it('Citizen 1 can execute all remaining tasks to full completion', async () => {
      const res = await request('POST', `/api/v1/orchestrations/${citizen1OrchId}/execute`, {
        maxSteps: 10
      }, citizen1Token);

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.orchestration.status, 'COMPLETED');
      assert.ok(res.data.orchestration.tasks.every(t => t.status === 'COMPLETED'));
    });

    it('Retry API (/retry) resets task and re-evaluates execution', async () => {
      const retryRes = await request('POST', `/api/v1/orchestrations/${citizen1OrchId}/retry`, {
        taskCode: 'TASK_IDENTITY_VERIFY'
      }, citizen1Token);

      assert.equal(retryRes.statusCode, 200);
      assert.equal(retryRes.data.success, true);
      assert.equal(retryRes.data.orchestration.status, 'COMPLETED');
    });
  });

  // 4. UI Component Rendering Verification
  describe('UI Component Rendering: Orchestration Graph & Status', () => {
    it('renderOrchestrationView renders not-found state when record does not exist', () => {
      store.activeOrchestration = null;
      const html = renderOrchestrationView(store, 'ORCH-NONEXISTENT');
      assert.ok(html.includes('Orchestration Record Not Found'));
      assert.ok(html.includes('Back to Application Tracking'));
    });

    it('renderOrchestrationView renders complete task graph, progress bar, and adapter badges', () => {
      const service = { id: 'SRV-EDU-001', code: 'SCHOLARSHIP_POST_MATRIC', category: 'Education', department: 'Higher Education' };
      const tasks = planWorkflow(service);
      tasks[0].status = 'COMPLETED';
      tasks[0].output = { verdict: 'APPROVED', referenceId: 'REF-7890' };

      store.activeOrchestration = {
        id: 'ORCH-2026-EDU-TEST',
        applicationId: 'APP-2026-EDU-1234',
        serviceName: 'Post-Matric Scholarship',
        status: 'RUNNING',
        tasks
      };

      const html = renderOrchestrationView(store, 'ORCH-2026-EDU-TEST');
      assert.ok(html.includes('ORCH-2026-EDU-TEST'));
      assert.ok(html.includes('APP-2026-EDU-1234'));
      assert.ok(html.includes('Smart Orchestration Engine'));
      assert.ok(html.includes('Mock Interoperability Adapters'));
      assert.ok(html.includes('DigiLocker Citizen Identity Verification'));
      assert.ok(html.includes('EDU_ADAPTER'));
      assert.ok(html.includes('Step Execution'));
      assert.ok(html.includes('Execute Full Workflow'));
      assert.ok(html.includes('REF-7890'));
    });
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
