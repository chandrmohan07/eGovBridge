/**
 * SIH Government Service Integration Platform — Secure Inter-Department Data Exchange Service
 * Controls policy evaluation, data minimization, transfer execution, timeout handling, and audit trails.
 */

import crypto from 'node:crypto';
import { EXCHANGE_STATUS, evaluateExchangePolicy } from './policies.js';
import { minimizeData } from './data-minimizer.js';
import { adapterRegistry } from '../adapters/adapter-registry.js';
import { CANONICAL_VERSION } from '../standardization/schemas.js';

// In-Memory Data Store for Data Exchanges
export const dataExchanges = [];
export const exchangeAuditLogs = [];
const MAX_AUDIT_LOGS = 500;

// Configuration defaults
const DEFAULT_TIMEOUT_SECONDS = parseInt(process.env.DATA_EXCHANGE_TIMEOUT_SECONDS || '60', 10);
const MAX_EXCHANGE_RETRIES = 2;

export class DataExchangeService {
  /**
   * Records an immutable audit log entry for exchange lifecycle tracing
   */
  logAudit({ exchangeId, action, status, sourceDepartment, targetDepartment, purpose, details = {}, requestId = null }) {
    const entry = {
      id: `AUD-EXC-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      exchangeId,
      action,
      status,
      sourceDepartment,
      targetDepartment,
      purpose,
      details,
      timestamp: new Date().toISOString(),
      requestId: requestId || undefined
    };

    exchangeAuditLogs.unshift(entry);
    if (exchangeAuditLogs.length > MAX_AUDIT_LOGS) {
      exchangeAuditLogs.pop();
    }
    return entry;
  }

  /**
   * Initiates and authorizes a new Inter-Department Data Exchange Request
   */
  createExchangeRequest({
    sourceDepartment,
    targetDepartment,
    applicationId,
    citizenId,
    purpose,
    requestedFields = [],
    citizenConsentGiven = true,
    requestId = null,
    timeoutSeconds = DEFAULT_TIMEOUT_SECONDS
  }) {
    const now = new Date();
    const exchangeId = `EXC-2026-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 1. Basic validation
    if (!sourceDepartment || !targetDepartment || !applicationId || !purpose) {
      const err = new Error('Missing required fields: sourceDepartment, targetDepartment, applicationId, and purpose are mandatory.');
      err.code = 'INVALID_REQUEST_PARAMETERS';
      err.statusCode = 400;
      throw err;
    }

    // 2. Citizen Consent check
    if (!citizenConsentGiven) {
      const rejectedRecord = {
        exchangeId,
        sourceDepartment: String(sourceDepartment).toUpperCase(),
        targetDepartment: String(targetDepartment).toUpperCase(),
        applicationId,
        citizenId,
        purpose,
        requestedFields,
        status: EXCHANGE_STATUS.REJECTED,
        rejectionReason: 'Citizen technical consent not provided for cross-department exchange.',
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + timeoutSeconds * 1000).toISOString(),
        completedAt: now.toISOString(),
        retryCount: 0,
        requestId,
        minimizedData: null
      };
      dataExchanges.push(rejectedRecord);
      this.logAudit({
        exchangeId,
        action: 'EXCHANGE_REJECTED',
        status: EXCHANGE_STATUS.REJECTED,
        sourceDepartment,
        targetDepartment,
        purpose,
        details: { reason: rejectedRecord.rejectionReason },
        requestId
      });
      return rejectedRecord;
    }

    // 3. Security Policy Evaluation
    const authResult = evaluateExchangePolicy({
      sourceDepartment,
      targetDepartment,
      purpose,
      requestedFields
    });

    const isAuthorized = authResult.allowed;
    const initialStatus = isAuthorized ? EXCHANGE_STATUS.AUTHORIZED : EXCHANGE_STATUS.REJECTED;

    const exchangeRecord = {
      exchangeId,
      sourceDepartment: String(sourceDepartment).toUpperCase(),
      targetDepartment: String(targetDepartment).toUpperCase(),
      applicationId,
      citizenId: citizenId || null,
      purpose,
      requestedFields,
      permittedFields: isAuthorized ? authResult.permittedFields : [],
      status: initialStatus,
      rejectionReason: isAuthorized ? null : authResult.reason,
      rejectionCode: isAuthorized ? null : authResult.code,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + timeoutSeconds * 1000).toISOString(),
      completedAt: isAuthorized ? null : now.toISOString(),
      retryCount: 0,
      maxRetries: MAX_EXCHANGE_RETRIES,
      requestId,
      minimizedData: null
    };

