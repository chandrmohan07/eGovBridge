/**
 * SIH Government Service Integration Platform — Base Department Adapter
 * Common interface and standardized response normalization for all department adapters.
 * MOCK / SANDBOX — NOT A REAL GOVERNMENT INTEGRATION
 */

import crypto from 'node:crypto';
import { normalizeDepartmentPayload, transformCanonicalToDepartment } from '../standardization/mappers.js';

export class BaseAdapter {
  /**
   * @param {Object} config
   * @param {string} config.code - Unique adapter code (e.g. 'EDU_ADAPTER')
   * @param {string} config.department - Human-readable department name
   * @param {string} config.departmentCode - Department code ('EDUCATION', 'REVENUE', etc.)
   * @param {boolean} [config.enabled=true] - Whether adapter is active
   */
  constructor({ code, department, departmentCode, enabled = true }) {
    this.code = code;
    this.department = department;
    this.departmentCode = departmentCode;
    this.enabled = enabled;
    this.isMock = true;
  }

  /**
   * Format a standardized successful adapter response
   */
  formatSuccess({ operation, data = {}, referenceId = null, requestId = null }) {
    const ref = referenceId || `REF-${this.code.slice(0, 3)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    return {
      success: true,
      department: this.department,
      departmentCode: this.departmentCode,
      adapterCode: this.code,
      operation,
      status: 'COMPLETED',
      referenceId: ref,
      data,
      timestamp: new Date().toISOString(),
      requestId: requestId || undefined,
      isMock: true
    };
  }

  /**
   * Format a standardized error response
   */
  formatError({ operation, code = 'DOWNSTREAM_ERROR', message, requestId = null }) {
    return {
      success: false,
      department: this.department,
      departmentCode: this.departmentCode,
      adapterCode: this.code,
      operation,
      status: 'FAILED',
      error: {
        code,
        message: message || `Error occurred while communicating with ${this.department}`
      },
      timestamp: new Date().toISOString(),
      requestId: requestId || undefined,
      isMock: true
    };
  }

  /**
   * Common task execution entry point invoked by Orchestration Engine
   */
  async executeTask(task, context = {}) {
    if (!this.enabled) {
      return this.formatError({
        operation: 'executeTask',
        code: 'ADAPTER_DISABLED',
        message: `Department adapter ${this.code} is disabled in configuration.`,
        requestId: context.requestId
      });
    }

    // Support simulated timeout
    if (context.simulateTimeout || (context.simulateTimeoutAdapters && context.simulateTimeoutAdapters.includes(this.code))) {
      await new Promise(r => setTimeout(r, 40));
      return this.formatError({
        operation: 'executeTask',
        code: 'TIMEOUT',
        message: `Downstream service for ${this.department} timed out.`,
        requestId: context.requestId
      });
    }

    // Support simulated failure triggers
    if (context.simulateFailureTask === task.code || 
        (context.failedTaskCodes && context.failedTaskCodes.includes(task.code)) ||
        (context.simulateFailureAdapters && context.simulateFailureAdapters.includes(this.code))) {
      return this.formatError({
        operation: 'executeTask',
        code: 'VERIFICATION_REJECTED',
        message: context.failureReason || `Verification rejected by ${this.department} adapter (${this.code})`,
        requestId: context.requestId
      });
    }

    // Simulated short network turnaround (10ms)
    await new Promise(r => setTimeout(r, 10));

    return this.processTask(task, context);
  }

  /**
   * Subclasses override this method to perform department-specific verification
   */
  async processTask(task, context = {}) {
    return this.formatSuccess({
      operation: task.code || 'verify',
      data: { verdict: 'APPROVED', taskTitle: task.title },
      requestId: context.requestId
    });
  }

  /**
   * Universal health check for adapter connectivity
   */
  async healthCheck(options = {}) {
    return {
      success: this.enabled,
      adapterCode: this.code,
      department: this.department,
      status: this.enabled ? 'HEALTHY' : 'DISABLED',
      mode: 'MOCK_SANDBOX',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Translates department-specific payload to canonical format
   */
  toCanonical(payload) {
    return normalizeDepartmentPayload(this.departmentCode, payload);
  }

  /**
   * Translates canonical data to department-specific payload
   */
  fromCanonical(canonical) {
    return transformCanonicalToDepartment(this.departmentCode, canonical);
  }
}
