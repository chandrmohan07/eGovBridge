/**
 * Component: GrievanceFeedback
 * Renders citizen grievance registration, tracking, clarification replies,
 * and service feedback submissions.
 */

export function renderGrievanceFeedback(store) {
  const grievances = store.grievances || [
    {
      id: 'GRV-2026-EDU-001',
      ticketId: 'GRV-2026-EDU-001',
      departmentCode: 'EDUCATION',
      category: 'Service Delay',
      subject: 'Delay in Higher Education Scholarship Verification',
      description: 'My application for the Post-Matric Scholarship has been pending verification for over 15 business days.',
      priority: 'HIGH',
      status: 'UNDER_REVIEW',
      applicationId: 'APP-2026-EDU-8812',
      createdAt: '2026-09-01T09:30:00Z',
      timeline: [
        {
          id: 'TL-1',
          event: 'SUBMITTED',
          actor: 'Citizen',
          timestamp: '2026-09-01T09:30:00Z',
          description: 'Grievance ticket registered under Higher Education Department.'
        },
        {
          id: 'TL-2',
          event: 'ASSIGNED',
          actor: 'Dr. Ramesh Sharma',
          timestamp: '2026-09-02T10:15:00Z',
          description: 'Grievance claimed by Dr. Ramesh Sharma for departmental investigation.'
        }
      ]
    }
  ];

  const categories = [
    'Service Delay',
    'Application Issue',
    'Document Issue',
    'Technical Problem',
    'Officer / Department Issue',
    'Payment Issue',
    'Information Request',
    'Other'
  ];

  const departments = [
    { id: 'DEP-EDU', name: 'Department of Higher Education' },
    { id: 'DEP-REV', name: 'State Revenue & Land Records Department' },
    { id: 'DEP-HLT', name: 'Ministry of Health & Family Welfare' },
    { id: 'DEP-TRN', name: 'Ministry of Road Transport & Highways' },
    { id: 'DEP-AGR', name: 'Department of Agriculture & Farmers Welfare' }
  ];

  return `
    <div class="grievance-container" style="max-width: 1100px; margin: 0 auto;">
      <!-- Header Area -->
      <div class="section-header" style="margin-bottom: 24px;">
        <div>
          <h2 class="section-title">Feedback & Grievance Redressal Portal</h2>
          <p class="section-subtitle">Register grievances, track departmental investigation timelines, and submit citizen service ratings.</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-primary" onclick="window.app.openGrievanceModal()">+ Register New Grievance</button>
          <button class="btn btn-secondary" onclick="window.app.openFeedbackModal()">⭐ Rate Service</button>
        </div>
      </div>

      <!-- Quick Stats / Overview Banner -->
      <div class="metrics-grid" style="margin-bottom: 24px;">
        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Total Grievances</span>
            <span class="metric-value">${grievances.length}</span>
            <span class="metric-sub">Registered by you</span>
          </div>
          <div class="metric-icon-box icon-blue">📋</div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Under Investigation</span>
            <span class="metric-value">${grievances.filter(g => g.status === 'UNDER_REVIEW' || g.status === 'IN_PROGRESS').length}</span>
            <span class="metric-sub">With department officers</span>
          </div>
          <div class="metric-icon-box icon-amber">🔍</div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Clarifications Needed</span>
            <span class="metric-value">${grievances.filter(g => g.status === 'CLARIFICATION_REQUIRED').length}</span>
            <span class="metric-sub">Action required by you</span>
          </div>
          <div class="metric-icon-box icon-purple">⚠️</div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Resolved / Closed</span>
            <span class="metric-value">${grievances.filter(g => g.status === 'RESOLVED' || g.status === 'CLOSED').length}</span>
            <span class="metric-sub">Completed redressals</span>
          </div>
          <div class="metric-icon-box icon-green">✅</div>
        </div>
      </div>

      <!-- Grievance Table List -->
      <div class="card" style="padding: 20px; background: white; border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <h3 style="font-size: 16px; font-weight: 700; margin: 0;">My Registered Grievances</h3>
          <div style="display: flex; gap: 8px;">
            <input 
              type="text" 
              placeholder="Search grievances..." 
              class="form-control" 
              style="padding: 6px 12px; font-size: 13px; width: 220px;"
              id="grievanceSearchInput"
              onkeyup="window.app.filterGrievances(this.value)"
            />
          </div>
        </div>

        ${grievances.length === 0 ? `
          <div style="text-align: center; padding: 40px; color: var(--text-muted);">
            <div style="font-size: 36px; margin-bottom: 8px;">📝</div>
            <p style="font-size: 14px; margin-bottom: 12px;">You have no registered grievances on file.</p>
            <button class="btn btn-primary btn-sm" onclick="window.app.openGrievanceModal()">Register Grievance</button>
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table class="table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 2px solid var(--color-border); text-align: left;">
                  <th style="padding: 10px 12px;">Ticket ID</th>
                  <th style="padding: 10px 12px;">Department</th>
                  <th style="padding: 10px 12px;">Category</th>
                  <th style="padding: 10px 12px;">Subject</th>
                  <th style="padding: 10px 12px;">Priority</th>
                  <th style="padding: 10px 12px;">Status</th>
                  <th style="padding: 10px 12px;">Registered</th>
                  <th style="padding: 10px 12px; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${grievances.map(g => {
                  let badgeClass = 'badge-neutral';
                  if (g.status === 'UNDER_REVIEW') badgeClass = 'badge-primary';
                  else if (g.status === 'CLARIFICATION_REQUIRED') badgeClass = 'badge-warning';
                  else if (g.status === 'RESOLVED' || g.status === 'CLOSED') badgeClass = 'badge-success';
                  else if (g.status === 'REJECTED') badgeClass = 'badge-danger';

                  let prioColor = '#475569';
                  if (g.priority === 'HIGH' || g.priority === 'URGENT') prioColor = '#dc2626';

                  return `
                    <tr style="border-bottom: 1px solid var(--color-border);">
                      <td style="padding: 12px; font-weight: 700; color: var(--color-accent);">${g.ticketId || g.id}</td>
                      <td style="padding: 12px;">${g.departmentCode || g.departmentId}</td>
                      <td style="padding: 12px;">${g.category}</td>
                      <td style="padding: 12px; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${g.subject}
                      </td>
                      <td style="padding: 12px;">
                        <span style="font-weight: 600; color: ${prioColor};">${g.priority}</span>
                      </td>
                      <td style="padding: 12px;">
                        <span class="badge ${badgeClass}">${g.status}</span>
                      </td>
                      <td style="padding: 12px; color: var(--text-muted); font-size: 12px;">
                        ${g.createdAt ? new Date(g.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style="padding: 12px; text-align: right;">
                        <button class="btn btn-outline btn-sm" onclick="window.app.viewGrievanceDetails('${g.id}')">
                          View & Track →
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- Grievance Submission Flow Guide -->
      <div style="margin-top: 32px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 20px;">
        <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">
          Statutory Citizen Grievance Redressal Timeline & SLA
        </h4>
        <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 12px; color: var(--text-muted);">
          <div>⏱️ <strong>Assignment:</strong> Within 24-48 business hours</div>
          <div>🔍 <strong>Investigation:</strong> 5-7 working days</div>
          <div>📁 <strong>Document Evidence:</strong> Direct 1-click attach via Digital Document Vault</div>
          <div>🛡️ <strong>Escalation:</strong> Automatic supervisor escalation if unresolved within 15 days</div>
        </div>
      </div>
    </div>
  `;
}
