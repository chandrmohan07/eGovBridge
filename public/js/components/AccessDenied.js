/**
 * Component: AccessDenied
 * Displays 403 Forbidden page when a user role attempts to access an unauthorized route.
 */

export function renderAccessDenied(store, attemptedRoute = '') {
  const currentRole = store.currentUser?.role || 'ANONYMOUS';

  return `
    <div style="max-width: 600px; margin: 48px auto; text-align: center; background: #ffffff; padding: 40px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
      <div style="font-size: 54px; margin-bottom: 16px;">🛑</div>
      <span class="badge badge-danger" style="font-size: 13px; margin-bottom: 12px;">HTTP 403 — Forbidden</span>
      <h2 style="font-size: 22px; font-weight: 700; color: var(--color-danger); margin-bottom: 12px;">
        Access Denied: Insufficient Permissions
      </h2>
      <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6; margin-bottom: 24px;">
        Your current role (<strong>${currentRole}</strong>) does not have authorization to view this protected resource. Server-side role enforcement blocks unauthorized cross-role access.
      </p>

      <div style="background: #f8fafc; padding: 16px; border-radius: var(--radius-md); text-align: left; font-size: 13px; margin-bottom: 24px;">
        <div style="margin-bottom: 6px;"><strong>Active User:</strong> ${store.currentUser?.name || 'Guest'} (${store.currentUser?.email || 'N/A'})</div>
        <div style="margin-bottom: 6px;"><strong>Assigned Role:</strong> ${store.currentUser?.roleTitle || currentRole}</div>
        ${store.currentUser?.departmentCode ? `<div><strong>Assigned Department:</strong> ${store.currentUser.departmentCode}</div>` : ''}
      </div>

      <div style="display: flex; justify-content: center; gap: 12px;">
        <button class="btn btn-primary" onclick="window.app.navigate('${currentRole === 'OFFICER' ? 'officer-workspace' : currentRole === 'ADMIN' ? 'admin-overview' : 'dashboard'}')">
          Return to My Workspace
        </button>
        <button class="btn btn-outline" onclick="window.app.showAuthModal()">
          Switch Account / Role
        </button>
      </div>
    </div>
  `;
}
