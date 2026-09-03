/**
 * Component: ScholarshipsHub
 * Renders verified national and state scholarship schemes from the National Scholarship Portal.
 * Supports searching, category filtering, deadline tracking, and bookmarking.
 *
 * MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION
 */

export function renderScholarshipsHub(store) {
  const query = (store.searchQuery || '').toLowerCase().trim();
  const selectedTab = store.scholarshipTab || 'ALL';

  const rawList = store.scholarshipsListings || [];

  const scholarships = rawList.filter(s => {
    if (selectedTab === 'SAVED') {
      return s.isSaved === true;
    }
    if (!query) return true;
    return (s.title || '').toLowerCase().includes(query) ||
      (s.ministry || '').toLowerCase().includes(query) ||
      (s.eligibility || '').toLowerCase().includes(query) ||
      (s.category || '').toLowerCase().includes(query);
  });

  return `
    <div class="scholarships-hub-view" style="max-width: 1100px; margin: 0 auto; padding-bottom: 40px;">
      <!-- Header Area -->
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px; margin-bottom: 18px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <h2 class="section-title" style="margin: 0;">National Scholarships Hub</h2>
            <span class="badge badge-mock" style="font-size: 11px;">MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION</span>
          </div>
          <p class="section-subtitle" style="margin: 0;">
            Centrally sponsored and state scholarship opportunities with unified application submission.
          </p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <a href="https://scholarships.gov.in" target="_blank" rel="noopener noreferrer" class="badge badge-info" style="text-decoration: none; padding: 6px 12px; font-size: 12px;">
            Source: National Scholarship Portal (scholarships.gov.in) ↗
          </a>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="hub-tabs" style="display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 6px;">
        <button 
          class="btn ${selectedTab === 'ALL' ? 'btn-primary' : 'btn-outline'} btn-sm" 
          style="border-radius: 20px;"
          onclick="window.app.setScholarshipTab ? window.app.setScholarshipTab('ALL') : null"
        >
          All Scholarships
        </button>
        <button 
          class="btn ${selectedTab === 'SAVED' ? 'btn-primary' : 'btn-outline'} btn-sm" 
          style="border-radius: 20px;"
          onclick="window.app.setScholarshipTab ? window.app.setScholarshipTab('SAVED') : null"
        >
          ⭐ Saved Scholarships
        </button>
      </div>

      <!-- Cards Grid -->
      ${scholarships.length === 0 ? `
        <div style="text-align: center; padding: 48px 20px; background: #ffffff; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 36px; margin-bottom: 8px;">🎓</div>
          <h4 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin: 0 0 6px 0;">No Scholarships Found</h4>
          <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Try adjusting your search criteria or view all centrally sponsored programs.</p>
        </div>
      ` : `
        <div class="cards-grid">
          ${scholarships.map(sch => {
            const isClosingSoon = sch.closingSoon;
            const isSaved = sch.isSaved;

            return `
              <div class="hub-card" style="display: flex; flex-direction: column; justify-content: space-between; background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; box-shadow: var(--shadow-sm);">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                    <span class="badge badge-success">${sch.benefitAmount || 'Financial Assistance'}</span>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      ${isClosingSoon ? `<span class="badge badge-warning" style="font-size: 11px;">⚠️ Closing Soon</span>` : ''}
                      <button 
                        class="btn btn-outline btn-sm" 
                        style="padding: 2px 6px; font-size: 12px; border-color: ${isSaved ? '#f59e0b' : 'var(--border-color)'}; color: ${isSaved ? '#d97706' : 'var(--text-muted)'};"
                        onclick="window.app.toggleSaveScholarship ? window.app.toggleSaveScholarship('${sch.id}') : null"
                        title="${isSaved ? 'Remove from Saved' : 'Save Scholarship'}"
                      >
                        ${isSaved ? '⭐ Saved' : '☆ Save'}
                      </button>
                    </div>
                  </div>

                  <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); line-height: 1.3; margin: 0 0 4px 0;">${sch.title}</h3>
                  <span style="font-size: 13px; font-weight: 600; color: var(--color-primary-light); display: block; margin-bottom: 10px;">${sch.ministry || sch.provider}</span>

                  <div style="background: #f8fafc; padding: 10px; border-radius: var(--radius-md); font-size: 12px; margin: 4px 0 12px 0; line-height: 1.5;">
                    <div><strong>Eligibility:</strong> ${sch.eligibility}</div>
                    ${sch.incomeCriteria ? `<div style="margin-top: 4px;"><strong>Income Criteria:</strong> ${sch.incomeCriteria}</div>` : ''}
                  </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 10px; border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: 8px;">
                  <span class="hub-source" style="font-size: 11px; color: var(--text-muted);">
                    🏛️ ${sch.source || 'NSP'} • <span style="font-weight: 600;">Deadline: ${sch.deadline}</span>
                  </span>
                  <div style="display: flex; gap: 6px;">
                    ${sch.relatedServiceId ? `
                      <button class="btn btn-primary btn-sm" onclick="window.app.navigate('services')">
                        Apply on Portal
                      </button>
                    ` : `
                      <a href="${sch.sourceUrl || 'https://scholarships.gov.in'}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
                        NSP Portal ↗
                      </a>
                    `}
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
