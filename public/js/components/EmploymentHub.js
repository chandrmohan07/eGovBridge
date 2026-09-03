/**
 * Component: EmploymentHub
 * Renders the National Employment & Apprenticeship Hub interface for citizens.
 * Displays verified government opportunities, public enterprise vacancies, skill development programs,
 * and allows saving/bookmarking opportunities.
 *
 * MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION
 */

export function renderEmploymentHub(store) {
  const query = (store.searchQuery || '').toLowerCase().trim();
  const selectedCategory = store.employmentCategory || 'ALL';

  // Fallback to store.employmentListings or empty array
  const rawList = store.employmentListings || [];

  const listings = rawList.filter(job => {
    // Filter by Category
    if (selectedCategory === 'SAVED') {
      return job.isSaved === true;
    }
    if (selectedCategory !== 'ALL') {
      if ((job.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
    }

    // Filter by Search Query
    if (!query) return true;
    return (job.title || '').toLowerCase().includes(query) ||
      (job.organization || '').toLowerCase().includes(query) ||
      (job.category || '').toLowerCase().includes(query) ||
      (job.eligibility || '').toLowerCase().includes(query) ||
      (job.location || '').toLowerCase().includes(query);
  });

  const categories = [
    { id: 'ALL', label: 'All Opportunities' },
    { id: 'Government Jobs', label: 'Government Jobs' },
    { id: 'Apprenticeships', label: 'Apprenticeships' },
    { id: 'Skill Development', label: 'Skill Development' },
    { id: 'Employment Schemes', label: 'Employment Schemes' },
    { id: 'SAVED', label: '⭐ Saved' }
  ];

  return `
    <div class="employment-hub-view" style="max-width: 1100px; margin: 0 auto; padding-bottom: 40px;">
      <!-- Header Area -->
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px; margin-bottom: 18px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <h2 class="section-title" style="margin: 0;">National Employment & Apprenticeship Hub</h2>
            <span class="badge badge-mock" style="font-size: 11px;">MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION</span>
          </div>
          <p class="section-subtitle" style="margin: 0;">
            Verified central and state government opportunities, public enterprise vacancies, and skill development apprenticeships.
          </p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <a href="https://www.ncs.gov.in" target="_blank" rel="noopener noreferrer" class="badge badge-info" style="text-decoration: none; padding: 6px 12px; font-size: 12px;">
            Source: National Career Service (ncs.gov.in) ↗
          </a>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="hub-tabs" style="display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 6px;">
        ${categories.map(cat => `
          <button 
            class="btn ${selectedCategory === cat.id ? 'btn-primary' : 'btn-outline'} btn-sm" 
            style="border-radius: 20px; white-space: nowrap;"
            onclick="window.app.setEmploymentCategory ? window.app.setEmploymentCategory('${cat.id}') : null"
          >
            ${cat.label}
          </button>
        `).join('')}
      </div>

      <!-- Opportunities Grid or Empty State -->
      ${listings.length === 0 ? `
        <div style="text-align: center; padding: 48px 20px; background: #ffffff; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 36px; margin-bottom: 8px;">💼</div>
          <h4 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin: 0 0 6px 0;">No Opportunities Found</h4>
          <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Try adjusting your search criteria or explore other employment categories.</p>
        </div>
      ` : `
        <div class="cards-grid">
          ${listings.map(job => {
            const isClosingSoon = job.closingSoon;
            const isSaved = job.isSaved;

            return `
              <div class="hub-card" style="display: flex; flex-direction: column; justify-content: space-between; background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; box-shadow: var(--shadow-sm); transition: transform 0.15s ease;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 10px;">
                    <span class="badge badge-neutral">${job.category || 'Opportunity'}</span>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      ${isClosingSoon ? `<span class="badge badge-warning" style="font-size: 11px;">⚠️ Closing Soon</span>` : ''}
                      <button 
                        class="btn btn-outline btn-sm" 
                        style="padding: 2px 6px; font-size: 12px; border-color: ${isSaved ? '#f59e0b' : 'var(--border-color)'}; color: ${isSaved ? '#d97706' : 'var(--text-muted)'};"
                        onclick="window.app.toggleSaveOpportunity ? window.app.toggleSaveOpportunity('${job.id}') : null"
                        title="${isSaved ? 'Remove from Saved' : 'Save Opportunity'}"
                      >
                        ${isSaved ? '⭐ Saved' : '☆ Save'}
                      </button>
                    </div>
                  </div>

                  <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); line-height: 1.3; margin: 0 0 4px 0;">
                    ${job.title}
                  </h3>
                  <span style="font-size: 13px; font-weight: 600; color: var(--color-primary-light); display: block; margin-bottom: 12px;">
                    ${job.organization}
                  </span>

                  <div style="background: #f8fafc; padding: 10px 12px; border-radius: var(--radius-md); font-size: 12px; margin-bottom: 12px; line-height: 1.5;">
                    <div style="margin-bottom: 4px;"><strong>Eligibility:</strong> ${job.eligibility}</div>
                    <div><strong>Location:</strong> ${job.location || 'All India'} • <strong>Openings:</strong> ${job.vacancies || '1'} Positions</div>
                    ${job.salary ? `<div style="margin-top: 4px; color: #166534; font-weight: 600;">💰 ${job.salary}</div>` : ''}
                  </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: 8px;">
                  <span class="hub-source" style="font-size: 11px; color: var(--text-muted);">
                    🏛️ ${job.source || 'NCS'} • <span style="font-weight: 600;">Deadline: ${job.deadline}</span>
                  </span>
                  <a href="${job.sourceUrl || job.applicationUrl || 'https://www.ncs.gov.in'}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
                    View on NCS ↗
                  </a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}
