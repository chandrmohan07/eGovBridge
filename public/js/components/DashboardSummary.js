/**
 * Component: DashboardSummary
 * Renders the top-level citizen dashboard overview with interoperability highlights
 * and Phase 18 Personalized Information, Action Cards, and Explainable Recommendations.
 */

export function renderDashboardSummary(store) {
  const summary = store.dashboardSummary;
  const recentApp = store.applications[0];
  const personalization = store.personalization || {
    enabled: true,
    preferences: { persona: 'STUDENT', preferredLocation: 'Maharashtra' },
    actionCards: [],
    recommendations: { services: [], scholarships: [], schemes: [], employment: [] }
  };

  const persona = personalization.preferences?.persona || 'GENERAL';
  const isEnabled = personalization.enabled !== false;

  return `
    <div class="dashboard-overview" style="max-width: 1100px; margin: 0 auto;">
      <!-- Header Area -->
      <div class="section-header">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
            <h2 class="section-title" style="margin: 0;">Citizen Service Dashboard</h2>
            <span class="badge ${isEnabled ? 'badge-primary' : 'badge-neutral'}" style="font-size: 11px;">
              🎯 Persona: ${persona}
            </span>
          </div>
          <p class="section-subtitle">Welcome back, ${store.citizenProfile.name}. Discover, apply for, and track all government services from a single unified interface.</p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <div class="badge badge-success" style="padding: 6px 12px; font-size: 13px;">
            <span class="status-dot"></span> Interoperability Gateway: Active
          </div>
        </div>
      </div>

      <!-- Core SIH Architecture Showcase Banner -->
      <div class="interop-banner">
        <h2>Unified Digital Governance & Interoperability Layer</h2>
        <p>
          You enter your information once. Our smart orchestration engine connects directly with department adapters (Education, Revenue, Land, Health) to automatically verify documents and eliminate redundant administrative paperwork.
        </p>
        <div class="interop-features">
          <span class="interop-tag">⚡ Canonical Data Model</span>
          <span class="interop-tag">🛡️ Controlled Inter-Department Exchange</span>
          <span class="interop-tag">🤖 AI Citizen Assistance</span>
          <span class="interop-tag">📁 Digital Document Vault</span>
          <span class="interop-tag">🎯 Single Source of Truth</span>
          <span class="interop-tag">👤 Personalized Discovery</span>
        </div>
      </div>

      <!-- Phase 18: Action Cards (If Active Tasks/Clarifications Exist) -->
      ${personalization.actionCards && personalization.actionCards.length > 0 ? `
        <div class="action-cards-container" style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
          ${personalization.actionCards.map(action => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: var(--radius-md); padding: 14px 18px; flex-wrap: wrap; gap: 10px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                  <span style="font-size: 14px;">⚠️</span>
                  <strong style="font-size: 14px; color: #92400e;">${action.title}</strong>
                  <span class="badge badge-warning" style="font-size: 10px;">${action.priority}</span>
                </div>
                <p style="font-size: 12px; color: #78350f; margin: 0;">${action.message}</p>
              </div>
              <button 
                class="btn btn-primary btn-sm"
                onclick="window.app.navigate('${action.targetTab || 'tracking'}')"
              >
                ${action.actionLabel || 'View Action'} →
              </button>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Metrics Cards -->
      <div class="metrics-grid">
        <div class="metric-card" onclick="window.app.navigate('tracking')" style="cursor: pointer;">
          <div class="metric-info">
            <span class="metric-label">Active Applications</span>
            <span class="metric-value">${summary.activeApplications}</span>
            <span class="metric-sub">1 under cross-verification</span>
          </div>
          <div class="metric-icon-box icon-blue">📋</div>
        </div>

        <div class="metric-card" onclick="window.app.navigate('scholarships')" style="cursor: pointer;">
          <div class="metric-info">
            <span class="metric-label">Eligible Scholarships</span>
            <span class="metric-value">${summary.eligibleScholarships}</span>
            <span class="metric-sub">2 matching your profile</span>
          </div>
          <div class="metric-icon-box icon-amber">🎓</div>
        </div>

        <div class="metric-card" onclick="window.app.navigate('profile')" style="cursor: pointer;">
          <div class="metric-info">
            <span class="metric-label">Vault Documents</span>
            <span class="metric-value">${summary.vaultDocuments}</span>
            <span class="metric-sub">Verified & Linked</span>
          </div>
          <div class="metric-icon-box icon-green">🔐</div>
        </div>

        <div class="metric-card" onclick="window.app.navigate('ai-help')" style="cursor: pointer;">
          <div class="metric-info">
            <span class="metric-label">AI Citizen Help</span>
            <span class="metric-value">Online</span>
            <span class="metric-sub">Grounded guidance ready</span>
          </div>
          <div class="metric-icon-box icon-purple">🤖</div>
        </div>
      </div>

      <!-- Quick Application Highlight -->
      <div class="tracker-container" style="margin-top: 24px;">
        <div class="tracker-header">
          <div>
            <span class="badge badge-info" style="margin-bottom: 6px;">Live Application Tracker</span>
            <h3 style="font-size: 17px; font-weight: 700; color: var(--text-main);">${recentApp.serviceName}</h3>
            <span style="font-size: 13px; color: var(--text-muted);">Application ID: <strong>${recentApp.id}</strong> • Department: ${recentApp.department}</span>
          </div>
          <button class="btn btn-outline btn-sm" onclick="window.app.navigate('tracking')">Full Timeline & Log →</button>
        </div>

        <div class="tracker-details-grid">
          <div class="tracker-detail-item">
            <strong>Current Stage</strong>
            <span style="color: var(--color-accent);">${recentApp.currentStatus}</span>
          </div>
          <div class="tracker-detail-item">
            <strong>Last Updated</strong>
            <span>${recentApp.lastUpdated}</span>
          </div>
          <div class="tracker-detail-item">
            <strong>Automated Interoperability</strong>
            <span style="font-size: 12px; color: var(--text-muted); font-weight: 500;">Income verification requested via Revenue Adapter</span>
          </div>
        </div>
      </div>

      <!-- Quick Service Discovery Preview -->
      <div style="margin-top: 32px;">
        <div class="section-header" style="margin-bottom: 16px;">
          <div>
            <h3 style="font-size: 18px; font-weight: 700;">Featured Unified Services</h3>
            <p style="font-size: 13px; color: var(--text-muted);">Apply online without physical department visits.</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.app.navigate('services')">View All Services →</button>
        </div>

        <div class="cards-grid">
          ${store.services.slice(0, 3).map(service => `
            <div class="service-card">
              <div>
                <div class="service-card-top">
                  <span class="service-dept">${service.department}</span>
                  <span class="badge badge-mock">${service.integrationStatus}</span>
                </div>
                <h4 class="service-card-title">${service.title}</h4>
                <p class="service-card-desc">${service.description}</p>
                <div class="service-tags">
                  ${service.requiredDocuments.slice(0, 3).map(doc => `<span class="badge badge-neutral">${doc}</span>`).join('')}
                </div>
              </div>
              <div class="service-card-footer">
                <span class="service-tat">⏱️ ${service.turnaroundTime}</span>
                <button class="btn btn-primary btn-sm" onclick="window.app.openApplyPlaceholder('${service.id}')">Apply Now</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}
