/**
 * Component: ApplicationTracking
 * Comprehensive citizen-facing Application Tracking Console:
 * Real-time status progress, actual audit timeline stepper, safe workflow milestones,
 * and interactive clarification response handling.
 */

export function renderApplicationTracking(store) {
  const activeApp = store.activeTrackingApplication || null;
  const rawApps = store.citizenApplications || store.applications || [];
  const query = (store.trackingSearchQuery || store.searchQuery || '').toLowerCase().trim();
  const statusFilter = store.trackingStatusFilter || 'ALL';

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return '<span class="badge badge-success" aria-label="Status: Approved">✓ APPROVED</span>';
      case 'COMPLETED':
        return '<span class="badge badge-success" aria-label="Status: Completed">✓ COMPLETED</span>';
      case 'UNDER_REVIEW':
      case 'IN_PROGRESS':
        return '<span class="badge badge-info" aria-label="Status: Under Review">🔍 UNDER REVIEW</span>';
      case 'CLARIFICATION_REQUIRED':
        return '<span class="badge badge-warning" aria-label="Status: Action Required">⚠️ CLARIFICATION REQUIRED</span>';
      case 'REJECTED':
      case 'FAILED':
        return '<span class="badge badge-urgent" aria-label="Status: Rejected">✕ REJECTED</span>';
      case 'SUBMITTED':
      case 'RECEIVED':
        return '<span class="badge badge-neutral" aria-label="Status: Submitted">📋 SUBMITTED</span>';
      default:
        return `<span class="badge badge-neutral">● ${status || 'PENDING'}</span>`;
    }
  };

  // Filter application list
  const filteredApps = rawApps.filter(a => {
    const id = (a.id || a.applicationId || '').toLowerCase();
    const service = (a.serviceName || '').toLowerCase();
    const dept = (a.departmentCode || a.department || '').toLowerCase();
    const st = (a.status || a.currentStatus || '').toUpperCase();

    const matchesQuery = !query || id.includes(query) || service.includes(query) || dept.includes(query);
    const matchesStatus = statusFilter === 'ALL' || st === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return `
    <div class="application-tracking-view" style="max-width: 1050px; margin: 0 auto; padding-bottom: 48px;">
      <!-- Section Header -->
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 24px;">
        <div>
          <h2 class="section-title">Application Tracking & Status — Citizen Application Tracking</h2>
          <p class="section-subtitle">
            Real-time lifecycle tracking across all submitted applications and inter-department orchestration steps.
          </p>
        </div>
        ${activeApp ? `
          <button class="btn btn-outline btn-sm" onclick="window.app.closeTrackingDetail()">
            ← Back to My Applications List
          </button>
        ` : `
          <button class="btn btn-outline btn-sm" onclick="window.app.refreshCitizenApplications()">
            🔄 Refresh Status
          </button>
        `}
      </div>

      <!-- Detail View (When an Application is selected) -->
      ${activeApp ? `
        <div id="tracking-detail-card" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 28px; box-shadow: var(--shadow-sm); margin-bottom: 28px;">
          <!-- Detail Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 20px; margin-bottom: 22px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <span style="font-family: var(--font-mono); font-weight: 800; font-size: 16px; color: var(--color-primary);">
                  ${activeApp.applicationId || activeApp.id}
                </span>
                ${getStatusBadge(activeApp.status)}
                <span class="badge badge-outline">🏛️ ${activeApp.departmentCode || activeApp.department}</span>
              </div>
              <h3 style="font-size: 22px; font-weight: 800; color: var(--text-main); margin: 0 0 6px 0;">
                ${activeApp.serviceName}
              </h3>
              <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
                Submitted on: <strong>${activeApp.submittedDate || 'Recent'}</strong> • Current Stage: <strong style="color: var(--color-primary);">${activeApp.currentStage || 'Processing'}</strong>
              </p>
            </div>
            
            <!-- Progress Circle / Metric -->
            <div style="text-align: right; min-width: 140px;">
              <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Progress Status</div>
              <div style="font-size: 24px; font-weight: 800; color: var(--color-primary);">${activeApp.progressPercentage || 50}%</div>
              <div style="height: 8px; width: 140px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-top: 4px;">
                <div style="height: 100%; width: ${activeApp.progressPercentage || 50}%; background: var(--color-primary); border-radius: 4px; transition: width 0.3s ease;"></div>
              </div>
            </div>
          </div>

          <!-- Decision / Verdict Alert Banner (if Approved or Rejected) -->
          ${activeApp.status === 'APPROVED' ? `
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-md); padding: 16px 20px; margin-bottom: 24px; display: flex; gap: 14px; align-items: center;">
              <span style="font-size: 28px;">🎉</span>
              <div>
                <h4 style="font-size: 15px; font-weight: 700; color: #166534; margin: 0 0 4px 0;">Application Approved by Department</h4>
                <p style="font-size: 13px; color: #15803d; margin: 0;">
                  ${activeApp.decision?.remarks || 'All statutory verification checks successfully concluded. Final order scheduled for delivery.'}
                </p>
              </div>
            </div>
          ` : ''}

          ${activeApp.status === 'COMPLETED' ? `
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-md); padding: 16px 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div style="display: flex; gap: 14px; align-items: center;">
                <span style="font-size: 28px;">📜</span>
                <div>
                  <h4 style="font-size: 15px; font-weight: 700; color: #1e40af; margin: 0 0 4px 0;">Service Fulfilled & Digitally Dispatched</h4>
                  <p style="font-size: 13px; color: #1d4ed8; margin: 0;">Your digital certificate or approval deed has been finalized and issued.</p>
                </div>
              </div>
              ${activeApp.certificateUrl ? `
                <a href="${activeApp.certificateUrl}" target="_blank" class="btn btn-primary btn-sm">
                  📥 Download Certificate
                </a>
              ` : ''}
            </div>
          ` : ''}

          ${activeApp.status === 'REJECTED' ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-md); padding: 16px 20px; margin-bottom: 24px; display: flex; gap: 14px; align-items: flex-start;">
              <span style="font-size: 28px;">⚠️</span>
              <div>
                <h4 style="font-size: 15px; font-weight: 700; color: #991b1b; margin: 0 0 4px 0;">Application Rejected</h4>
                <p style="font-size: 13px; color: #b91c1c; margin: 0 0 6px 0;">
                  <strong>Documented Reason:</strong> ${activeApp.decision?.reason || 'Criteria not met'}
                </p>
                ${activeApp.decision?.remarks ? `
                  <p style="font-size: 12px; color: #7f1d1d; margin: 0;">Officer Remarks: ${activeApp.decision.remarks}</p>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <!-- Citizen Action: Clarification Required Section -->
          ${activeApp.status === 'CLARIFICATION_REQUIRED' && activeApp.pendingClarifications && activeApp.pendingClarifications.length > 0 ? `
            <div id="clarification-action-box" style="background: #fffbeb; border: 2px solid #fde68a; border-radius: var(--radius-lg); padding: 22px; margin-bottom: 28px; box-shadow: var(--shadow-sm);">
              <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 14px;">
                <span style="font-size: 24px;">🔔</span>
                <div>
                  <h3 style="font-size: 16px; font-weight: 800; color: #92400e; margin: 0;">
                    Action Required: Information / Document Clarification Requested
                  </h3>
                  <p style="font-size: 13px; color: #b45309; margin: 2px 0 0 0;">
                    The department review officer has requested additional details before your application can proceed.
                  </p>
                </div>
              </div>

              ${activeApp.pendingClarifications.map(c => `
                <div style="background: #ffffff; border: 1px solid #fef3c7; border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
                  <div style="font-size: 13px; color: var(--text-main); margin-bottom: 6px;">
                    <strong>Requested Information:</strong> ${c.requestedInfo}
                  </div>
                  <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
                    <strong>Officer Justification:</strong> ${c.reason}
                  </div>

                  <div style="border-top: 1px solid #fef3c7; padding-top: 12px;">
                    <label for="clarification-response-text-${c.clarificationId}" style="display: block; font-size: 12px; font-weight: 600; color: var(--text-main); margin-bottom: 6px;">
                      Your Written Explanation / Document Reference:
                    </label>
                    <textarea id="clarification-response-text-${c.clarificationId}" rows="3" placeholder="Enter your response and reference details..."
                      style="width: 100%; padding: 8px 10px; font-size: 13px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 10px;"></textarea>

                    <button class="btn btn-warning btn-sm" onclick="window.app.submitClarificationResponse('${activeApp.applicationId || activeApp.id}', '${c.clarificationId}')">
                      📤 Submit Clarification Response
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- High-Level Workflow Milestones (Phase 6 Orchestration derived) -->
          ${activeApp.orchestrationMilestones && activeApp.orchestrationMilestones.length > 0 ? `
            <div style="background: var(--color-bg); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 20px; margin-bottom: 26px;">
              <h3 style="font-size: 15px; font-weight: 700; color: var(--color-primary-dark); margin: 0 0 14px 0;">
                Department Interoperability & Verification Milestones
              </h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
                ${activeApp.orchestrationMilestones.map(m => `
                  <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; display: flex; gap: 10px; align-items: center;">
                    <span style="font-size: 18px;">${m.completed ? '✅' : (m.status === 'RUNNING' ? '⏳' : '⚪')}</span>
                    <div>
                      <div style="font-size: 12px; font-weight: 700; color: var(--text-main);">${m.title}</div>
                      <div style="font-size: 11px; color: var(--text-muted);">${m.department}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Visual Progress Timeline Stepper (Generated from Stored Events) -->
          <div style="margin-top: 26px;">
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin: 0 0 18px 0;">
              📜 Application Lifecycle Audit Timeline
            </h3>

            ${(!activeApp.timeline || activeApp.timeline.length === 0) ? `
              <p style="font-size: 13px; color: var(--text-muted);">No timeline records registered yet.</p>
            ` : `
              <div style="position: relative; padding-left: 28px; border-left: 3px solid var(--color-primary-light); margin-left: 12px;">
                ${activeApp.timeline.map((item, idx) => `
                  <div style="position: relative; margin-bottom: 22px;">
                    <!-- Timeline Marker Node -->
                    <div style="position: absolute; left: -36px; top: 0; width: 16px; height: 16px; border-radius: 50%; background: var(--color-primary); border: 3px solid #ffffff; box-shadow: 0 0 0 2px var(--color-primary);"></div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                      <div>
                        <span style="font-size: 13px; font-weight: 700; color: var(--color-primary-dark); text-transform: uppercase;">
                          ${item.event || item.name}
                        </span>
                        <p style="font-size: 13px; color: var(--text-main); margin: 4px 0 0 0;">
                          ${item.description || item.details || ''}
                        </p>
                      </div>
                      <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
                        ${item.timestamp ? new Date(item.timestamp).toLocaleString() : (item.date || '')}
                      </span>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      ` : ''}

      <!-- My Applications List / Table View -->
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm);">
        <!-- Search and Filter Toolbar -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 20px;">
          <div>
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin: 0 0 4px 0;">
              My Submitted Applications
            </h3>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
              Select an application to view real-time stage progress and officer review status.
            </p>
          </div>

          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <input 
              type="text" 
              id="trackingIdInput" 
              placeholder="Search by ID or service..." 
              value="${store.trackingSearchQuery || store.searchQuery || ''}"
              style="padding: 8px 12px; font-size: 13px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); width: 220px;"
              oninput="window.app.setTrackingSearch ? window.app.setTrackingSearch(this.value) : window.app.setSearch(this.value)"
            />

            <select id="tracking-status-select" 
              style="padding: 8px 12px; font-size: 13px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);"
              onchange="window.app.setTrackingStatusFilter(this.value)">
              <option value="ALL" ${statusFilter === 'ALL' ? 'selected' : ''}>All Statuses</option>
              <option value="SUBMITTED" ${statusFilter === 'SUBMITTED' ? 'selected' : ''}>Submitted</option>
              <option value="UNDER_REVIEW" ${statusFilter === 'UNDER_REVIEW' ? 'selected' : ''}>Under Review</option>
              <option value="CLARIFICATION_REQUIRED" ${statusFilter === 'CLARIFICATION_REQUIRED' ? 'selected' : ''}>Clarification Required</option>
              <option value="APPROVED" ${statusFilter === 'APPROVED' ? 'selected' : ''}>Approved</option>
              <option value="REJECTED" ${statusFilter === 'REJECTED' ? 'selected' : ''}>Rejected</option>
              <option value="COMPLETED" ${statusFilter === 'COMPLETED' ? 'selected' : ''}>Completed</option>
            </select>
          </div>
        </div>

        ${filteredApps.length === 0 ? `
          <div style="text-align: center; padding: 48px 20px; background: var(--color-bg); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
            <div style="font-size: 36px; margin-bottom: 10px;">📂</div>
            <h4 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin: 0 0 6px 0;">No Applications Found</h4>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 16px 0;">
              ${query || statusFilter !== 'ALL' ? 'No applications match your active filters.' : 'You have not submitted any government service applications yet.'}
            </p>
            ${query || statusFilter !== 'ALL' ? `
              <button class="btn btn-outline btn-sm" onclick="window.app.resetTrackingFilters ? window.app.resetTrackingFilters() : window.app.resetSearch()">
                Reset Filters
              </button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="window.app.navigate('catalog')">
                Explore Service Catalog & Apply →
              </button>
            `}
          </div>
        ` : `
          <!-- Interop audit trail preview for existing store model applications -->
          ${filteredApps.some(a => a.interopLog) ? `
            <div style="margin-bottom: 18px;">
              ${filteredApps.filter(a => a.interopLog).map(app => `
                <div class="tracker-container" style="margin-bottom: 16px; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; background: #fafafa;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-family: var(--font-mono); font-weight: 700; color: var(--color-primary);">${app.id}</span>
                    <span class="badge badge-info">${app.currentStatus}</span>
                  </div>
                  <div class="stepper" style="display: flex; gap: 8px; font-size: 12px; margin-bottom: 8px; flex-wrap: wrap;">
                    ${(app.timeline || []).map(step => `
                      <span class="step-item ${step.active ? 'active' : ''}">
                        ${step.name}: ${step.details || step.date}
                      </span>
                    `).join(' • ')}
                  </div>
                  <div class="tracker-details-grid" style="font-size: 12px; color: var(--text-muted);">
                    <strong>Interoperability Request sent to Revenue Adapter</strong>
                    <div>${app.interopLog}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-size: 12px; text-transform: uppercase;">
                  <th style="padding: 10px 12px;">Application ID</th>
                  <th style="padding: 10px 12px;">Service Requested</th>
                  <th style="padding: 10px 12px;">Department</th>
                  <th style="padding: 10px 12px;">Submission Date</th>
                  <th style="padding: 10px 12px;">Current Status</th>
                  <th style="padding: 10px 12px; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${filteredApps.map(app => {
                  const appId = app.id || app.applicationId;
                  const st = app.status || app.currentStatus;
                  return `
                    <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='transparent'">
                      <td style="padding: 12px; font-family: var(--font-mono); font-weight: 700; color: var(--color-primary);">${appId}</td>
                      <td style="padding: 12px; font-weight: 600; color: var(--text-main);">${app.serviceName}</td>
                      <td style="padding: 12px; color: var(--text-muted);">${app.departmentCode || app.department}</td>
                      <td style="padding: 12px; color: var(--text-muted);">${app.submittedDate || 'Recent'}</td>
                      <td style="padding: 12px;">${getStatusBadge(st)}</td>
                      <td style="padding: 12px; text-align: right;">
                        <button class="btn btn-sm btn-primary" onclick="window.app.openApplicationTrackingDetail('${appId}')">
                          Track Status →
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
    </div>
  `;
}
