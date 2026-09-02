/**
 * Component: AdminPortal
 * Renders platform administrator view for user management, department registry, and role overview.
 */

export function renderAdminPortal(store) {
  const usersList = store.adminUsersList || [];
  const departments = store.adminDepartments || [];

  return `
    <div>
      <div class="section-header">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="badge badge-danger" style="font-size: 13px; font-weight: 700;">
              🛡️ System Administration Portal
            </span>
            <span class="badge badge-neutral">Role: Platform Administrator</span>
          </div>
          <h2 class="section-title">Identity, Roles & Department Registry</h2>
          <p class="section-subtitle">
            Centralized role-based access control, department adapter status, and security administration.
          </p>
        </div>
      </div>

      <!-- Admin Stats Grid -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Registered Accounts</span>
            <span class="metric-value">${usersList.length}</span>
            <span class="metric-sub">Across all roles</span>
          </div>
          <div class="metric-icon-box icon-blue">👥</div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Registered Departments</span>
            <span class="metric-value">${departments.length}</span>
            <span class="metric-sub">Active in Interop Matrix</span>
          </div>
          <div class="metric-icon-box icon-green">🏛️</div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">RBAC Security Guard</span>
            <span class="metric-value">Active</span>
            <span class="metric-sub">Server-Side Token Verified</span>
          </div>
          <div class="metric-icon-box icon-purple">🔐</div>
        </div>
      </div>

      <!-- User & Role Management Table -->
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
        <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 16px;">
          User Accounts & Role Assignments
        </h3>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color); text-align: left; color: var(--text-muted);">
                <th style="padding: 10px 12px;">User ID</th>
                <th style="padding: 10px 12px;">Name</th>
                <th style="padding: 10px 12px;">Email</th>
                <th style="padding: 10px 12px;">Assigned Role</th>
                <th style="padding: 10px 12px;">Department Scope</th>
                <th style="padding: 10px 12px;">KYC / Status</th>
              </tr>
            </thead>
            <tbody>
              ${usersList.map(u => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px; font-family: var(--font-mono); font-weight: 600;">
                    ${u.id}
                  </td>
                  <td style="padding: 12px; font-weight: 600;">
                    ${u.name}
                  </td>
                  <td style="padding: 12px; color: var(--text-muted);">
                    ${u.email}
                  </td>
                  <td style="padding: 12px;">
                    <span class="badge ${u.role === 'ADMIN' ? 'badge-danger' : u.role === 'OFFICER' ? 'badge-mock' : 'badge-success'}">
                      ${u.role}
                    </span>
                  </td>
                  <td style="padding: 12px; color: var(--text-main);">
                    ${u.departmentCode || 'None (Citizen / System-Wide)'}
                  </td>
                  <td style="padding: 12px;">
                    <span class="badge badge-neutral">${u.kycStatus || 'Active'}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Department Registry Table -->
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm);">
        <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 16px;">
          Connected Department Directory
        </h3>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color); text-align: left; color: var(--text-muted);">
                <th style="padding: 10px 12px;">Dept ID</th>
                <th style="padding: 10px 12px;">Department Name</th>
                <th style="padding: 10px 12px;">Code</th>
                <th style="padding: 10px 12px;">Parent Ministry</th>
                <th style="padding: 10px 12px;">Active Officers</th>
              </tr>
            </thead>
            <tbody>
              ${departments.map(d => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px; font-family: var(--font-mono); font-weight: 600;">
                    ${d.id}
                  </td>
                  <td style="padding: 12px; font-weight: 600;">
                    ${d.name}
                  </td>
                  <td style="padding: 12px;">
                    <span class="badge badge-neutral">${d.code}</span>
                  </td>
                  <td style="padding: 12px; color: var(--text-muted);">
                    ${d.ministry}
                  </td>
                  <td style="padding: 12px; font-weight: 600;">
                    ${d.activeOfficersCount} Officers
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
