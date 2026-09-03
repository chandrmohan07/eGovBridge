/**
 * Component: Notifications
 * Renders the in-portal notifications activity feed for citizens and officers.
 * Includes category icons, priority tags, time indicators, mark-as-read actions,
 * and direct application tracking navigation.
 */

export function renderNotifications(store) {
  const notifs = store.notifications || [];
  const unreadCount = notifs.filter(n => n.unread || n.status === 'UNREAD').length;

  const getCategoryIcon = (category, type) => {
    switch (category) {
      case 'Action Required':
      case 'Verification':
        return '⚠️';
      case 'Approval':
        return '🎉';
      case 'Rejection':
        return '❌';
      case 'Delivery':
        return '📜';
      case 'Scholarship':
        return '🎓';
      case 'Officer':
        return '👔';
      case 'System':
        return '🔔';
      default:
        return '📋';
    }
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'URGENT') {
      return '<span class="badge badge-warning" style="background: #fee2e2; color: #b91c1c; border-color: #fca5a5;">URGENT</span>';
    }
    if (priority === 'HIGH') {
      return '<span class="badge badge-warning">HIGH</span>';
    }
    return '';
  };

  return `
    <div class="notifications-view" style="max-width: 900px; margin: 0 auto; padding-bottom: 40px;">
      <!-- Header -->
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 24px;">
        <div>
          <h2 class="section-title" style="margin: 0 0 6px 0;">Notifications & System Alerts</h2>
          <p class="section-subtitle" style="margin: 0;">
            Real-time alerts regarding application progress, document verifications, and scheme deadlines.
            ${unreadCount > 0 ? `<span style="font-weight: 700; color: var(--color-primary);"> (${unreadCount} unread)</span>` : ''}
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-outline btn-sm" onclick="window.app.markAllNotificationsRead ? window.app.markAllNotificationsRead() : null">
            ✓ Mark All as Read
          </button>
        </div>
      </div>

      <!-- Notifications List or Empty State -->
      ${notifs.length === 0 ? `
        <div style="text-align: center; padding: 48px 20px; background: #ffffff; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 36px; margin-bottom: 8px;">🔔</div>
          <h4 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin: 0 0 6px 0;">No Notifications</h4>
          <p style="font-size: 13px; color: var(--text-muted); margin: 0;">You are all caught up! Updates regarding your applications will appear here.</p>
        </div>
      ` : `
        <div class="notification-list" style="display: flex; flex-direction: column; gap: 12px;">
          ${notifs.map(notif => {
            const isUnread = notif.unread || notif.status === 'UNREAD';
            const icon = getCategoryIcon(notif.category, notif.type);
            const timeStr = notif.time || (notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : 'Just now');

            return `
              <div class="notification-card ${isUnread ? 'unread' : ''}" style="background: ${isUnread ? '#f8faff' : '#ffffff'}; border: 1px solid ${isUnread ? 'var(--color-primary-light, #bfdbfe)' : 'var(--border-color)'}; border-radius: var(--radius-md); padding: 16px; display: flex; gap: 14px; box-shadow: var(--shadow-sm); transition: all 0.15s ease;">
                <div class="notification-icon ${isUnread ? 'icon-amber' : 'icon-blue'}" style="font-size: 24px; line-height: 1; flex-shrink: 0; padding-top: 2px;">
                  ${icon}
                </div>
                <div class="notification-content" style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <h4 class="notification-title" style="margin: 0; font-size: 15px; font-weight: 700; color: var(--text-main);">
                        ${notif.title}
                      </h4>
                      ${getPriorityBadge(notif.priority)}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="badge ${isUnread ? 'badge-warning' : 'badge-neutral'}" style="font-size: 11px;">
                        ${notif.category || 'Notification'}
                      </span>
                      ${isUnread ? `
                        <button class="btn btn-outline btn-sm" style="padding: 2px 8px; font-size: 11px;" onclick="window.app.markNotificationRead ? window.app.markNotificationRead('${notif.id}') : null">
                          ✓ Read
                        </button>
                      ` : ''}
                    </div>
                  </div>

                  <p class="notification-desc" style="margin: 8px 0 10px 0; font-size: 13px; color: var(--text-muted); line-height: 1.45;">
                    ${notif.message}
                  </p>

                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-muted); flex-wrap: wrap; gap: 8px;">
                    <span class="notification-time">${timeStr}</span>
                    ${notif.applicationId ? `
                      <a href="#tracking" onclick="window.app.openApplicationTracking ? window.app.openApplicationTracking('${notif.applicationId}') : (window.app.navigate ? window.app.navigate('tracking') : null); return false;" style="color: var(--color-primary); font-family: var(--font-mono); font-weight: 600; text-decoration: none;">
                        🔍 Track ${notif.applicationId} →
                      </a>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}