    dataExchanges.push(exchangeRecord);

    this.logAudit({
      exchangeId,
      action: isAuthorized ? 'EXCHANGE_AUTHORIZED' : 'EXCHANGE_REJECTED',
      status: initialStatus,
      sourceDepartment,
      targetDepartment,
      purpose,
      details: {
        isAuthorized,
        code: authResult.code || 'SUCCESS',
        requestedFields
      },
      requestId
    });

    return exchangeRecord;
  }

  /**
   * Executes an authorized inter-department data exchange
   */
  async executeExchange(exchangeId, options = {}) {
    const exchange = this.getExchangeById(exchangeId);
    if (!exchange) {
      const err = new Error(`Data exchange request not found: ${exchangeId}`);
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const requestId = options.requestId || exchange.requestId;

    // Reject if not authorized
    if (exchange.status === EXCHANGE_STATUS.REJECTED) {
      const err = new Error(`Exchange is rejected: ${exchange.rejectionReason}`);
      err.code = exchange.rejectionCode || 'EXCHANGE_REJECTED';
      err.statusCode = 403;
      throw err;
    }

    // Check expiration
    if (new Date() > new Date(exchange.expiresAt)) {
      exchange.status = EXCHANGE_STATUS.EXPIRED;
      this.logAudit({
        exchangeId,
        action: 'EXCHANGE_EXPIRED',
        status: EXCHANGE_STATUS.EXPIRED,
        sourceDepartment: exchange.sourceDepartment,
        targetDepartment: exchange.targetDepartment,
        purpose: exchange.purpose,
        details: { reason: 'Exchange request exceeded SLA time-to-live expiration' },
        requestId
      });
      const err = new Error('Exchange request has expired and cannot be processed.');
      err.code = 'EXCHANGE_EXPIRED';
      err.statusCode = 410;
      throw err;
    }

    exchange.status = EXCHANGE_STATUS.PROCESSING;

    // Simulate timeout failure if requested
    if (options.simulateTimeout) {
      await new Promise(r => setTimeout(r, 40));
      exchange.retryCount += 1;
      exchange.status = exchange.retryCount <= exchange.maxRetries ? EXCHANGE_STATUS.FAILED : EXCHANGE_STATUS.FAILED;
      this.logAudit({
        exchangeId,
        action: 'TRANSFER_TIMEOUT',
        status: EXCHANGE_STATUS.FAILED,
        sourceDepartment: exchange.sourceDepartment,
        targetDepartment: exchange.targetDepartment,
        purpose: exchange.purpose,
        details: { error: 'Timeout while awaiting data response from source department' },
        requestId
      });
      const err = new Error('Timeout while transferring data between departments.');
      err.code = 'EXCHANGE_TIMEOUT';
      err.statusCode = 504;
      throw err;
    }

    // Simulate downstream outage if requested
    if (options.simulateDownstreamFailure) {
      exchange.retryCount += 1;
      exchange.status = EXCHANGE_STATUS.FAILED;
      this.logAudit({
        exchangeId,
        action: 'TRANSFER_FAILED',
        status: EXCHANGE_STATUS.FAILED,
        sourceDepartment: exchange.sourceDepartment,
        targetDepartment: exchange.targetDepartment,
        purpose: exchange.purpose,
        details: { error: options.failureReason || 'Target department system unavailable' },
        requestId
      });
      const err = new Error(options.failureReason || 'Target department system unavailable');
      err.code = 'DOWNSTREAM_ERROR';
      err.statusCode = 502;
      throw err;
    }

    // 1. Resolve source department adapter
    const sourceAdapter = adapterRegistry.getAdapter(exchange.sourceDepartment);
    if (!sourceAdapter) {
      exchange.status = EXCHANGE_STATUS.FAILED;
      throw new Error(`Source department adapter not available: ${exchange.sourceDepartment}`);
    }

    // 2. Fetch raw department payload or use mock context data
    const sourcePayload = options.sourceData || {
      citizenId: exchange.citizenId || 'CIT-100234',
      name: 'Pooja Verma',
      dateOfBirth: '1998-04-12',
      gender: 'FEMALE',
      mobile: '+91 98765 12345',
      address: {
        addressLine: 'Plot 45, Gandhi Nagar',
        district: 'Pune',
        state: 'Maharashtra',
        pincode: '411001'
      },
      academicDetails: {
        institution: 'Pune University',
        course: 'B.Tech Computer Science',
        marksPercentage: 88.5
      },
      revenueDetails: {
        annualIncome: 150000,
        khasraNumber: 'KH-102'
      },
      healthQuota: {
        rationCardNumber: 'RC-9988',
        seccCategory: 'D1'
      }
    };

    // 3. Normalize into Canonical Data Model
    const canonicalData = sourceAdapter.toCanonical(sourcePayload);

    // 4. Apply strict Data Minimization (Keep ONLY permittedFields)
    const { minimizedData, strippedFields } = minimizeData(canonicalData, exchange.permittedFields);
    exchange.minimizedData = minimizedData;

    // 5. Transfer to Target Adapter
    const targetAdapter = adapterRegistry.getAdapter(exchange.targetDepartment);
    let targetResponse = null;
    if (targetAdapter) {
      // Send minimized canonical data to target adapter
      const targetPayload = targetAdapter.fromCanonical(minimizedData);
      targetResponse = await targetAdapter.executeTask({
        code: `TASK_EXCHANGE_${exchange.purpose}`,
        title: `Inter-Department Exchange: ${exchange.purpose}`
      }, {
        requestId,
        exchangeId,
        data: targetPayload
      });
    }

    // 6. Complete exchange
    exchange.status = EXCHANGE_STATUS.COMPLETED;
    exchange.completedAt = new Date().toISOString();
    exchange.targetResponse = targetResponse ? targetResponse.data : { acknowledged: true };

    this.logAudit({
      exchangeId,
      action: 'EXCHANGE_COMPLETED',
      status: EXCHANGE_STATUS.COMPLETED,
      sourceDepartment: exchange.sourceDepartment,
      targetDepartment: exchange.targetDepartment,
      purpose: exchange.purpose,
      details: {
        transferredFields: Object.keys(minimizedData).filter(k => k !== 'canonicalVersion'),
        strippedFieldsCount: strippedFields.length,
        strippedFields
      },
      requestId
    });

    return {
      success: true,
      exchangeId,
      status: exchange.status,
      sourceDepartment: exchange.sourceDepartment,
      targetDepartment: exchange.targetDepartment,
      minimizedData: exchange.minimizedData,
      completedAt: exchange.completedAt,
      requestId
    };
  }

  getExchangeById(exchangeId) {
    if (!exchangeId) return null;
    return dataExchanges.find(e => e.exchangeId === exchangeId) || null;
  }

  getExchangesByApplication(applicationId) {
    if (!applicationId) return [];
    return dataExchanges.filter(e => e.applicationId === applicationId);
  }

  getDepartmentExchanges(deptCode) {
    if (!deptCode) return [];
    const norm = String(deptCode).trim().toUpperCase();
    return dataExchanges.filter(e => e.sourceDepartment === norm || e.targetDepartment === norm);
  }

  getAuditLogs(filter = {}) {
    return exchangeAuditLogs.filter(entry => {
      if (filter.exchangeId && entry.exchangeId !== filter.exchangeId) return false;
      if (filter.sourceDepartment && entry.sourceDepartment !== filter.sourceDepartment) return false;
      if (filter.targetDepartment && entry.targetDepartment !== filter.targetDepartment) return false;
      if (filter.status && entry.status !== filter.status) return false;
      return true;
    });
  }
}

// Global Singleton
export const dataExchangeService = new DataExchangeService();
