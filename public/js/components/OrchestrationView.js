/**
 * Component: OrchestrationView
 * Real-time visualization of multi-department DAG execution, dependencies, retries, and task statuses.
 */

export function renderOrchestrationView(store, orchId) {
  const orch = (store.activeOrchestration && store.activeOrchestration.id === orchId) 
    ? store.activeOrchestration 
    : (store.orchestrations && store.orchestrations.find(o => o.id === orchId));

  if (!orch) {
    return `
      <div style="max-width: 650px; margin: 48px auto; text-align: center; background: #ffffff; padding: 36px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
        <div style="font-size: 42px; margin-bottom: 12px;">⚙️</div>
        <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">
          Orchestration Record Not Found
        </h3>
        <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 20px;">
          The requested orchestration ID "<strong>${orchId || 'unknown'}</strong>" does not exist or has not been initiated yet.
        </p>
        <button class="btn btn-primary" onclick="window.app.navigate('tracking')">
          ← Back to Application Tracking
        </button>
      </div>
    `;
  }

  const tasks = orch.tasks || [];
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Status Badge Class
  let statusBadgeClass = 'badge-neutral';
  if (orch.status === 'COMPLETED') statusBadgeClass = 'badge-success';
  else if (orch.status === 'RUNNING') statusBadgeClass = 'badge-info';
  else if (orch.status === 'FAILED') statusBadgeClass = 'badge-urgent';
  else if (orch.status === 'PARTIALLY_COMPLETED') statusBadgeClass = 'badge-warning';

  return `
    <div class="orchestration-container" style="max-width: 950px; margin: 0 auto;">
      <!-- Breadcrumbs & Navigation -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <button class="btn btn-outline btn-sm" onclick="window.app.navigate('tracking')">
          ← Back to Application Tracking
        </button>
        <div style="font-size: 13px; color: var(--text-muted);">
          <span>Tracking</span> &gt; <span>${orch.applicationId}</span> &gt; <strong style="color: var(--color-primary);">${orch.id}</strong>
        </div>
      </div>

      <!-- Orchestration Overview Card -->
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm); margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span class="badge badge-neutral" style="font-family: var(--font-mono); font-weight: 700;">${orch.id}</span>
              <span class="badge ${statusBadgeClass}">● ${orch.status}</span>
              <span class="badge badge-mock">Mock Interoperability Adapters</span>
            </div>
            <h1 style="font-size: 22px; font-weight: 700; color: var(--color-primary-dark); line-height: 1.3;">
              Smart Orchestration Engine
            </h1>
            <p style="font-size: 14px; color: var(--text-muted); margin-top: 4px;">
              Service: <strong>${orch.serviceName}</strong> • Application ID: <strong style="font-family: var(--font-mono);">${orch.applicationId}</strong>
            </p>
          </div>

          <!-- Execution Controls -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${orch.status !== 'COMPLETED' ? `
              <button class="btn btn-outline btn-sm" onclick="window.app.stepOrchestration('${orch.id}')">
                ⚡ Step Execution
              </button>
              <button class="btn btn-primary btn-sm" onclick="window.app.executeOrchestration('${orch.id}')">
                🚀 Execute Full Workflow
              </button>
            ` : `
              <span class="badge badge-success" style="font-size: 13px; padding: 6px 12px;">
                ✓ Orchestration Successfully Finalized
              </span>
            `}
          </div>
        </div>

        <!-- Progress Percentage Bar -->
        <div style="margin-top: 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
            <span style="font-weight: 600; color: var(--text-main);">Execution Progress (${completedCount} of ${tasks.length} tasks completed)</span>
            <span style="font-weight: 700; color: var(--color-primary);">${progressPercent}%</span>
          </div>
          <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
            <div style="width: ${progressPercent}%; height: 100%; background: ${progressPercent === 100 ? 'var(--color-success)' : 'var(--color-primary)'}; transition: width 0.3s ease;"></div>
          </div>
        </div>
      </div>

      <!-- Task Dependency Graph / List -->
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <h3 style="font-size: 16px; font-weight: 700; color: var(--color-primary-dark); margin-bottom: 4px;">
          Inter-Department Workflow Task Plan (Directed Acyclic Graph)
        </h3>

        ${tasks.map((task, idx) => {
          let taskPill = 'badge-neutral';
          if (task.status === 'COMPLETED') taskPill = 'badge-success';
          else if (task.status === 'READY') taskPill = 'badge-info';
          else if (task.status === 'IN_PROGRESS') taskPill = 'badge-primary';
          else if (task.status === 'FAILED') taskPill = 'badge-urgent';
          else if (task.status === 'BLOCKED') taskPill = 'badge-neutral';
          else if (task.status === 'RETRYING') taskPill = 'badge-warning';

          return `
            <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; box-shadow: var(--shadow-sm); border-left: 4px solid ${task.status === 'COMPLETED' ? 'var(--color-success)' : task.status === 'FAILED' ? '#ef4444' : task.status === 'READY' ? 'var(--color-primary)' : '#cbd5e1'};">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 12px; font-family: var(--font-mono); color: var(--text-muted); font-weight: 700;">Task ${idx + 1}</span>
                    <h4 style="font-size: 15px; font-weight: 700; color: var(--color-primary-dark);">${task.title}</h4>
                  </div>
                  <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
                    🏛️ ${task.department} • Adapter: <code>${task.adapterCode}</code>
                  </p>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge ${taskPill}">● ${task.status}</span>
                  ${task.status === 'FAILED' || task.status === 'RETRYING' ? `
                    <button class="btn btn-outline btn-sm" style="color: #ef4444; border-color: #fca5a5;" onclick="window.app.retryOrchestrationTask('${orch.id}', '${task.code}')">
                      🔁 Retry Task
                    </button>
                  ` : ''}
                </div>
              </div>

              <p style="font-size: 13px; color: var(--text-main); margin-bottom: 12px; line-height: 1.4;">
                ${task.description}
              </p>

              <!-- Dependencies & Output Strip -->
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; background: #f8fafc; padding: 8px 12px; border-radius: var(--radius-sm); flex-wrap: wrap; gap: 8px;">
                <div>
                  <strong>Prerequisites:</strong> 
                  ${task.dependencies.length === 0 
                    ? '<span style="color: var(--color-success);">None (Independent Task)</span>' 
                    : task.dependencies.map(d => `<code style="background: #e2e8f0; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${d}</code>`).join(' ')}
                </div>

                <div>
                  ${task.output ? `
                    <span style="color: var(--color-success); font-weight: 600;">
                      ✓ Verified: ${task.output.verdict} (${task.output.referenceId})
                    </span>
                  ` : task.error ? `
                    <span style="color: #ef4444; font-weight: 600;">
                      ⚠️ Error: ${task.error}
                    </span>
                  ` : `
                    <span style="color: var(--text-muted);">
                      Retries: ${task.retryCount} / ${task.maxRetries}
                    </span>
                  `}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
