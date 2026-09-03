/**
 * SIH Government Service Integration Platform — Notification Service
 * Centralized service for creating, dispatching, querying, and updating in-app notifications.
 */

import crypto from 'node:crypto';
import { db, notifications, notificationPreferences } from '../db.js';
import { renderNotificationTemplate } from './templates.js';
import { notificationDispatcher } from './providers/provider-interface.js';

export class NotificationError extends Error {
  constructor(message, statusCode = 400, code = 'NOTIFICATION_ERROR') {
    super(message);
    this.name = 'NotificationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Creates and persists a notification, dispatching through configured providers
 */
export async function createNotification({
  recipientUserId,
  recipientRole = 'CITIZEN',
  applicationId = null,
  type,
  title = null,
  message = null,
  priority = null,
  metadata = {}
}) {
  if (!recipientUserId) {
    throw new NotificationError('recipientUserId is required', 400, 'MISSING_RECIPIENT');
  }

  // Render template if title or message omitted
  const templateVars = {
    ...metadata,
    applicationId: applicationId || 'N/A',
    serviceName: metadata.serviceName || 'Government Service',
    departmentCode: metadata.departmentCode || 'General'
  };

  const rendered = renderNotificationTemplate(type, templateVars);
  const finalTitle = title || rendered.title;
  const finalMessage = message || rendered.message;
  const finalPriority = priority || rendered.priority || 'NORMAL';
  const category = rendered.category || 'Application';

  // Duplicate Prevention: Avoid duplicate notification within 5 seconds for the same user, app, and type
  const recentDuplicate = db.notifications.find(n => 
    n.recipientUserId === recipientUserId &&
    n.applicationId === applicationId &&
    n.type === type &&
    n.status === 'UNREAD' &&
    (Date.now() - new Date(n.createdAt).getTime()) < 5000
  );

  if (recentDuplicate) {
    return recentDuplicate;
  }

  const notificationId = `NOTIF-2026-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const now = new Date().toISOString();

  const notification = {
    id: notificationId,
    recipientUserId,
    recipientRole,
    applicationId,
    type,
    title: finalTitle,
    message: finalMessage,
    status: 'UNREAD',
    priority: finalPriority,
    category,
    metadata: typeof metadata === 'object' && metadata !== null ? metadata : {},
    createdAt: now,
    readAt: null
  };

  db.notifications.unshift(notification);

  // Dispatch via providers (asynchronous, non-blocking)
  const recipient = db.findUserById(recipientUserId);
  const prefs = db.getNotificationPreferences(recipientUserId);

  notificationDispatcher.dispatch(notification, recipient, prefs).catch(() => {});

  // Record audit trail
  db.recordVaultAudit({
    actorId: 'SYSTEM',
    actorRole: 'SYSTEM',
    action: 'NOTIFICATION_SENT',
    details: `Notification ${notificationId} (${type}) sent to ${recipientUserId}`
  });

  return notification;
}

/**
 * Retrieves notifications for an authenticated user with status and type filters
 */
export function getUserNotifications(user, filters = {}) {
  if (!user || !user.id) {
    throw new NotificationError('Authentication required to view notifications', 401, 'UNAUTHENTICATED');
  }

  let list = [];

  if (user.role === 'CITIZEN') {
    list = db.notifications.filter(n => n.recipientUserId === user.id && n.status !== 'ARCHIVED');
  } else if (user.role === 'OFFICER') {
    list = db.notifications.filter(n => 
      (n.recipientUserId === user.id || (n.metadata && n.metadata.departmentCode === user.departmentCode)) &&
      n.status !== 'ARCHIVED'
    );
  } else if (user.role === 'ADMIN') {
    list = db.notifications.filter(n => n.status !== 'ARCHIVED');
  }

  // Filter by status (UNREAD, READ, ALL)
  if (filters.status && filters.status !== 'ALL') {
    const st = filters.status.toUpperCase();
    list = list.filter(n => n.status === st);
  }

  // Filter by type
  if (filters.type && filters.type !== 'ALL') {
    const tp = filters.type.toUpperCase();
    list = list.filter(n => n.type === tp);
  }

  const unreadCount = list.filter(n => n.status === 'UNREAD').length;

  // Pagination
  const limit = Math.min(parseInt(filters.limit || '50', 10), 100);
  const offset = Math.max(parseInt(filters.offset || '0', 10), 0);
  const pagedList = list.slice(offset, offset + limit);

  return {
    total: list.length,
    unreadCount,
    limit,
    offset,
    notifications: pagedList
  };
}

/**
 * Gets count of unread notifications
 */
export function getUnreadCount(user) {
  if (!user || !user.id) {
    throw new NotificationError('Authentication required', 401, 'UNAUTHENTICATED');
  }

  return db.getUnreadNotificationsCount(user.id);
}

/**
 * Marks a single notification as read
 */
export function markAsRead(user, notificationId) {
  if (!user || !user.id) {
    throw new NotificationError('Authentication required', 401, 'UNAUTHENTICATED');
  }

  const notif = db.notifications.find(n => n.id === notificationId);
  if (!notif) {
    throw new NotificationError(`Notification not found: ${notificationId}`, 404, 'NOT_FOUND');
  }

  // Security Check: Citizen must own the notification; Officer must match recipient or department
  if (user.role === 'CITIZEN' && notif.recipientUserId !== user.id) {
    throw new NotificationError('Access Denied: You cannot modify this notification', 403, 'FORBIDDEN');
  }
  if (user.role === 'OFFICER' && notif.recipientUserId !== user.id && notif.metadata?.departmentCode !== user.departmentCode) {
    throw new NotificationError('Access Denied: Officer cannot modify notification for another department', 403, 'FORBIDDEN');
  }

  notif.status = 'READ';
  notif.readAt = new Date().toISOString();

  return notif;
}

/**
 * Marks all notifications as read for a user
 */
export function markAllAsRead(user) {
  if (!user || !user.id) {
    throw new NotificationError('Authentication required', 401, 'UNAUTHENTICATED');
  }

  const updatedCount = db.markAllNotificationsAsRead(user.id);
  return {
    success: true,
    message: 'All notifications marked as read',
    updatedCount
  };
}

/**
 * Archives a notification
 */
export function archiveNotification(user, notificationId) {
  if (!user || !user.id) {
    throw new NotificationError('Authentication required', 401, 'UNAUTHENTICATED');
  }

  const notif = db.notifications.find(n => n.id === notificationId);
  if (!notif) {
    throw new NotificationError(`Notification not found: ${notificationId}`, 404, 'NOT_FOUND');
  }

  if (user.role === 'CITIZEN' && notif.recipientUserId !== user.id) {
    throw new NotificationError('Access Denied: You cannot archive this notification', 403, 'FORBIDDEN');
  }

  notif.status = 'ARCHIVED';
  return { success: true, message: 'Notification archived' };
}

/**
 * Retrieves user notification preferences
 */
export function getPreferences(user) {
  if (!user || !user.id) {
    throw new NotificationError('Authentication required', 401, 'UNAUTHENTICATED');
  }

  return db.getNotificationPreferences(user.id);
}

/**
 * Updates user notification preferences
 */
export function updatePreferences(user, newPreferences) {
  if (!user || !user.id) {
    throw new NotificationError('Authentication required', 401, 'UNAUTHENTICATED');
  }

  return db.updateNotificationPreferences(user.id, newPreferences);
}

// ==========================================
// RESILIENT EVENT-BASED TRIGGER HELPERS
// (Wrapped in try/catch to never fail the calling workflow)
// ==========================================

export async function safeNotifyApplicationSubmitted(application, citizen) {
  try {
    // 1. Notify Citizen
    await createNotification({
      recipientUserId: citizen.id,
      recipientRole: 'CITIZEN',
      applicationId: application.id,
      type: 'APPLICATION_SUBMITTED',
      metadata: {
        serviceName: application.serviceName,
        departmentCode: application.departmentCode,
        submittedDate: application.submittedDate
      }
    });

    // 2. Notify Department Officers
    const deptOfficers = db.getUsersByRole('OFFICER').filter(o => o.departmentCode === application.departmentCode);
    for (const officer of deptOfficers) {
      await createNotification({
        recipientUserId: officer.id,
        recipientRole: 'OFFICER',
        applicationId: application.id,
        type: 'OFFICER_TASK_ASSIGNED',
        metadata: {
          serviceName: application.serviceName,
          departmentCode: application.departmentCode,
          applicantName: application.applicantName
        }
      }).catch(() => {});
    }
  } catch (err) {
    // Safe failure: Do not crash application submission
  }
}

export async function safeNotifyOfficerClaim(application, officer) {
  try {
    await createNotification({
      recipientUserId: application.applicantId,
      recipientRole: 'CITIZEN',
      applicationId: application.id,
      type: 'APPLICATION_ASSIGNED',
      metadata: {
        serviceName: application.serviceName,
        departmentCode: application.departmentCode,
        officerName: officer.name
      }
    });
  } catch (err) {}
}

export async function safeNotifyClarificationRequested(application, clarification, officer) {
  try {
    await createNotification({
      recipientUserId: application.applicantId,
      recipientRole: 'CITIZEN',
      applicationId: application.id,
      type: 'CLARIFICATION_REQUIRED',
      priority: 'URGENT',
      metadata: {
        serviceName: application.serviceName,
        departmentCode: application.departmentCode,
        reason: clarification.reason,
        requestedInfo: clarification.requestedInfo,
        clarificationId: clarification.clarificationId
      }
    });
  } catch (err) {}
}

export async function safeNotifyClarificationSubmitted(application, citizen, responseMessage) {
  try {
    if (application.assignedOfficerId) {
      await createNotification({
        recipientUserId: application.assignedOfficerId,
        recipientRole: 'OFFICER',
        applicationId: application.id,
        type: 'CLARIFICATION_SUBMITTED',
        priority: 'HIGH',
        metadata: {
          serviceName: application.serviceName,
          departmentCode: application.departmentCode,
          citizenName: citizen.name || 'Citizen'
        }
      });
    }
  } catch (err) {}
}

export async function safeNotifyApplicationApproved(application, officer, remarks) {
  try {
    await createNotification({
      recipientUserId: application.applicantId,
      recipientRole: 'CITIZEN',
      applicationId: application.id,
      type: 'APPLICATION_APPROVED',
      priority: 'HIGH',
      metadata: {
        serviceName: application.serviceName,
        departmentCode: application.departmentCode,
        remarks: remarks || 'All verification criteria satisfied.'
      }
    });
  } catch (err) {}
}

export async function safeNotifyApplicationRejected(application, officer, reason) {
  try {
    await createNotification({
      recipientUserId: application.applicantId,
      recipientRole: 'CITIZEN',
      applicationId: application.id,
      type: 'APPLICATION_REJECTED',
      priority: 'HIGH',
      metadata: {
        serviceName: application.serviceName,
        departmentCode: application.departmentCode,
        reason: reason || 'Statutory criteria not met'
      }
    });
  } catch (err) {}
}

export async function safeNotifyApplicationCompleted(application, officer, certificateUrl) {
  try {
    await createNotification({
      recipientUserId: application.applicantId,
      recipientRole: 'CITIZEN',
      applicationId: application.id,
      type: 'APPLICATION_COMPLETED',
      priority: 'HIGH',
      metadata: {
        serviceName: application.serviceName,
        departmentCode: application.departmentCode,
        certificateUrl: certificateUrl || null
      }
    });
  } catch (err) {}
}
