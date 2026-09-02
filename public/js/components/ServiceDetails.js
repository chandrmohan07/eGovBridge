/**
 * Component: ServiceDetails
 * Deep-dive detail view for a specific government service before starting application.
 */

export function renderServiceDetails(store, serviceId) {
  const service = store.services.find(s => s.id === serviceId) || store.activeServiceDetails;

  if (!service) {
    return `
      <div style="max-width: 600px; margin: 48px auto; text-align: center; background: #ffffff; padding: 36px; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
        <div style="font-size: 40px; margin-bottom: 12px;">⚠️</div>
        <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">Service Not Found</h3>
        <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 20px;">
          The requested service ID "<strong>${serviceId || 'unknown'}</strong>" does not exist in the catalog or may have been updated.
        </p>
        <button class="btn btn-primary" onclick="window.app.navigate('services')">
          ← Back to Service Catalog
        </button>
      </div>
    `;
  }

  return `
    <div class="service-details-container">
      <!-- Breadcrumb Navigation -->
      <div style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <button class="btn btn-outline btn-sm" onclick="window.app.navigate('services')">
          ← Back to Service Catalog
        </button>
        <div style="font-size: 13px; color: var(--text-muted);">
          <span>Catalog</span> &gt; <span>${service.department}</span> &gt; <strong style="color: var(--color-primary);">${service.id}</strong>
        </div>
      </div>

      <!-- Service Detail Header Card -->
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 28px; box-shadow: var(--shadow-sm); margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span class="badge badge-neutral" style="font-family: var(--font-mono); font-weight: 700;">${service.id}</span>
              <span class="badge badge-info">${service.category}</span>
              <span class="badge badge-success">● ${service.applicationAvailability}</span>
              <span class="badge badge-mock">${service.integrationStatus || 'Adapter Active'}</span>
            </div>
            <h1 style="font-size: 24px; font-weight: 700; color: var(--color-primary-dark); line-height: 1.3;">
              ${service.title}
            </h1>
            <p style="font-size: 14px; color: var(--color-primary-light); font-weight: 600; margin-top: 4px;">
              🏛️ ${service.department} (${service.departmentCode})
            </p>
          </div>

          <!-- Primary Start Application Action -->
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
            <button class="btn btn-primary" style="padding: 10px 24px; font-size: 15px; font-weight: 600;" onclick="window.app.openApplyPlaceholder('${service.id}')">
              🚀 Start Application
            </button>
            <span style="font-size: 11px; color: var(--text-muted);">Unified Digital Single-Entry</span>
          </div>
        </div>

        <p style="font-size: 15px; color: var(--text-main); line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          ${service.description}
        </p>

        <!-- Key Metrics Strip -->
        <div class="tracker-details-grid" style="margin-top: 20px;">
          <div class="tracker-detail-item">
            <strong>Estimated Turnaround SLA</strong>
            <span style="color: var(--color-primary-light);">⏱️ ${service.turnaroundTime}</span>
          </div>
          <div class="tracker-detail-item">
            <strong>Application Fee</strong>
            <span style="color: var(--color-success);">${service.fee || 'Free'}</span>
          </div>
          <div class="tracker-detail-item">
            <strong>Submission Method</strong>
            <span>${service.applicationMethod}</span>
          </div>
          <div class="tracker-detail-item">
            <strong>Integration Layer</strong>
            <span style="font-size: 12px; color: #7e22ce;">${service.adapterCode || 'CANONICAL_ADAPTER'}</span>
          </div>
        </div>
      </div>

      <!-- Detailed Breakdown Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        <!-- Left Column: Eligibility & Who Can Apply -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm);">
            <h3 style="font-size: 16px; font-weight: 700; color: var(--color-primary-dark); margin-bottom: 12px;">
              👥 Who Can Apply
            </h3>
            <p style="font-size: 14px; color: var(--text-main); line-height: 1.5; background: #f8fafc; padding: 12px; border-radius: var(--radius-md); border-left: 4px solid var(--color-primary);">
              ${service.whoCanApply || 'Eligible citizens fulfilling criteria below.'}
            </p>
          </div>

          <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm);">
            <h3 style="font-size: 16px; font-weight: 700; color: var(--color-primary-dark); margin-bottom: 12px;">
              ✅ Eligibility Criteria Checklist
            </h3>
            <div style="font-size: 14px; color: var(--text-main); line-height: 1.6;">
              ${service.eligibility}
            </div>
          </div>
        </div>

        <!-- Right Column: Required Documents & Verification -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm);">
            <h3 style="font-size: 16px; font-weight: 700; color: var(--color-primary-dark); margin-bottom: 12px;">
              📁 Required Documents Checklist
            </h3>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
              Documents verified automatically through government interoperability adapters when linked via DigiLocker.
            </p>
            <ul style="display: flex; flex-direction: column; gap: 10px;">
              ${service.requiredDocuments.map(doc => `
                <li style="display: flex; align-items: center; gap: 10px; font-size: 13px; background: #f8fafc; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid #f1f5f9;">
                  <span style="color: var(--color-success); font-weight: 700;">✓</span>
                  <span style="font-weight: 600; color: var(--text-main);">${doc}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <!-- Official Portal Reference -->
          <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm);">
            <h3 style="font-size: 16px; font-weight: 700; color: var(--color-primary-dark); margin-bottom: 12px;">
              🏛️ Official Government Information Source
            </h3>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
              This service is officially hosted and governed by the Government of India. You may consult the nodal source for scheme circulars and guidelines:
            </p>
            <a href="${service.officialUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
              <span>Official Reference Portal ↗</span>
              <span style="font-size: 11px; color: var(--text-muted);">(${service.officialUrl})</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h4 style="font-size: 15px; font-weight: 700;">Ready to submit your application?</h4>
          <p style="font-size: 13px; color: var(--text-muted);">One single application form with instant inter-department document verification.</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-outline" onclick="window.app.navigate('services')">
            ← Explore Other Services
          </button>
          <button class="btn btn-primary" onclick="window.app.openApplyPlaceholder('${service.id}')">
            🚀 Start Application
          </button>
        </div>
      </div>
    </div>
  `;
}
