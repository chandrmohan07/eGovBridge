/**
 * Component: ApplicationTracking
 * Renders the multi-stage application tracking timeline, status indicators, and interop audit logs.
 */

export function renderApplicationTracking(store) {
  const query = (store.searchQuery || '').toLowerCase().trim();

  const apps = store.applications.filter(a => {
    if (!query) return true;
    return a.id.toLowerCase().includes(query) ||
      a.serviceName.toLowerCase().includes(query) ||
      a.department.toLowerCase().includes(query) ||
      a.currentStatus.toLowerCase().includes(query);
  });

  return `
    <div>
      <div class="section-header">
        <div>
          <h2 class="section-title">Application Tracking & Status</h2>
          <p class="section-subtitle">Real-time lifecycle tracking across all submitted applications and inter-department orchestration steps.</p>
        </div>
      </div>

      <!-- Tracking Search Box -->
      <div style="background: #ffffff; padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); margin-bottom: 24px; display: flex; gap: 12px; align-items: center;">
        <input 
          type="text" 
          id="trackingIdInput"
          placeholder="Enter Application ID (e.g. APP-2026-EDU-8812)" 
          style="flex: 1; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
          value="${store.searchQuery || ''}"
          onkeyup="if(event.key === 'Enter') window.app.setSearch(this.value)"
        />
        <button class="btn btn-primary btn-sm" onclick="window.app.setSearch(document.getElementById('trackingIdInput').value)">
          Track Application
        </button>
      </div>

      ${apps.length === 0 ? `
        <div style="text-align: center; padding: 48px; background: #ffffff; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <span style="font-size: 32px;">📑</span>
          <h4 style="margin: 12px 0 4px; font-size: 16px;">No application found for "${store.searchQuery}"</h4>
          <p style="font-size: 13px; color: var(--text-muted);">Please verify your application ID number or reset your filter.</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 12px;" onclick="window.app.resetSearch()">Reset Search</button>
        </div>
      ` : apps.map(app => `
        <div class="tracker-container">
          <div class="tracker-header">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-family: var(--font-mono); font-weight: 700; font-size: 15px; color: var(--color-primary);">${app.id}</span>
                <span class="badge ${app.statusCode === 'APPROVED' ? 'badge-success' : 'badge-warning'}">
                  ${app.currentStatus}
                </span>
              </div>
              <h3 style="font-size: 17px; font-weight: 700; color: var(--text-main);">${app.serviceName}</h3>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Department: ${app.department} • Submitted: ${app.submittedDate}</p>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 11px; color: var(--text-muted); display: block;">Last Activity</span>
              <span style="font-size: 13px; font-weight: 600; color: var(--text-main);">${app.lastUpdated}</span>
              <button class="btn btn-outline btn-sm" style="margin-top: 6px; display: block;" onclick="window.app.viewOrchestrationForApplication('${app.id}')">
                ⚙️ Orchestration Graph
              </button>
            </div>
          </div>

          <!-- Stepper Timeline -->
          <div class="stepper">
            ${app.timeline.map((step, idx) => {
              const isCompleted = step.completed;
              const isActive = step.active || (!step.completed && idx + 1 === app.currentStep);
              return `
                <div class="step-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}">
                  <div class="step-circle">
                    ${isCompleted ? '✓' : idx + 1}
                  </div>
                  <span class="step-label">${step.name}</span>
                  <span class="step-date">${step.date || 'Pending'}</span>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Interoperability Layer Live Detail Box -->
          <div class="tracker-details-grid">
            <div class="tracker-detail-item">
              <strong>Current Milestone</strong>
              <span style="color: var(--color-primary-light); font-size: 13px;">${app.timeline[app.currentStep - 1]?.details || 'Under Automated Verification'}</span>
            </div>
            <div class="tracker-detail-item">
              <strong>Interoperability Audit Trail</strong>
              <span style="font-size: 12px; color: var(--text-main); font-weight: 500;">${app.interopLog}</span>
            </div>
            <div class="tracker-detail-item">
              <strong>Department Processing SLA</strong>
              <span style="font-size: 13px; color: var(--color-success);">Within Expected Turnaround Time</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
