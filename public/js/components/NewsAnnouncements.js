/**
 * Component: NewsAnnouncements
 * Renders official Government of India press releases, policy announcements, and circulars.
 * Supports keyword search, category filtering, and direct links to official bulletins.
 *
 * MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION
 */

export function renderNewsAnnouncements(store) {
  const query = (store.searchQuery || '').toLowerCase().trim();

  const rawList = store.newsListings || [];

  const news = rawList.filter(n => {
    if (!query) return true;
    return (n.title || '').toLowerCase().includes(query) ||
      (n.category || '').toLowerCase().includes(query) ||
      (n.snippet || n.summary || '').toLowerCase().includes(query) ||
      (n.department || '').toLowerCase().includes(query);
  });

  return `
    <div class="news-view" style="max-width: 1100px; margin: 0 auto; padding-bottom: 40px;">
      <!-- Header Area -->
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px; margin-bottom: 18px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <h2 class="section-title" style="margin: 0;">Official Announcements & News Feed</h2>
            <span class="badge badge-mock" style="font-size: 11px;">MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION</span>
          </div>
          <p class="section-subtitle" style="margin: 0;">
            Verified updates, deadline reminders, and policy circulars directly from official government sources.
          </p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <a href="https://pib.gov.in" target="_blank" rel="noopener noreferrer" class="badge badge-info" style="text-decoration: none; padding: 6px 12px; font-size: 12px;">
            Source: Press Information Bureau (pib.gov.in) ↗
          </a>
        </div>
      </div>

      <!-- News Feed Grid -->
      ${news.length === 0 ? `
        <div style="text-align: center; padding: 48px 20px; background: #ffffff; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 36px; margin-bottom: 8px;">📰</div>
          <h4 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin: 0 0 6px 0;">No Announcements Found</h4>
          <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Try adjusting your search criteria or check back later for new press releases.</p>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${news.map(item => `
            <div class="hub-card" style="padding: 20px; background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
                <span class="badge ${item.category === 'Deadlines' ? 'badge-danger' : 'badge-info'}">
                  ${item.category}
                </span>
                <span style="font-size: 12px; color: var(--text-muted);">Published: ${item.publishedAt}</span>
              </div>

              <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">
                ${item.title}
              </h3>

              <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 12px;">
                ${item.snippet || item.summary}
              </p>

              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 10px; flex-wrap: wrap; gap: 8px;">
                <span class="hub-source" style="font-size: 11px; color: var(--text-muted);">
                  🏛️ ${item.source || 'Press Information Bureau (PIB)'}
                </span>
                <a href="${item.sourceUrl || 'https://pib.gov.in'}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
                  Read on PIB ↗
                </a>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}
