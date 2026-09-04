/**
 * Component: GovernmentServices
 * Upgraded Service Catalog with multi-facet filters (Category, Department, Availability)
 * and deep-link navigation to Service Details and Application entry point.
 */

export function renderGovernmentServices(store) {
  const query = (store.searchQuery || '').toLowerCase().trim();
  const selectedCat = store.selectedCategory || 'all';
  const selectedDept = store.selectedDepartment || 'all';
  const selectedAvail = store.selectedAvailability || 'all';

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'Scholarships', name: 'Scholarships' },
    { id: 'Certificates', name: 'Certificates & Revenue' },
    { id: 'Health', name: 'Health' },
    { id: 'Transport', name: 'Transport' },
    { id: 'Welfare Schemes', name: 'Welfare Schemes' }
  ];

  const departments = [
    { id: 'all', name: 'All Departments' },
    { id: 'EDUCATION', name: 'Higher Education' },
    { id: 'REVENUE', name: 'Revenue & Land' },
    { id: 'HEALTH', name: 'Health & Family Welfare' },
    { id: 'TRANSPORT', name: 'Road Transport' },
    { id: 'AGRICULTURE', name: 'Agriculture & Farmers Welfare' },
    { id: 'SOCIAL_WELFARE', name: 'Social Justice & Empowerment' }
  ];

  // Combined Search & Multi-Filter Logic
  const filteredServices = store.services.filter(s => {
    // 1. Category Filter
    if (selectedCat !== 'all' && s.category.toLowerCase() !== selectedCat.toLowerCase()) {
      return false;
    }
    // 2. Department Filter
    if (selectedDept !== 'all' && 
        s.departmentCode.toLowerCase() !== selectedDept.toLowerCase() &&
        s.department.toLowerCase() !== selectedDept.toLowerCase()) {
      return false;
    }
    // 3. Availability Filter
    if (selectedAvail !== 'all' && s.applicationAvailability.toLowerCase() !== selectedAvail.toLowerCase()) {
      return false;
    }
    // 4. Keyword & Name Search
    if (query) {
      const matchName = s.title.toLowerCase().includes(query);
      const matchDesc = s.description.toLowerCase().includes(query);
      const matchDept = s.department.toLowerCase().includes(query);
      const matchCat = s.category.toLowerCase().includes(query);
      const matchElig = s.eligibility.toLowerCase().includes(query);
      const matchDocs = s.requiredDocuments.some(d => d.toLowerCase().includes(query));
      const matchKey = s.keywords && s.keywords.some(k => k.toLowerCase().includes(query));
      if (!matchName && !matchDesc && !matchDept && !matchCat && !matchElig && !matchDocs && !matchKey) {
        return false;
      }
    }
    return true;
  });

  const hasActiveFilters = query || selectedCat !== 'all' || selectedDept !== 'all' || selectedAvail !== 'all';

  return `
    <div>
      <!-- Catalog Header -->
      <div class="section-header">
        <div>
          <h2 class="section-title">Government Services Discovery — National Government Service Catalog</h2>
          <p class="section-subtitle">
            One unified interface to discover, understand, and apply for government services without navigating fragmented departmental portals.
          </p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="badge badge-info" id="servicesCountBadge" style="font-size: 13px;">
            ${filteredServices.length} of ${store.services.length} Services
          </span>
        </div>
      </div>

      <!-- Search & Multi-Filter Control Console -->
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 12px; align-items: center;">
          <!-- Search Input -->
          <div style="position: relative;">
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">🔍</span>
            <input 
              type="text" 
              id="catalogSearchInput"
              placeholder="Search by service name, keyword, or requirement..." 
              value="${store.searchQuery || ''}"
              oninput="window.app.setSearch(this.value)"
              autocomplete="off"
              style="width: 100%; padding: 8px 12px 8px 36px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
            />
          </div>

          <!-- Category Selector -->
          <div>
            <select 
              style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 13px; background: #ffffff;"
              onchange="window.app.setCategory(this.value)"
            >
              ${categories.map(c => `
                <option value="${c.id}" ${selectedCat.toLowerCase() === c.id.toLowerCase() ? 'selected' : ''}>
                  ${c.name}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Department Selector -->
          <div>
            <select 
              style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 13px; background: #ffffff;"
              onchange="window.app.setDepartmentFilter(this.value)"
            >
              ${departments.map(d => `
                <option value="${d.id}" ${selectedDept.toLowerCase() === d.id.toLowerCase() ? 'selected' : ''}>
                  ${d.name}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Availability Selector -->
          <div>
            <select 
              style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 13px; background: #ffffff;"
              onchange="window.app.setAvailabilityFilter(this.value)"
            >
              <option value="all" ${selectedAvail === 'all' ? 'selected' : ''}>All Availability</option>
              <option value="Open" ${selectedAvail.toLowerCase() === 'open' ? 'selected' : ''}>Open Only</option>
            </select>
          </div>

          <!-- Reset Filter Button -->
          <div>
            ${hasActiveFilters ? `
              <button class="btn btn-outline btn-sm" onclick="window.app.resetAllCatalogFilters()" title="Reset All Filters">
                ✕ Reset
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Quick Category Filter Pills -->
        <div class="filter-bar" style="margin-top: 14px; margin-bottom: 0; padding-bottom: 0;">
          ${categories.map(cat => `
            <button 
              class="filter-btn ${selectedCat.toLowerCase() === cat.id.toLowerCase() ? 'active' : ''}"
              onclick="window.app.setCategory('${cat.id}')"
            >
              ${cat.name}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Services Cards Container -->
      <div id="servicesCardsContainer">
        ${renderGovernmentServicesCards(store)}
      </div>
    </div>
  `;
}

export function renderGovernmentServicesCards(store) {
  const query = (store.searchQuery || '').toLowerCase().trim();
  const selectedCat = store.selectedCategory || 'all';
  const selectedDept = store.selectedDepartment || 'all';
  const selectedAvail = store.selectedAvailability || 'all';

  const filteredServices = store.services.filter(s => {
    if (selectedCat !== 'all' && s.category.toLowerCase() !== selectedCat.toLowerCase()) return false;
    if (selectedDept !== 'all' && 
        s.departmentCode.toLowerCase() !== selectedDept.toLowerCase() &&
        s.department.toLowerCase() !== selectedDept.toLowerCase()) {
      return false;
    }
    if (selectedAvail !== 'all' && s.applicationAvailability.toLowerCase() !== selectedAvail.toLowerCase()) return false;
    if (query) {
      const matchName = s.title.toLowerCase().includes(query);
      const matchDesc = s.description.toLowerCase().includes(query);
      const matchDept = s.department.toLowerCase().includes(query);
      const matchCat = s.category.toLowerCase().includes(query);
      const matchElig = s.eligibility.toLowerCase().includes(query);
      const matchDocs = s.requiredDocuments.some(d => d.toLowerCase().includes(query));
      const matchKey = s.keywords && s.keywords.some(k => k.toLowerCase().includes(query));
      if (!matchName && !matchDesc && !matchDept && !matchCat && !matchElig && !matchDocs && !matchKey) {
        return false;
      }
    }
    return true;
  });

  if (filteredServices.length === 0) {
    return `
      <div style="text-align: center; padding: 48px 24px; background: #ffffff; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
        <div style="font-size: 42px; margin-bottom: 12px;">🔍</div>
        <h3 style="font-size: 17px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">
          No Services Found Matching Your Criteria
        </h3>
        <p style="font-size: 13px; color: var(--text-muted); max-width: 480px; margin: 0 auto 16px;">
          We couldn't find any services matching "${store.searchQuery || selectedCat}". Try adjusting your search keyword or clearing department filters.
        </p>
        <button class="btn btn-primary btn-sm" onclick="window.app.resetAllCatalogFilters()">
          Reset All Filters & Show Full Catalog
        </button>
      </div>
    `;
  }

  return `
    <div class="cards-grid">
      ${filteredServices.map(service => `
        <div class="service-card">
          <div>
            <div class="service-card-top">
              <div style="display: flex; flex-direction: column;">
                <span class="service-dept">${service.department}</span>
                <span style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">${service.id}</span>
              </div>
              <div style="display: flex; gap: 4px; flex-direction: column; align-items: flex-end;">
                <span class="badge badge-success" style="font-size: 11px;">
                  ● ${service.applicationAvailability}
                </span>
                <span class="badge ${service.integrationStatus.includes('Active') ? 'badge-mock' : 'badge-neutral'}" style="font-size: 10px;">
                  ${service.integrationStatus}
                </span>
              </div>
            </div>

            <h3 class="service-card-title">${service.title}</h3>
            <p class="service-card-desc">${service.description}</p>

            <!-- Eligibility Summary -->
            <div style="margin-bottom: 12px; background: #f8fafc; padding: 10px; border-radius: var(--radius-md); border-left: 3px solid var(--color-primary);">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 2px;">
                Eligibility Summary
              </span>
              <p style="font-size: 12px; color: var(--text-main); line-height: 1.4;">
                ${service.eligibility}
              </p>
            </div>

            <!-- Required Documents Badges -->
            <div style="margin-bottom: 16px;">
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px;">
                Required Documents
              </span>
              <div class="service-tags">
                ${service.requiredDocuments.slice(0, 3).map(doc => `<span class="badge badge-neutral">${doc}</span>`).join('')}
                ${service.requiredDocuments.length > 3 ? `<span class="badge badge-neutral">+${service.requiredDocuments.length - 3} more</span>` : ''}
              </div>
            </div>
          </div>

          <!-- Footer with View Details & Start Application Actions -->
          <div class="service-card-footer">
            <div>
              <span class="service-tat">⏱️ ${service.turnaroundTime}</span>
              <span style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">Fee: <strong>${service.fee || 'Free'}</strong></span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-outline btn-sm" onclick="window.app.viewServiceDetails('${service.id}')">
                View Details
              </button>
              <button class="btn btn-primary btn-sm" onclick="window.app.startApplication('${service.id}')">
                Start Application
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
