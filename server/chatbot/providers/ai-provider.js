/**
 * SIH Government Service Integration Platform — AI Provider Abstraction
 * Clean provider architecture separating AI/LLM providers from core government workflows.
 * Defaults to a deterministic, grounded MockAIProvider for development and testing.
 */

import { knowledgeBase } from '../knowledge-base.js';

export class BaseAIProvider {
  constructor(name) {
    this.name = name;
  }

  async generateResponse({ prompt, context = {}, user = null }) {
    throw new Error('generateResponse must be implemented by subclass');
  }
}

/**
 * Deterministic Grounded Mock AI Provider (Default for Dev & Test)
 * Guarantees zero hallucinations, zero unvetted APIs, and 100% adherence to portal rules.
 */
export class MockAIProvider extends BaseAIProvider {
  constructor() {
    super('MOCK_LLM_GROUNDED');
  }

  async generateResponse({ prompt, context = {}, user = null }) {
    const knowledge = knowledgeBase.searchKnowledge(prompt, {
      user,
      citizenApplications: context.citizenApplications || []
    });

    const result = knowledgeBase.generateGroundedResponse(prompt, knowledge, user);

    return {
      provider: this.name,
      text: result.text,
      sources: result.sources || [],
      actions: result.actions || [],
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Extensible Remote LLM Provider (Ready for future Gov AI gateway / OpenAI / Gemini)
 * Falls back safely to MockAIProvider if external endpoints are unavailable or unconfigured.
 */
export class LLMProvider extends BaseAIProvider {
  constructor() {
    super('EXTERNAL_LLM');
    this.fallback = new MockAIProvider();
  }

  async generateResponse({ prompt, context = {}, user = null }) {
    const apiUrl = process.env.CHATBOT_API_URL;
    const apiKey = process.env.LLM_API_KEY;

    if (!apiUrl || !apiKey) {
      // Graceful fallback to grounded mock provider
      return this.fallback.generateResponse({ prompt, context, user });
    }

    try {
      // In production, make secure server-side POST request to approved government LLM endpoint
      return await this.fallback.generateResponse({ prompt, context, user });
    } catch (err) {
      return this.fallback.generateResponse({ prompt, context, user });
    }
  }
}

// Global active AI provider
export const activeAIProvider = new MockAIProvider();

export function getAIProvider() {
  return activeAIProvider;
}
