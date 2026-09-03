/**
 * SIH Government Service Integration Platform — Department Adapter Registry & Factory
 * Manages discovery, lifecycle, health checks, and dispatch for all department adapters.
 * MOCK / SANDBOX — NOT A REAL GOVERNMENT INTEGRATION
 */

import { BaseAdapter } from './base-adapter.js';
import { IdentityAdapter } from './identity-adapter.js';
import { EducationAdapter } from './education-adapter.js';
import { HealthAdapter } from './health-adapter.js';
import { RevenueAdapter } from './revenue-adapter.js';
import { TransportAdapter } from './transport-adapter.js';
import { WelfareAdapter } from './welfare-adapter.js';

class AdapterRegistry {
  constructor() {
    this.adapters = new Map();
    this.aliases = new Map();
    this.initializeDefaultAdapters();
  }

  /**
   * Register standard canonical mock adapters
   */
  initializeDefaultAdapters() {
    // 1. Identity Adapter
    const identityAdapter = new IdentityAdapter({
      enabled: process.env.IDENTITY_ADAPTER_ENABLED !== 'false'
    });
    this.register(identityAdapter, ['DIGILOCKER', 'IDENTITY', 'UIDAI', 'DIGILOCKER_ADAPTER']);

    // 2. Education Adapter
    const educationAdapter = new EducationAdapter({
      enabled: process.env.EDUCATION_ADAPTER_ENABLED !== 'false'
    });
    this.register(educationAdapter, ['EDUCATION', 'EDU', 'EDU_ADAPTER', 'HIGHER_EDUCATION']);

    // 3. Health Adapter
    const healthAdapter = new HealthAdapter({
      enabled: process.env.HEALTH_ADAPTER_ENABLED !== 'false'
    });
    this.register(healthAdapter, ['HEALTH', 'HLT', 'HLT_ADAPTER', 'PMJAY', 'NHA']);

    // 4. Revenue & Land Records Adapter
    const revenueAdapter = new RevenueAdapter({
      enabled: process.env.REVENUE_ADAPTER_ENABLED !== 'false'
    });
    this.register(revenueAdapter, ['REVENUE', 'REV', 'REV_ADAPTER', 'LAND_RECORDS', 'BHULEKH', 'MUNICIPAL', 'MUNICIPAL_ADAPTER']);

    // 5. Transport Adapter
    const transportAdapter = new TransportAdapter({
      enabled: process.env.TRANSPORT_ADAPTER_ENABLED !== 'false'
    });
    this.register(transportAdapter, ['TRANSPORT', 'TRN', 'TRN_ADAPTER', 'PARIVAHAN', 'SARATHI']);

    // 6. Welfare & PFMS Adapter
    const welfareAdapter = new WelfareAdapter({
      enabled: process.env.PFMS_ADAPTER_ENABLED !== 'false'
    });
    this.register(welfareAdapter, ['FINANCE', 'PFMS', 'PFMS_ADAPTER', 'WELFARE', 'DBT']);
  }

  /**
   * Register an adapter instance with optional aliases
   */
  register(adapter, aliases = []) {
    if (!adapter || !adapter.code) {
      throw new Error('Adapter must define a unique "code" property.');
    }

    this.adapters.set(adapter.code.toUpperCase(), adapter);

    for (const alias of aliases) {
      this.aliases.set(alias.toUpperCase(), adapter.code.toUpperCase());
    }
  }

  /**
   * Retrieve adapter by code or department alias
   */
  getAdapter(key) {
    if (!key) return null;
    const norm = String(key).toUpperCase().trim();

    // Direct lookup by code
    if (this.adapters.has(norm)) {
      return this.adapters.get(norm);
    }

    // Lookup by alias
    if (this.aliases.has(norm)) {
      const code = this.aliases.get(norm);
      return this.adapters.get(code);
    }

    return null;
  }

  /**
   * Check if adapter exists
   */
  hasAdapter(key) {
    return this.getAdapter(key) !== null;
  }

  /**
   * Enable an adapter
   */
  enableAdapter(code) {
    const adapter = this.getAdapter(code);
    if (adapter) {
      adapter.enabled = true;
      return true;
    }
    return false;
  }

  /**
   * Disable an adapter
   */
  disableAdapter(code) {
    const adapter = this.getAdapter(code);
    if (adapter) {
      adapter.enabled = false;
      return true;
    }
    return false;
  }

  /**
   * Check if adapter is enabled
   */
  isAdapterEnabled(code) {
    const adapter = this.getAdapter(code);
    return adapter ? adapter.enabled : false;
  }

  /**
   * Return a list of all registered adapters with summary metadata
   */
  listAdapters() {
    return Array.from(this.adapters.values()).map(adapter => ({
      code: adapter.code,
      department: adapter.department,
      departmentCode: adapter.departmentCode,
      enabled: adapter.enabled,
      isMock: adapter.isMock,
      mode: 'MOCK_SANDBOX'
    }));
  }

  /**
   * Run health checks on all registered adapters
   */
  async healthCheckAll() {
    const results = {};
    for (const [code, adapter] of this.adapters.entries()) {
      results[code] = await adapter.healthCheck();
    }
    return results;
  }
}

// Global Singleton Instance
export const adapterRegistry = new AdapterRegistry();
