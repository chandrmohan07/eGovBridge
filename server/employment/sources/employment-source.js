/**
 * SIH Government Service Integration Platform — Employment Data Source Abstraction
 * Supports multiple external employment data providers (NCS, state job portals, NSDC, mock).
 */

export class BaseEmploymentSource {
  constructor(name, sourceType = 'MOCK') {
    this.name = name;
    this.sourceType = sourceType;
  }

  async fetchOpportunities(filters = {}) {
    throw new Error('fetchOpportunities must be implemented by subclass');
  }
}

/**
 * Mock Employment Source (Default for Prototype / Development)
 * MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION
 */
export class MockEmploymentSource extends BaseEmploymentSource {
  constructor() {
    super('National Career Service (NCS Mock Adapter)', 'MOCK');
  }

  async fetchOpportunities(filters = {}) {
    // Grounded mock data from primary store
    return {
      status: 'MOCK_SOURCE_ACTIVE',
      disclaimer: 'MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION',
      source: this.name,
      verifiedDate: '2026-09-03'
    };
  }
}

/**
 * Extensible National Career Service (NCS) Live Adapter (Future / Planned)
 */
export class NCSSource extends BaseEmploymentSource {
  constructor() {
    super('National Career Service (Live API)', 'GOVERNMENT_PORTAL');
    this.enabled = false;
  }

  async fetchOpportunities(filters = {}) {
    throw new Error('Live NCS integration requires verified government API credentials. Use MockEmploymentSource in development.');
  }
}

export const activeEmploymentSource = new MockEmploymentSource();
