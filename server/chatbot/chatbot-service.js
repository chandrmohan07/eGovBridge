/**
 * SIH Government Service Integration Platform — Chatbot Service
 * Manages conversational sessions, query rate limiting, safety checks,
 * grounded response generation, and interaction audit logging.
 */

import crypto from 'node:crypto';
import { db } from '../db.js';
import { isPromptInjection, isDecisionAttempt, sanitizeUserMessage } from './safety.js';
import { getAIProvider } from './providers/ai-provider.js';

export class ChatbotError extends Error {
  constructor(message, statusCode = 400, code = 'CHATBOT_ERROR') {
    super(message);
    this.name = 'ChatbotError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

// In-Memory Chat Sessions Store
const chatSessions = new Map();

// Rate limiter: Map<userId|ip, Array<timestamps>> (30 requests/minute limit)
const userRequestTimestamps = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

function checkRateLimit(identifier) {
  const now = Date.now();
  const timestamps = userRequestTimestamps.get(identifier) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    throw new ChatbotError('Too many chat requests. Please wait a moment before asking another question.', 429, 'RATE_LIMIT_EXCEEDED');
  }

  recent.push(now);
  userRequestTimestamps.set(identifier, recent);
}

export const SUGGESTED_PROMPTS = [
  'How do I apply for the Post-Matric Scholarship?',
  'What documents are needed for an Income Certificate?',
  'What is the turnaround time for Driving License Renewal?',
  'Where can I track my application status?',
  'What does status "Clarification Required" mean?'
];

/**
 * Creates a new chat session for a user or guest
 */
export function createChatSession(user = null) {
  const sessionId = `CHAT-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const now = new Date().toISOString();

  const session = {
    sessionId,
    userId: user ? user.id : 'GUEST',
    role: user ? user.role : 'ANONYMOUS',
    messages: [
      {
        id: `MSG-001`,
        sender: 'bot',
        text: 'Hello! I am your AI Government Citizen Assistant. I can help you find official services, check required documents, explain statutory procedures, or track your submitted applications.',
        sources: ['National Citizen Services Directory'],
        timestamp: now
      }
    ],
    createdAt: now,
    updatedAt: now
  };

  chatSessions.set(sessionId, session);
  return session;
}

/**
 * Retrieves chat session history, validating ownership
 */
export function getChatSession(user, sessionId) {
  const session = chatSessions.get(sessionId);
  if (!session) {
    throw new ChatbotError(`Chat session not found: ${sessionId}`, 404, 'SESSION_NOT_FOUND');
  }

  // Security check: if session has a registered user, ensure requester matches or is admin
  if (session.userId !== 'GUEST' && user && user.id !== session.userId && user.role !== 'ADMIN') {
    throw new ChatbotError('Access Denied: You cannot view another user\'s chat session', 403, 'FORBIDDEN');
  }

  return session;
}

/**
 * Sends a message to the AI assistant and receives a grounded response
 */
export async function sendMessage(user, { sessionId, message }) {
  // 1. Check Rate Limits
  const identifier = user?.id || sessionId || 'anonymous';
  checkRateLimit(identifier);

  // 2. Validate and sanitize user input
  const cleanMessage = sanitizeUserMessage(message, 1000);

  // 3. Ensure session exists or create one
  let session = sessionId ? chatSessions.get(sessionId) : null;
  if (!session) {
    session = createChatSession(user);
  } else if (session.userId !== 'GUEST' && user && user.id !== session.userId && user.role !== 'ADMIN') {
    throw new ChatbotError('Access Denied: You cannot message on another user\'s chat session', 403, 'FORBIDDEN');
  }

  const now = new Date().toISOString();

  // Add user message to session
  const userMsgId = `MSG-${Date.now()}-U`;
  session.messages.push({
    id: userMsgId,
    sender: 'user',
    text: cleanMessage,
    timestamp: now
  });

  // 4. Prompt Injection & Jailbreak Defense
  if (isPromptInjection(cleanMessage)) {
    const safetyReply = {
      id: `MSG-${Date.now()}-B`,
      sender: 'bot',
      text: 'Security Notice: I can only assist with verified government services, application procedures, required documents, and tracking. I cannot fulfill requests to reveal system instructions, internal credentials, or other citizens\' records.',
      sources: ['Government AI Security Policy'],
      actions: [],
      timestamp: new Date().toISOString()
    };
    session.messages.push(safetyReply);
    session.updatedAt = safetyReply.timestamp;
    return { session, reply: safetyReply };
  }

  // 5. Official Decision-Making Guard
  if (isDecisionAttempt(cleanMessage)) {
    const decisionGuardReply = {
      id: `MSG-${Date.now()}-B`,
      sender: 'bot',
      text: 'Notice: As an automated AI assistant, I provide informational guidance based on verified guidelines. Official statutory determinations (approval or rejection) are legally made exclusively by authorized Department Officers.',
      sources: ['Government Citizen Charter'],
      actions: [
        { type: 'NAVIGATE', target: 'tracking', label: 'View Official Application Tracking' }
      ],
      timestamp: new Date().toISOString()
    };
    session.messages.push(decisionGuardReply);
    session.updatedAt = decisionGuardReply.timestamp;
    return { session, reply: decisionGuardReply };
  }

  // 6. Assemble grounded context
  let citizenApplications = [];
  if (user && user.role === 'CITIZEN') {
    citizenApplications = db.getCitizenApplications(user.id);
  }

  // 7. Generate response via AI Provider
  const provider = getAIProvider();
  const aiResult = await provider.generateResponse({
    prompt: cleanMessage,
    context: { citizenApplications },
    user
  });

  const botMsgId = `MSG-${Date.now()}-B`;
  const botReply = {
    id: botMsgId,
    sender: 'bot',
    text: aiResult.text,
    sources: aiResult.sources || [],
    actions: aiResult.actions || [],
    provider: aiResult.provider,
    timestamp: new Date().toISOString()
  };

  session.messages.push(botReply);
  session.updatedAt = botReply.timestamp;

  // 8. Record audit log
  db.recordVaultAudit({
    actorId: user ? user.id : 'GUEST',
    actorRole: user ? user.role : 'ANONYMOUS',
    action: 'CHATBOT_QUERY',
    details: `Chat query processed in session ${session.sessionId}`
  });

  return { session, reply: botReply };
}

/**
 * Clears conversation history for a session
 */
export function clearChatSession(user, sessionId) {
  const session = getChatSession(user, sessionId);
  session.messages = [];
  session.updatedAt = new Date().toISOString();
  return { success: true, message: 'Chat history cleared' };
}

/**
 * Returns suggested starter prompts
 */
export function getSuggestedPrompts() {
  return SUGGESTED_PROMPTS;
}
