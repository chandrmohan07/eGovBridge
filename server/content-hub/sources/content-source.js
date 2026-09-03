/**
 * SIH Government Service Integration Platform — Content Hub Data Source Abstraction
 * Abstraction layer for government scholarships, welfare schemes, and official announcement feeds.
 */

export class BaseContentSource {
  constructor(name, sourceType = 'MOCK') {
    this.name = name;
    this.sourceType = sourceType;
  }

  async fetchContent(category, filters = {}) {
    throw new Error('fetchContent must be implemented by subclass');
  }
}

/**
 * Mock Content Source (Default for Prototype / Development)
 * MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION
 */
export class MockContentSource extends BaseContentSource {
  constructor() {
    super('National Portals (NSP, myScheme, PIB Mock Adapter)', 'MOCK');
  }

  async fetchContent(category, filters = {}) {
    return {
      status: 'MOCK_SOURCE_ACTIVE',
      disclaimer: 'MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION',
      source: this.name,
      verifiedDate: '2026-09-03'
    };
  }
}

export const activeContentSource = new MockContentSource();
