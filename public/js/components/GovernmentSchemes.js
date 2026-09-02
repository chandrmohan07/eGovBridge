/**
 * Component: GovernmentSchemes
 * Renders national welfare and citizen empowerment schemes.
 */

export function renderGovernmentSchemes(store) {
  const query = (store.searchQuery || '').toLowerCase().trim();

  const schemes = store.schemesListings.filter(s => {
    if (!query) return true;
    return s.title.toLowerCase().includes(query) ||
      s.department.toLowerCase().includes(query) ||
      s.category.toLowerCase().includes(query) ||
      s.targetAudience.toLowerCase().includes(query);
  });

  return `
    <div>
      <div class="section-header">
        <div>
          <h2 class="section-title">Government Schemes Directory</h2>
          <p class="section-subtitle">Discover citizen-centric welfare schemes mapped across central ministries and departments.</p>
        </div>
        <a href="https://www.myscheme.gov.in" target="_blank" rel="noopener noreferrer" class="badge badge-info" style="text-decoration: none;">
          Source: myScheme Platform (myscheme.gov.in) ↗
        </a>
      </div>

      <div class="cards-grid">
        ${schemes.map(sch => `
          <div class="hub-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span class="badge badge-neutral">${sch.category}</span>
              <span class="badge badge-success">Active Scheme</span>
            </div>

            <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); line-height: 1.3;">${sch.title}</h3>
            <span style="font-size: 13px; font-weight: 600; color: var(--color-primary-light);">${sch.department}</span>

            <div style="background: #f8fafc; padding: 10px; border-radius: var(--radius-md); font-size: 12px; margin: 4px 0;">
              <div style="margin-bottom: 4px;"><strong>Benefits:</strong> ${sch.benefits}</div>
              <div><strong>Target Audience:</strong> ${sch.targetAudience}</div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 10px; border-top: 1px solid var(--border-color);">
              <span class="hub-source">
                🏛️ ${sch.source}
              </span>
              <a href="${sch.sourceUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
                Official Scheme Details ↗
              </a>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
