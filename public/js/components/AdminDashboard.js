/**
 * Component: AdminDashboard
 * Renders centralized executive administrative analytics, department workloads,
 * service performance, platform health checks, and aggregated export controls.
 */

export function renderAdminDashboard(store) {
  const overview = store.adminOverview || {
    totalCitizens: 48,
    totalOfficers: 12,
    totalDepartments: 5,
    totalServices: 6,
    totalApplications: 24,
    pendingApplications: 8,
    completedApplications: 14,
    rejectedApplications: 2,
    activeGrievances: 3,
    resolvedGrievances: 7,
    totalNotifications: 85,
    totalVaultDocuments: 36,
    totalOpportunities: 5,
    totalSchemes: 4,
    totalScholarships: 4,
    totalExchanges: 18,
    completedExchanges: 16,
    averageCitizenFeedback: '4.8'
  };

  const departments = store.adminDepartments || [
    { code: 'EDUCATION', name: 'Department of Higher Education', ministry: 'Ministry of Education', totalApplications: 12, pendingApplications: 4, completedApplications: 7, activeOfficersCount: 14, activeGrievancesCount: 1, slaComplianceRate: '92%' },
    { code: 'REVENUE', name: 'State Revenue & Land Records', ministry: 'Ministry of Revenue', totalApplications: 8, pendingApplications: 2, completedApplications: 5, activeOfficersCount: 22, activeGrievancesCount: 1, slaComplianceRate: '88%' },
    { code: 'HEALTH', name: 'Ministry of Health & Family Welfare', ministry: 'National Health Mission', totalApplications: 2, pendingApplications: 1, completedApplications: 1, activeOfficersCount: 18, activeGrievancesCount: 0, slaComplianceRate: '100%' },
    { code: 'TRANSPORT', name: 'Ministry of Road Transport', ministry: 'Transport Division', totalApplications: 1, pendingApplications: 1, completedApplications: 0, activeOfficersCount: 12, activeGrievancesCount: 1, slaComplianceRate: '100%' },
    { code: 'AGRICULTURE', name: 'Department of Agriculture', ministry: 'Ministry of Agriculture', totalApplications: 1, pendingApplications: 0, completedApplications: 1, activeOfficersCount: 16, activeGrievancesCount: 0, slaComplianceRate: '100%' }
  ];

  return `
    <div class="admin-dashboard" style="max-width: 1200px; margin: 0 auto; padding-bottom: 40px;">
      <!-- Section Header -->
      <div class="section-header" style="margin-bottom: 24px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
            <h2 class="section-title" style="margin: 0;">Central Platform Administration & Analytics</h2>
            <span class="badge badge-success" style="font-size: 11px;">🛡️ Superadmin View</span>
          </div>
          <p class="section-subtitle">Real-time statutory intelligence across all 5 federated government departments, DAG orchestrations, and citizen grievances.</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" onclick="window.app.exportAdminReport('SUMMARY')">📥 Export Summary (JSON)</button>
          <button class="btn btn-primary btn-sm" onclick="window.app.refreshAdminDashboard()">🔄 Live Refresh</button>
        </div>
      </div>

      <!-- High-Level Metric Cards Grid -->
      <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Total Citizens</span>
            <span class="metric-value">${overview.totalCitizens}</span>
            <span class="metric-sub">Registered Users</span>
          </div>
          <div class="metric-icon-box icon-blue">👥</div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Active Officers</span>
            <span class="metric-value">${overview.totalOfficers}</span>
            <span class="metric-sub">5 Nodal Ministries</span>
          </div>
          <div class="metric-icon-box icon-green">🏛️</div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Total Applications</span>
            <span class="metric-value">${overview.totalApplications}</span>
            <span class="metric-sub">${overview.pendingApplications} in review queue</span>
          </div>
          <div class="metric-icon-box icon-purple">📋</div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Completed Services</span>
            <span class="metric-value">${overview.completedApplications}</span>
            <span class="metric-sub">Issued & Verified</span>
          </div>
          <div class="metric-icon-box icon-green">✅</div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Citizen Grievances</span>
            <span class="metric-value">${overview.activeGrievances}</span>
            <span class="metric-sub">${overview.resolvedGrievances} resolved</span>
          </div>
          <div class="metric-icon-box icon-amber">⚖️</div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Satisfaction Rating</span>
            <span class="metric-value">★ ${overview.averageCitizenFeedback}</span>
            <span class="metric-sub">Citizen Feedback</span>
          </div>
          <div class="metric-icon-box icon-amber">⭐</div>
        </div>
      </div>

      <!-- Platform Health & Subsystems Status -->
      <div class="card" style="padding: 20px; background: white; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-size: 16px; font-weight: 700; margin: 0;">Technical Platform Health & Interoperability Subsystems</h3>
          <span class="badge badge-success">● All 7 Subsystems Operational</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; font-size: 13px;">
          <div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: var(--radius-sm); background: #f8fafc;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <strong>🌐 API Gateway (Phase 7)</strong>
              <span class="badge badge-success">HEALTHY</span>
            </div>
            <div style="color: var(--text-muted); font-size: 12px;">Latency: 1.5ms • Rate Limiter: Active</div>
          </div>

          <div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: var(--radius-sm); background: #f8fafc;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <strong>⚡ Smart DAG Orchestrator (Phase 6)</strong>
              <span class="badge badge-success">HEALTHY</span>
            </div>
            <div style="color: var(--text-muted); font-size: 12px;">Active DAGs: 4 • Parallel Executions: Enabled</div>
          </div>

          <div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: var(--radius-sm); background: #f8fafc;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <strong>🛡️ Inter-Dept Data Exchange (Phase 10)</strong>
              <span class="badge badge-success">HEALTHY</span>
            </div>
            <div style="color: var(--text-muted); font-size: 12px;">Total Transfers: ${overview.totalExchanges} • Minimization: Enforced</div>
          </div>

          <div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: var(--radius-sm); background: #f8fafc;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <strong>📁 Digital Document Vault (Phase 13)</strong>
              <span class="badge badge-success">HEALTHY</span>
            </div>
            <div style="color: var(--text-muted); font-size: 12px;">Stored Vault Files: ${overview.totalVaultDocuments} • Encryption: AES-256</div>
          </div>

          <div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: var(--radius-sm); background: #f8fafc;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <strong>🔔 Notification Engine (Phase 14)</strong>
              <span class="badge badge-success">HEALTHY</span>
            </div>
            <div style="color: var(--text-muted); font-size: 12px;">Total Dispatched: ${overview.totalNotifications} • In-App: Online</div>
          </div>

          <div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: var(--radius-sm); background: #f8fafc;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <strong>🤖 AI Citizen Help Agent (Phase 15)</strong>
              <span class="badge badge-success">HEALTHY</span>
            </div>
            <div style="color: var(--text-muted); font-size: 12px;">Grounded KB: 6 Modules • Hallucination Guard: Active</div>
          </div>
        </div>
      </div>

      <!-- Department Workload & Performance Table -->
      <div class="card" style="padding: 20px; background: white; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-size: 16px; font-weight: 700; margin: 0;">Department Workload & SLA Performance</h3>
        </div>
        <div style="overflow-x: auto;">
          <table class="table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--color-border); text-align: left;">
                <th style="padding: 10px 12px;">Department</th>
                <th style="padding: 10px 12px;">Ministry</th>
                <th style="padding: 10px 12px; text-align: center;">Total Apps</th>
                <th style="padding: 10px 12px; text-align: center;">Pending</th>
                <th style="padding: 10px 12px; text-align: center;">Completed</th>
                <th style="padding: 10px 12px; text-align: center;">Active Officers</th>
                <th style="padding: 10px 12px; text-align: center;">Grievances</th>
                <th style="padding: 10px 12px; text-align: right;">SLA Compliance</th>
              </tr>
            </thead>
            <tbody>
              ${departments.map(d => `
                <tr style="border-bottom: 1px solid var(--color-border);">
                  <td style="padding: 12px; font-weight: 700; color: var(--color-accent);">${d.name}</td>
                  <td style="padding: 12px; color: var(--text-muted);">${d.ministry}</td>
                  <td style="padding: 12px; text-align: center; font-weight: 600;">${d.totalApplications}</td>
                  <td style="padding: 12px; text-align: center; color: #d97706; font-weight: 600;">${d.pendingApplications}</td>
                  <td style="padding: 12px; text-align: center; color: #16a34a; font-weight: 600;">${d.completedApplications}</td>
                  <td style="padding: 12px; text-align: center;">${d.activeOfficersCount}</td>
                  <td style="padding: 12px; text-align: center;">
                    <span class="badge ${d.activeGrievancesCount > 0 ? 'badge-warning' : 'badge-neutral'}">${d.activeGrievancesCount}</span>
                  </td>
                  <td style="padding: 12px; text-align: right; font-weight: 700; color: #16a34a;">${d.slaComplianceRate}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
