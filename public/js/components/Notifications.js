/**
 * Component: Notifications
 * Renders the in-portal notifications activity feed.
 */

export function renderNotifications(store) {
  const notifs = store.notifications;

  return `
    <div>
      <div class="section-header">
        <div>
          <h2 class="section-title">Notifications & System Alerts</h2>
          <p class="section-subtitle">Real-time alerts regarding application progress, document verifications, and scheme deadlines.</p>
        </div>
        <button class="btn btn-outline btn-sm" onclick="window.app.markAllNotificationsRead()">
          ✓ Mark All as Read
        </button>
      </div>

      <div class="notification-list">
        ${notifs.map(notif => `
          <div class="notification-card ${notif.unread ? 'unread' : ''}">
            <div class="notification-icon ${notif.unread ? 'icon-amber' : 'icon-blue'}">
              ${notif.category === 'Application' ? '📋' : notif.category === 'Scholarship' ? '🎓' : '🔐'}
            </div>
            <div class="notification-content">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <h4 class="notification-title">${notif.title}</h4>
                <span class="badge ${notif.unread ? 'badge-warning' : 'badge-neutral'}">
                  ${notif.category}
                </span>
              </div>
              <p class="notification-desc">${notif.message}</p>
              <span class="notification-time">${notif.time}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
