/**
 * Component: OfficerWorkspace
 * Renders the department officer workspace strictly scoped to their assigned department.
 */

export function renderOfficerWorkspace(store) {
  const user = store.currentUser;
  const deptCode = user?.departmentCode || 'EDUCATION';
  const apps = store.officerApplications || [];

  return `
    <div>
      <div class="section-header">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="badge badge-mock" style="font-size: 13px; font-weight: 700;">
              🏛️ Department Officer Workspace
            </span>
            <span class="badge badge-success">
              Assigned: ${deptCode}
            </span>
          </div>
          <h2 class="section-title">Official Department Processing Queue</h2>
          <p class="section-subtitle">
            Officer: <strong>${user?.name}</strong> • ${user?.designation || 'Verification Officer'}
          </p>
        </div>
        <div style="text-align: right;">
          <span class="badge badge-neutral" style="font-size: 12px;">Security: Strict Department Boundary Enforced</span>
        </div>
      </div>

      <!-- Department Metrics -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Assigned Queue</span>
            <span class="metric-value">${apps.length}</span>
            <span class="metric-sub">Applications in ${deptCode}</span>
          </div>
          <div class="metric-icon-box icon-blue">📋</div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Cross-Verification</span>
            <span class="metric-value">Active</span>
            <span class="metric-sub">Interoperability Adapters</span>
          </div>
          <div class="metric-icon-box icon-amber">⚡</div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Processing SLA</span>
            <span class="metric-value">98.4%</span>
            <span class="metric-sub">Within timeline</span>
          </div>
          <div class="metric-icon-box icon-green">⏱️</div>
        </div>
      </div>

      <!-- Scoped Applications Queue Table -->
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main);">
            Pending Department Verification Cases (${deptCode})
          </h3>
          <span style="font-size: 12px; color: var(--text-muted);">
            Filtered strictly to ${deptCode} department boundary
          </span>
        </div>

        ${apps.length === 0 ? `
          <div style="text-align: center; padding: 32px; color: var(--text-muted);">
            No applications currently pending for ${deptCode}.
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color); text-align: left; color: var(--text-muted);">
                  <th style="padding: 10px 12px;">Application ID</th>
                  <th style="padding: 10px 12px;">Applicant</th>
                  <th style="padding: 10px 12px;">Service Requested</th>
                  <th style="padding: 10px 12px;">Submitted</th>
                  <th style="padding: 10px 12px;">Current Stage</th>
                  <th style="padding: 10px 12px; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${apps.map(app => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 12px; font-family: var(--font-mono); font-weight: 700; color: var(--color-primary);">
                      ${app.id}
                    </td>
                    <td style="padding: 12px; font-weight: 600;">
                      ${app.applicantName}
                    </td>
                    <td style="padding: 12px;">
                      ${app.serviceName}
                    </td>
                    <td style="padding: 12px; color: var(--text-muted);">
                      ${app.submittedDate}
                    </td>
                    <td style="padding: 12px;">
                      <span class="badge ${app.status === 'APPROVED' ? 'badge-success' : 'badge-warning'}">
                        ${app.currentStage}
                      </span>
                    </td>
                    <td style="padding: 12px; text-align: right;">
                      <button class="btn btn-outline btn-sm" onclick="alert('Officer Review Action: Full application verification workflow belongs to Phase 11.')">
                        Review & Verify
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- Security Notice -->
      <div style="margin-top: 20px; padding: 14px 18px; background: #f8fafc; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: 12px; color: var(--text-muted);">
        🔒 <strong>Server-Side RBAC Enforcement:</strong> Department Officers cannot access files, documents, or records of other government departments. Unrelated department endpoints return <code>HTTP 403 Forbidden</code>.
      </div>
    </div>
  `;
}
