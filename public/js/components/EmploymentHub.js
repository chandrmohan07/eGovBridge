/**
 * Component: EmploymentHub
 * Renders verified employment and apprenticeship opportunities sourced from official government portals.
 */

export function renderEmploymentHub(store) {
  const query = (store.searchQuery || '').toLowerCase().trim();

  const listings = store.employmentListings.filter(job => {
    if (!query) return true;
    return job.title.toLowerCase().includes(query) ||
      job.organization.toLowerCase().includes(query) ||
      job.category.toLowerCase().includes(query) ||
      job.eligibility.toLowerCase().includes(query);
  });

  return `
    <div>
      <div class="section-header">
        <div>
          <h2 class="section-title">National Employment & Apprenticeship Hub</h2>
          <p class="section-subtitle">Verified central and state government opportunities, public enterprise vacancies, and skill development apprenticeships.</p>
        </div>
        <a href="https://www.ncs.gov.in" target="_blank" rel="noopener noreferrer" class="badge badge-info" style="text-decoration: none;">
          Source: National Career Service (ncs.gov.in) ↗
        </a>
      </div>

      <div class="cards-grid">
        ${listings.map(job => `
          <div class="hub-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span class="badge badge-neutral">${job.category}</span>
              <span class="hub-deadline">Deadline: ${job.deadline}</span>
            </div>

            <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); line-height: 1.3;">${job.title}</h3>
            <span style="font-size: 13px; font-weight: 600; color: var(--color-primary-light);">${job.organization}</span>

            <div style="background: #f8fafc; padding: 10px; border-radius: var(--radius-md); font-size: 12px; margin: 4px 0;">
              <div style="margin-bottom: 4px;"><strong>Eligibility:</strong> ${job.eligibility}</div>
              <div><strong>Location:</strong> ${job.location} • <strong>Openings:</strong> ${job.vacancies} Positions</div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 10px; border-top: 1px solid var(--border-color);">
              <span class="hub-source">
                🏛️ ${job.source}
              </span>
              <a href="${job.sourceUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
                View on NCS ↗
              </a>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
