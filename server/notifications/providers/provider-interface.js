/**
 * SIH Government Service Integration Platform — Notification Providers
 * Clean provider abstraction supporting In-App (primary), Email (mock/future), and SMS (mock/future).
 */

export class BaseNotificationProvider {
  constructor(name) {
    this.name = name;
  }

  async send(notification, recipient) {
    throw new Error('send() must be implemented by provider');
  }
}

/**
 * Primary In-App Notification Provider (Stores in Database)
 */
export class InAppNotificationProvider extends BaseNotificationProvider {
  constructor() {
    super('IN_APP');
  }

  async send(notification, recipient) {
    // In-app notifications are directly stored and served via API
    return {
      provider: this.name,
      delivered: true,
      deliveredAt: new Date().toISOString()
    };
  }
}

/**
 * Mock Email Notification Provider (Ready for future SMTP/Gov mail gateway)
 */
export class EmailNotificationProvider extends BaseNotificationProvider {
  constructor() {
    super('EMAIL');
    this.dispatches = [];
  }

  async send(notification, recipient) {
    const dispatchRecord = {
      provider: this.name,
      notificationId: notification.id,
      recipientEmail: recipient?.email || 'citizen@example.com',
      subject: notification.title,
      timestamp: new Date().toISOString(),
      status: 'DELIVERED_MOCK'
    };
    this.dispatches.push(dispatchRecord);
    return dispatchRecord;
  }

  getDispatches() {
    return [...this.dispatches];
  }
}

/**
 * Mock SMS Notification Provider (Ready for future Gov SMS Gateway / NIC SMS)
 */
export class SmsNotificationProvider extends BaseNotificationProvider {
  constructor() {
    super('SMS');
    this.dispatches = [];
  }

  async send(notification, recipient) {
    const dispatchRecord = {
      provider: this.name,
      notificationId: notification.id,
      recipientPhone: recipient?.phone || '+91 98765 00000',
      messageText: `${notification.title}: ${notification.message}`,
      timestamp: new Date().toISOString(),
      status: 'DELIVERED_MOCK'
    };
    this.dispatches.push(dispatchRecord);
    return dispatchRecord;
  }

  getDispatches() {
    return [...this.dispatches];
  }
}

/**
 * Central Notification Dispatcher
 */
export class NotificationDispatcher {
  constructor() {
    this.inAppProvider = new InAppNotificationProvider();
    this.emailProvider = new EmailNotificationProvider();
    this.smsProvider = new SmsNotificationProvider();
  }

  async dispatch(notification, recipient, preferences = {}) {
    const results = [];

    // In-App is always enabled
    results.push(await this.inAppProvider.send(notification, recipient));

    // Optional Email dispatch if user opted-in
    if (preferences.emailEnabled && recipient?.email) {
      results.push(await this.emailProvider.send(notification, recipient).catch(err => ({
        provider: 'EMAIL',
        error: err.message
      })));
    }

    // Optional SMS dispatch if user opted-in
    if (preferences.smsEnabled && recipient?.phone) {
      results.push(await this.smsProvider.send(notification, recipient).catch(err => ({
        provider: 'SMS',
        error: err.message
      })));
    }

    return results;
  }
}

export const notificationDispatcher = new NotificationDispatcher();
