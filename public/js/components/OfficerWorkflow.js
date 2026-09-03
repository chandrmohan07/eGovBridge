/**
 * Component: OfficerWorkflow
 * Department Officer Console: Application Queue, Review Scrutiny, Document Verification,
 * Clarification Requests, Internal Notes, Timeline Auditing, and Approval/Rejection Workflow.
 */

export function renderOfficerWorkflow(store) {
  const user = store.user || {};
  const officerDept = user.departmentCode || 'EDUCATION';
  const queue = store.officerQueue || [];
  const activeApp = store.activeOfficerApplication || null;
  const workload = store.officerWorkload || {
    total: queue.length,
    pending: 0,
    underReview: 0,
    clarificationRequired: 0,
    approved: 0,
    rejected: 0,
    completed: 0
  };

  // Status Badge Class Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
      case 'COMPLETED':
        return '<span class="badge badge-success">● ' + status + '</span>';
      case 'UNDER_REVIEW':
      case 'IN_PROGRESS':
        return '<span class="badge badge-info">● ' + status + '</span>';
      case 'CLARIFICATION_REQUIRED':
        return '<span class="badge badge-warning">● CLARIFICATION REQUIRED</span>';
      case 'REJECTED':
      case 'FAILED':
        return '<span class="badge badge-urgent">● ' + status + '</span>';
      default:
        return '<span class="badge badge-neutral">● ' + status + '</span>';
    }
  };

  return `
    <div class="officer-workflow-container" style="max-width: 1100px; margin: 0 auto; padding-bottom: 48px;">
      <!-- Officer Header & Department Banner -->
      <div style="background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%); color: #ffffff; padding: 24px 28px; border-radius: var(--radius-lg); margin-bottom: 24px; box-shadow: var(--shadow-md);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
              <span class="badge" style="background: rgba(255,255,255,0.2); color: #ffffff; font-weight: 700;">
                OFFICER CONSOLE
              </span>
              <span class="badge" style="background: var(--color-accent-amber); color: #000; font-weight: 700;">
                🏛️ ${officerDept} DEPARTMENT
              </span>
              <span class="badge" style="background: rgba(255,255,255,0.15); color: #ffffff;">
                Phase 11 Scrutiny Engine
              </span>
            </div>
            <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 6px 0;">
              ${user.name || 'Department Officer'}
            </h1>
            <p style="font-size: 14px; opacity: 0.9; margin: 0;">
              ${user.designation || 'Verification & Scrutiny Officer'} • Assigned Jurisdiction: ${user.state || 'All States'} / ${user.district || 'Headquarters'}
            </p>
          </div>
          <button class="btn btn-outline" style="color: #fff; border-color: rgba(255,255,255,0.4);" onclick="window.app.loadOfficerQueue()">
            🔄 Refresh Queue
          </button>
        </div>
      </div>

      <!-- Workload Metric Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 24px;">
        <div style="background: #ffffff; padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); text-align: center;">
          <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Queue Total</div>
          <div style="font-size: 24px; font-weight: 800; color: var(--color-primary);">${workload.total}</div>
        </div>
        <div style="background: #ffffff; padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); text-align: center;">
          <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Pending Review</div>
          <div style="font-size: 24px; font-weight: 800; color: var(--color-warning);">${workload.pending}</div>
        </div>
        <div style="background: #ffffff; padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); text-align: center;">
          <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Under Scrutiny</div>
          <div style="font-size: 24px; font-weight: 800; color: var(--color-info);">${workload.underReview}</div>
        </div>
        <div style="background: #ffffff; padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); text-align: center;">
          <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Clarification</div>
          <div style="font-size: 24px; font-weight: 800; color: var(--color-accent-amber);">${workload.clarificationRequired}</div>
        </div>
        <div style="background: #ffffff; padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); text-align: center;">
          <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Approved</div>
          <div style="font-size: 24px; font-weight: 800; color: var(--color-success);">${workload.approved}</div>
        </div>
        <div style="background: #ffffff; padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); text-align: center;">
          <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Rejected</div>
          <div style="font-size: 24px; font-weight: 800; color: var(--color-urgent);">${workload.rejected}</div>
        </div>
      </div>

      <!-- Application Queue Section -->
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 22px; box-shadow: var(--shadow-sm); margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 18px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin: 0 0 4px 0;">
              Departmental Verification Queue
            </h2>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
              Displaying incoming citizen applications routed to ${officerDept}.
            </p>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="text" id="officer-queue-search" placeholder="Search application or applicant..." 
              style="padding: 8px 12px; font-size: 13px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); width: 240px;"
              oninput="window.app.filterOfficerQueue(this.value)">
            <select id="officer-queue-status-filter" style="padding: 8px 12px; font-size: 13px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);"
              onchange="window.app.filterOfficerQueueStatus(this.value)">
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="CLARIFICATION_REQUIRED">Clarification Required</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>

        ${queue.length === 0 ? `
          <div style="padding: 36px 20px; text-align: center; color: var(--text-muted); background: var(--color-bg); border-radius: var(--radius-md);">
            <div style="font-size: 32px; margin-bottom: 8px;">📂</div>
            <p style="font-size: 14px; margin: 0;">No applications currently in queue for ${officerDept} department.</p>
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-size: 12px; text-transform: uppercase;">
                  <th style="padding: 10px 12px;">Application ID</th>
                  <th style="padding: 10px 12px;">Service Requested</th>
                  <th style="padding: 10px 12px;">Applicant Name</th>
                  <th style="padding: 10px 12px;">Date</th>
                  <th style="padding: 10px 12px;">Status</th>
                  <th style="padding: 10px 12px;">Assigned To</th>
                  <th style="padding: 10px 12px; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${queue.map(a => `
                  <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px; font-family: var(--font-mono); font-weight: 700; color: var(--color-primary);">${a.id}</td>
                    <td style="padding: 12px; font-weight: 600; color: var(--text-main);">${a.serviceName}</td>
                    <td style="padding: 12px;">${a.applicantName || 'Citizen'}</td>
                    <td style="padding: 12px; color: var(--text-muted);">${a.submittedDate || 'Recent'}</td>
                    <td style="padding: 12px;">${getStatusBadge(a.status)}</td>
                    <td style="padding: 12px;">
                      ${a.assignedOfficerName ? `<span style="font-weight: 600; color: var(--text-main);">👤 ${a.assignedOfficerName}</span>` : '<span style="color: var(--text-muted); font-style: italic;">Unassigned</span>'}
                    </td>
                    <td style="padding: 12px; text-align: right;">
                      <button class="btn btn-sm btn-primary" onclick="window.app.openOfficerApplicationDetail('${a.id}')">
                        Inspect & Process →
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- Detail Scrutiny Modal / Drawer -->
      ${activeApp ? `
        <div id="officer-detail-modal" style="background: #ffffff; border: 2px solid var(--color-primary); border-radius: var(--radius-lg); padding: 28px; box-shadow: var(--shadow-lg); margin-top: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 14px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span class="badge badge-neutral" style="font-family: var(--font-mono); font-weight: 700;">${activeApp.id}</span>
                ${getStatusBadge(activeApp.status)}
                <span class="badge badge-outline">Ver. ${activeApp.version || 1}</span>
              </div>
              <h2 style="font-size: 20px; font-weight: 800; color: var(--color-primary-dark); margin: 0 0 4px 0;">
                ${activeApp.serviceName}
              </h2>
              <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
                Current Stage: <strong style="color: var(--text-main);">${activeApp.currentStage || 'Under Scrutiny'}</strong>
              </p>
            </div>
            <button class="btn btn-outline btn-sm" onclick="window.app.closeOfficerDetail()">
              ✕ Close Detail
            </button>
          </div>

          <!-- Application Information Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 24px;">
            <div style="background: var(--color-bg); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <h3 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin: 0 0 10px 0;">Applicant Overview</h3>
              <p style="font-size: 13px; margin: 4px 0;"><strong>Name:</strong> ${activeApp.applicantName || 'Citizen'}</p>
              <p style="font-size: 13px; margin: 4px 0;"><strong>Applicant ID:</strong> ${activeApp.applicantId || 'N/A'}</p>
              <p style="font-size: 13px; margin: 4px 0;"><strong>Submission Date:</strong> ${activeApp.submittedDate || 'Recent'}</p>
              <p style="font-size: 13px; margin: 4px 0;"><strong>Assigned Officer:</strong> ${activeApp.assignedOfficerName || 'Not Assigned'}</p>
            </div>

            <div style="background: var(--color-bg); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <h3 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin: 0 0 10px 0;">Attached Documents</h3>
              ${(!activeApp.documents || activeApp.documents.length === 0) ? `
                <p style="font-size: 13px; color: var(--text-muted); margin: 0;">No documents uploaded</p>
              ` : `
                <ul style="margin: 0; padding-left: 18px; font-size: 13px;">
                  ${activeApp.documents.map(d => `
                    <li style="margin-bottom: 4px;">
                      📄 ${typeof d === 'string' ? d : (d.documentType || d.name || 'Document')}
                      <span class="badge badge-success" style="font-size: 10px; margin-left: 6px;">VERIFIED</span>
                    </li>
                  `).join('')}
                </ul>
              `}
            </div>
          </div>

          <!-- Submitted Form Data -->
          ${activeApp.formData && Object.keys(activeApp.formData).length > 0 ? `
            <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 24px;">
              <h3 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin: 0 0 10px 0;">Submitted Form Details</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 13px;">
                ${Object.entries(activeApp.formData).map(([k, v]) => `
                  <div>
                    <span style="color: var(--text-muted); text-transform: capitalize;">${k.replace(/([A-Z])/g, ' $1')}:</span>
                    <strong style="color: var(--text-main); margin-left: 4px;">${typeof v === 'object' ? JSON.stringify(v) : v}</strong>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Action Controls Bar -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 20px; margin-bottom: 24px;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--color-primary-dark); margin: 0 0 14px 0;">
              Processing Actions & Determination
            </h3>
            
            <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
              ${!activeApp.assignedOfficerId ? `
                <button class="btn btn-primary" onclick="window.app.claimCurrentApplication('${activeApp.id}', ${activeApp.version || 1})">
                  ✋ Claim for Review
                </button>
              ` : ''}

              ${activeApp.status !== 'UNDER_REVIEW' && activeApp.status !== 'APPROVED' && activeApp.status !== 'REJECTED' && activeApp.status !== 'COMPLETED' ? `
                <button class="btn btn-outline" onclick="window.app.startReviewCurrentApplication('${activeApp.id}')">
                  🔍 Start Formal Review
                </button>
              ` : ''}

              <button class="btn btn-warning" onclick="window.app.showClarificationModal('${activeApp.id}')">
                ⚠️ Request Citizen Clarification
              </button>

              ${activeApp.status !== 'APPROVED' && activeApp.status !== 'COMPLETED' && activeApp.status !== 'REJECTED' ? `
                <button class="btn btn-success" onclick="window.app.showApproveModal('${activeApp.id}')">
                  ✓ Approve Application
                </button>

                <button class="btn btn-urgent" onclick="window.app.showRejectModal('${activeApp.id}')">
                  ✕ Reject Application
                </button>
              ` : ''}

              ${activeApp.status === 'APPROVED' ? `
                <button class="btn btn-primary" onclick="window.app.completeCurrentApplication('${activeApp.id}')">
                  🎉 Complete & Issue Certificate
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Internal Officer Notes & Clarifications Tab -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <!-- Internal Notes (Officer Only) -->
            <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin: 0;">
                  🔒 Internal Notes (Officer Only)
                </h4>
              </div>
              <div style="margin-bottom: 12px;">
                <textarea id="officer-internal-note-input" rows="2" placeholder="Add private departmental review notes..." 
                  style="width: 100%; padding: 8px 10px; font-size: 13px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);"></textarea>
                <button class="btn btn-sm btn-outline" style="margin-top: 6px;" onclick="window.app.addNoteToCurrentApplication('${activeApp.id}')">
                  + Add Note
                </button>
              </div>
              <div style="max-height: 180px; overflow-y: auto;">
                ${(!activeApp.internalNotes || activeApp.internalNotes.length === 0) ? `
                  <p style="font-size: 12px; color: var(--text-muted); margin: 0;">No internal notes recorded yet.</p>
                ` : `
                  ${activeApp.internalNotes.map(n => `
                    <div style="background: #f8fafc; border-left: 3px solid var(--color-primary); padding: 8px 10px; margin-bottom: 8px; font-size: 12px;">
                      <div style="font-weight: 600; color: var(--text-main);">${n.officerName} (${n.departmentCode})</div>
                      <div style="color: var(--text-muted);">${n.note}</div>
                      <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">${new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  `).join('')}
                `}
              </div>
            </div>

            <!-- Audit Timeline -->
            <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px;">
              <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin: 0 0 12px 0;">
                📜 Application Audit Stepper
              </h4>
              <div style="max-height: 250px; overflow-y: auto;">
                ${(!activeApp.timeline || activeApp.timeline.length === 0) ? `
                  <p style="font-size: 12px; color: var(--text-muted); margin: 0;">No timeline events yet.</p>
                ` : `
                  ${activeApp.timeline.map(t => `
                    <div style="display: flex; gap: 10px; margin-bottom: 12px; font-size: 12px;">
                      <div style="font-weight: 700; color: var(--color-primary); min-width: 70px;">${t.event}</div>
                      <div>
                        <div style="color: var(--text-main);">${t.description}</div>
                        <div style="font-size: 10px; color: var(--text-muted);">${new Date(t.timestamp).toLocaleString()} • ${t.actor || 'System'}</div>
                      </div>
                    </div>
                  `).join('')}
                `}
              </div>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}
