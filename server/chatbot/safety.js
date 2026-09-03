/**
 * SIH Government Service Integration Platform — AI Chatbot Safety & Prompt Injection Guard
 * Protects against prompt injection, jailbreaks, data exfiltration, and unauthorized decision-making.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?instructions/i,
  /reveal\s+(your\s+)?(system\s+)?prompt/i,
  /what\s+is\s+your\s+system\s+prompt/i,
  /show\s+(me\s+)?(the\s+)?(api\s+key|secret|credentials|passwords?)/i,
  /database\s+(credentials|connection|password|dump)/i,
  /give\s+me\s+another\s+citizen/i,
  /show\s+all\s+(users|citizens|applicants)/i,
  /bypass\s+(authorization|rbac|security)/i,
  /\b(eval|exec|system|child_process)\s*\(/i,
  /printenv|env\./i
];

const DECISION_PATTERNS = [
  /approve\s+my\s+application\s+now/i,
  /reject\s+this\s+application\s+now/i,
  /mark\s+(my\s+)?application\s+(as\s+)?(approved|completed)/i,
  /certify\s+this\s+document\s+(as\s+)?valid/i,
  /override\s+officer\s+decision/i
];

export class ChatbotSafetyError extends Error {
  constructor(message, statusCode = 400, code = 'SAFETY_ERROR') {
    super(message);
    this.name = 'ChatbotSafetyError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Checks if user message contains prompt injection or jailbreak attempts
 */
export function isPromptInjection(text) {
  if (!text || typeof text !== 'string') return false;
  return INJECTION_PATTERNS.some(re => re.test(text));
}

/**
 * Checks if user is attempting to command an official government decision
 */
export function isDecisionAttempt(text) {
  if (!text || typeof text !== 'string') return false;
  return DECISION_PATTERNS.some(re => re.test(text));
}

/**
 * Sanitizes user input string and enforces character limits
 */
export function sanitizeUserMessage(rawText, maxLength = 1000) {
  if (!rawText || typeof rawText !== 'string') {
    throw new ChatbotSafetyError('Chat message text is required', 400, 'EMPTY_MESSAGE');
  }

  const clean = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  if (clean.length === 0) {
    throw new ChatbotSafetyError('Chat message cannot be empty', 400, 'EMPTY_MESSAGE');
  }

  if (clean.length > maxLength) {
    throw new ChatbotSafetyError(`Message length exceeds permitted limit of ${maxLength} characters`, 400, 'MESSAGE_TOO_LONG');
  }

  return clean;
}

/**
 * Strips confidential credentials and tokens before sending context to AI provider
 */
export function sanitizeContextForAI(context = {}) {
  const safeContext = { ...context };

  // Never include secrets, hashes, salts, or session tokens
  delete safeContext.passwordHash;
  delete safeContext.salt;
  delete safeContext.token;
  delete safeContext.internalNotes;
  delete safeContext.apiKey;

  return safeContext;
}
