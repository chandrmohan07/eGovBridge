/**
 * Component: NewsAnnouncements
 * Renders official Government of India press releases, policy announcements, and circulars.
 */

export function renderNewsAnnouncements(store) {
  const query = (store.searchQuery || '').toLowerCase().trim();

  const news = store.newsListings.filter(n => {
    if (!query) return true;
    return n.title.toLowerCase().includes(query) ||
      n.category.toLowerCase().includes(query) ||
      n.snippet.toLowerCase().includes(query);
  });

  return `
    <div>
      <div class="section-header">
        <div>
          <h2 class="section-title">Official Announcements & News Feed</h2>
          <p class="section-subtitle">Verified updates, deadline reminders, and policy circulars directly from official government sources.</p>
        </div>
        <a href="https://pib.gov.in" target="_blank" rel="noopener noreferrer" class="badge badge-info" style="text-decoration: none;">
          Source: Press Information Bureau (pib.gov.in) ↗
        </a>
      </div>

      <div style="display: flex; flex-direction: column; gap: 16px;">
        ${news.map(item => `
          <div class="hub-card" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span class="badge ${item.category === 'Deadlines' ? 'badge-danger' : 'badge-info'}">
                ${item.category}
              </span>
              <span style="font-size: 12px; color: var(--text-muted);">Published: ${item.publishedAt}</span>
            </div>

            <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">
              ${item.title}
            </h3>

            <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 12px;">
              ${item.snippet}
            </p>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 10px;">
              <span class="hub-source">
                🏛️ ${item.source}
              </span>
              <a href="${item.sourceUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
                Read on PIB ↗
              </a>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
