/**
 * Component: GovernmentSchemes
 * Renders national welfare and citizen empowerment schemes from the myScheme platform.
 * Supports searching, category filtering, bookmarking, and direct service cross-linking.
 *
 * MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION
 */

export function renderGovernmentSchemes(store) {
  const query = (store.searchQuery || '').toLowerCase().trim();
  const selectedTab = store.schemesTab || 'ALL';

  const rawList = store.schemesListings || [];

  const schemes = rawList.filter(s => {
    if (selectedTab === 'SAVED') {
      return s.isSaved === true;
    }
    if (!query) return true;
    return (s.title || '').toLowerCase().includes(query) ||
      (s.department || '').toLowerCase().includes(query) ||
      (s.category || '').toLowerCase().includes(query) ||
      (s.targetAudience || '').toLowerCase().includes(query) ||
      (s.benefits || '').toLowerCase().includes(query);
  });

  return `
    <div class="schemes-view" style="max-width: 1100px; margin: 0 auto; padding-bottom: 40px;">
      <!-- Header Area -->
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px; margin-bottom: 18px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <h2 class="section-title" style="margin: 0;">Government Schemes Directory</h2>
            <span class="badge badge-mock" style="font-size: 11px;">MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION</span>
          </div>
          <p class="section-subtitle" style="margin: 0;">
            Discover citizen-centric welfare schemes mapped across central ministries and departments.
          </p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <a href="https://www.myscheme.gov.in" target="_blank" rel="noopener noreferrer" class="badge badge-info" style="text-decoration: none; padding: 6px 12px; font-size: 12px;">
            Source: myScheme Platform (myscheme.gov.in) ↗
          </a>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="hub-tabs" style="display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 6px;">
        <button 
          class="btn ${selectedTab === 'ALL' ? 'btn-primary' : 'btn-outline'} btn-sm" 
          style="border-radius: 20px;"
          onclick="window.app.setSchemesTab ? window.app.setSchemesTab('ALL') : null"
        >
          All Schemes
        </button>
        <button 
          class="btn ${selectedTab === 'SAVED' ? 'btn-primary' : 'btn-outline'} btn-sm" 
          style="border-radius: 20px;"
          onclick="window.app.setSchemesTab ? window.app.setSchemesTab('SAVED') : null"
        >
          ⭐ Saved Schemes
        </button>
      </div>

      <!-- Cards Grid -->
      ${schemes.length === 0 ? `
        <div style="text-align: center; padding: 48px 20px; background: #ffffff; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 36px; margin-bottom: 8px;">🏛️</div>
          <h4 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin: 0 0 6px 0;">No Schemes Found</h4>
          <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Try adjusting your search criteria or view all national welfare schemes.</p>
        </div>
      ` : `
        <div class="cards-grid">
          ${schemes.map(sch => {
            const isSaved = sch.isSaved;

            return `
              <div class="hub-card" style="display: flex; flex-direction: column; justify-content: space-between; background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; box-shadow: var(--shadow-sm);">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                    <span class="badge badge-neutral">${sch.category || 'Welfare Scheme'}</span>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span class="badge badge-success">Active Scheme</span>
                      <button 
                        class="btn btn-outline btn-sm" 
                        style="padding: 2px 6px; font-size: 12px; border-color: ${isSaved ? '#f59e0b' : 'var(--border-color)'}; color: ${isSaved ? '#d97706' : 'var(--text-muted)'};"
                        onclick="window.app.toggleSaveScheme ? window.app.toggleSaveScheme('${sch.id}') : null"
                        title="${isSaved ? 'Remove from Saved' : 'Save Scheme'}"
                      >
                        ${isSaved ? '⭐ Saved' : '☆ Save'}
                      </button>
                    </div>
                  </div>

                  <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); line-height: 1.3; margin: 0 0 4px 0;">${sch.title}</h3>
                  <span style="font-size: 13px; font-weight: 600; color: var(--color-primary-light); display: block; margin-bottom: 10px;">${sch.department}</span>

                  <div style="background: #f8fafc; padding: 10px; border-radius: var(--radius-md); font-size: 12px; margin: 4px 0 12px 0; line-height: 1.5;">
                    <div style="margin-bottom: 4px;"><strong>Benefits:</strong> ${sch.benefits}</div>
                    <div><strong>Target Audience:</strong> ${sch.targetAudience}</div>
                  </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 10px; border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: 8px;">
                  <span class="hub-source" style="font-size: 11px; color: var(--text-muted);">
                    🏛️ ${sch.source || 'myScheme'}
                  </span>
                  <div style="display: flex; gap: 6px;">
                    ${sch.relatedServiceId ? `
                      <button class="btn btn-primary btn-sm" onclick="window.app.navigate('services')">
                        Apply on Portal
                      </button>
                    ` : ''}
                    <a href="${sch.sourceUrl || 'https://www.myscheme.gov.in'}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
                      Official Scheme Details ↗
                    </a>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}
