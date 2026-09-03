/**
 * SIH Government Service Integration Platform — Notification Templates Engine
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let notificationTypes = [];
try {
  const configPath = path.resolve(__dirname, '../../config/notification-types.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  notificationTypes = JSON.parse(raw).notificationTypes;
} catch (e) {
  notificationTypes = [
    {
      code: 'APPLICATION_SUBMITTED',
      name: 'Application Submitted',
      category: 'Application',
      defaultPriority: 'NORMAL',
      template: {
        title: 'Application Submitted: {serviceName}',
        message: 'Your application ({applicationId}) for {serviceName} has been successfully submitted.'
      }
    },
    {
      code: 'APPLICATION_APPROVED',
      name: 'Application Approved',
      category: 'Approval',
      defaultPriority: 'HIGH',
      template: {
        title: 'Application Approved: {serviceName}',
        message: 'Your application ({applicationId}) has been approved by the department. {remarks}'
      }
    },
    {
      code: 'APPLICATION_REJECTED',
      name: 'Application Rejected',
      category: 'Rejection',
      defaultPriority: 'HIGH',
      template: {
        title: 'Application Rejected: {serviceName}',
        message: 'Your application ({applicationId}) was not approved. Documented reason: {reason}'
      }
    }
  ];
}

/**
 * Returns list of supported notification types
 */
export function getNotificationTypes() {
  return notificationTypes;
}

/**
 * Renders a notification template by replacing placeholder variables
 */
export function renderNotificationTemplate(typeCode, variables = {}) {
  const definition = notificationTypes.find(t => t.code === typeCode);
  if (!definition) {
    return {
      title: variables.title || 'Government Portal Notification',
      message: variables.message || 'You have an update regarding your application.',
      category: 'General',
      priority: variables.priority || 'NORMAL'
    };
  }

  let title = definition.template.title;
  let message = definition.template.message;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    const cleanValue = value !== undefined && value !== null ? String(value) : '';
    title = title.split(placeholder).join(cleanValue);
    message = message.split(placeholder).join(cleanValue);
  }

  // Clean up any remaining unreplaced placeholders
  title = title.replace(/\{[a-zA-Z0-9_]+\}/g, '').trim();
  message = message.replace(/\{[a-zA-Z0-9_]+\}/g, '').trim();

  return {
    title,
    message,
    category: definition.category || 'Application',
    priority: definition.defaultPriority || 'NORMAL'
  };
}
