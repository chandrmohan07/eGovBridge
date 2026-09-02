/**
 * Component: ScholarshipsHub
 * Renders verified national and state scholarship schemes from the National Scholarship Portal.
 */

export function renderScholarshipsHub(store) {
  const query = (store.searchQuery || '').toLowerCase().trim();

  const scholarships = store.scholarshipsListings.filter(s => {
    if (!query) return true;
    return s.title.toLowerCase().includes(query) ||
      s.ministry.toLowerCase().includes(query) ||
      s.eligibility.toLowerCase().includes(query);
  });

  return `
    <div>
      <div class="section-header">
        <div>
          <h2 class="section-title">National Scholarships Hub</h2>
          <p class="section-subtitle">Centrally sponsored and state scholarship opportunities with unified application submission.</p>
        </div>
        <a href="https://scholarships.gov.in" target="_blank" rel="noopener noreferrer" class="badge badge-info" style="text-decoration: none;">
          Source: National Scholarship Portal (scholarships.gov.in) ↗
        </a>
      </div>

      <div class="cards-grid">
        ${scholarships.map(sch => `
          <div class="hub-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span class="badge badge-success">${sch.benefitAmount}</span>
              <span class="hub-deadline">Deadline: ${sch.deadline}</span>
            </div>

            <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); line-height: 1.3;">${sch.title}</h3>
            <span style="font-size: 13px; font-weight: 600; color: var(--color-primary-light);">${sch.ministry}</span>

            <div style="background: #f8fafc; padding: 10px; border-radius: var(--radius-md); font-size: 12px; margin: 4px 0;">
              <div><strong>Eligibility:</strong> ${sch.eligibility}</div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 10px; border-top: 1px solid var(--border-color);">
              <span class="hub-source">
                🏛️ ${sch.source}
              </span>
              <button class="btn btn-primary btn-sm" onclick="window.app.navigate('services')">
                Apply on Portal
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
