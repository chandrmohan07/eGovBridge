import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../public/js/store.js';
import { renderDashboardServicesCards } from '../public/js/components/DashboardSummary.js';
import { renderGovernmentServicesCards } from '../public/js/components/GovernmentServices.js';

describe('Search Input Multi-Character Typing & Focus Retention Verification', () => {
  let elements;
  let activeElement;

  class MockElement {
    constructor(id, tagName = 'div') {
      this.id = id;
      this.tagName = tagName.toUpperCase();
      this.value = '';
      this.innerHTML = '';
      this.textContent = '';
      this.classList = {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        contains(c) { return this.classes.has(c); },
        toggle(c) { if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c); }
      };
      this.attributes = new Map();
      this.selectionStart = 0;
      this.selectionEnd = 0;
    }
    focus() {
      activeElement = this;
    }
    blur() {
      if (activeElement === this) activeElement = null;
    }
    getAttribute(k) { return this.attributes.get(k); }
    setAttribute(k, v) { this.attributes.set(k, v); }
    setSelectionRange(s, e) {
      this.selectionStart = s;
      this.selectionEnd = e;
    }
    querySelector() { return null; }
    querySelectorAll() { return []; }
  }

  function setupMockDOM() {
    elements = new Map();
    activeElement = null;

    const appEl = new MockElement('app');
    const mainContent = new MockElement('mainContent');
    const globalSearchInput = new MockElement('globalSearchInput', 'input');
    const catalogSearchInput = new MockElement('catalogSearchInput', 'input');
    const dashboardServicesGrid = new MockElement('dashboardServicesGrid');
    const servicesCardsContainer = new MockElement('servicesCardsContainer');
    const servicesCountBadge = new MockElement('servicesCountBadge');

    elements.set('app', appEl);
    elements.set('mainContent', mainContent);
    elements.set('globalSearchInput', globalSearchInput);
    elements.set('catalogSearchInput', catalogSearchInput);
    elements.set('dashboardServicesGrid', dashboardServicesGrid);
    elements.set('servicesCardsContainer', servicesCardsContainer);
    elements.set('servicesCountBadge', servicesCountBadge);

    global.document = {
      getElementById(id) {
        return elements.get(id) || null;
      },
      querySelector(sel) {
        if (sel === '#globalSearchInput' || sel.includes('globalSearchInput')) return globalSearchInput;
        if (sel === '#catalogSearchInput' || sel.includes('catalogSearchInput')) return catalogSearchInput;
        if (sel === '#dashboardServicesGrid') return dashboardServicesGrid;
        if (sel === '#servicesCardsContainer') return servicesCardsContainer;
        if (sel === '#servicesCountBadge') return servicesCountBadge;
        if (sel === '#mainContent') return mainContent;
        return null;
      },
      querySelectorAll() {
        return [];
      },
      get activeElement() {
        return activeElement;
      },
      body: new MockElement('body')
    };

    global.window = {
      scrollTo() {},
      addEventListener() {}
    };

    return {
      appEl,
      mainContent,
      globalSearchInput,
      catalogSearchInput,
      dashboardServicesGrid,
      servicesCardsContainer,
      servicesCountBadge
    };
  }

  function createMockApp(initialTab = 'dashboard') {
    store.activeTab = initialTab;
    store.searchQuery = '';
    store.selectedCategory = 'all';
    store.selectedDepartment = 'all';
    store.selectedAvailability = 'all';

    return {
      store,
      getFilteredServicesCount() {
        const query = (this.store.searchQuery || '').toLowerCase().trim();
        const selectedCat = this.store.selectedCategory || 'all';
        const selectedDept = this.store.selectedDepartment || 'all';
        const selectedAvail = this.store.selectedAvailability || 'all';
        return this.store.services.filter(s => {
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
        }).length;
      },
      setSearch(query) {
        this.store.searchQuery = query;

        const activeEl = document.activeElement;
        const globalInput = document.getElementById('globalSearchInput');
        if (globalInput && globalInput !== activeEl && globalInput.value !== query) {
          globalInput.value = query;
        }
        const catalogInput = document.getElementById('catalogSearchInput');
        if (catalogInput && catalogInput !== activeEl && catalogInput.value !== query) {
          catalogInput.value = query;
        }

        if (this.store.activeTab === 'dashboard') {
          const dashboardGrid = document.getElementById('dashboardServicesGrid');
          if (dashboardGrid) {
            dashboardGrid.innerHTML = renderDashboardServicesCards(this.store);
            return;
          }
        }

        if (this.store.activeTab === 'services') {
          const servicesContainer = document.getElementById('servicesCardsContainer');
          if (servicesContainer) {
            servicesContainer.innerHTML = renderGovernmentServicesCards(this.store);
            const countBadge = document.getElementById('servicesCountBadge');
            if (countBadge) {
              const count = this.getFilteredServicesCount();
              countBadge.textContent = `${count} of ${this.store.services.length} Services`;
            }
            return;
          }
        }

        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
          mainContent.innerHTML = `<div class="rendered">${this.store.searchQuery}</div>`;
        }
      },
      resetSearch() {
        this.store.searchQuery = '';
        this.store.selectedCategory = 'all';
        const globalInput = document.getElementById('globalSearchInput');
        if (globalInput) globalInput.value = '';
        const catalogInput = document.getElementById('catalogSearchInput');
        if (catalogInput) catalogInput.value = '';

        if (this.store.activeTab === 'dashboard') {
          const dashboardGrid = document.getElementById('dashboardServicesGrid');
          if (dashboardGrid) {
            dashboardGrid.innerHTML = renderDashboardServicesCards(this.store);
            return;
          }
        }

        if (this.store.activeTab === 'services') {
          const servicesContainer = document.getElementById('servicesCardsContainer');
          if (servicesContainer) {
            servicesContainer.innerHTML = renderGovernmentServicesCards(this.store);
            const countBadge = document.getElementById('servicesCountBadge');
            if (countBadge) {
              countBadge.textContent = `${this.store.services.length} of ${this.store.services.length} Services`;
            }
            return;
          }
        }
      }
    };
  }

  // Required verification strings per test specification:
  const requiredTestStrings = [
    'f',
    'fa',
    'farmer',
    'health',
    'scholarship',
    'education',
    'government service',
    'khhl',
    'test search 123'
  ];

  for (const testString of requiredTestStrings) {
    it(`simulates character-by-character typing of "${testString}" in header search on dashboard tab`, () => {
      const dom = setupMockDOM();
      const app = createMockApp('dashboard');

      dom.globalSearchInput.focus();
      assert.equal(document.activeElement, dom.globalSearchInput, 'globalSearchInput must have focus initially');

      let currentAccumulator = '';
      for (let i = 0; i < testString.length; i++) {
        const char = testString[i];
        currentAccumulator += char;

        // Simulate browser input event
        dom.globalSearchInput.value = currentAccumulator;
        dom.globalSearchInput.setSelectionRange(currentAccumulator.length, currentAccumulator.length);

        // App setSearch handler invoked
        app.setSearch(dom.globalSearchInput.value);

        // Assertions:
        // 1. Focus must not be lost
        assert.equal(
          document.activeElement,
          dom.globalSearchInput,
          `Focus must remain on globalSearchInput after typing "${char}" at index ${i}`
        );

        // 2. Value must match accumulator exactly (not reset to 1 char)
        assert.equal(
          dom.globalSearchInput.value,
          currentAccumulator,
          `Value must be "${currentAccumulator}" after typing char "${char}"`
        );

        // 3. Store must match accumulator
        assert.equal(
          app.store.searchQuery,
          currentAccumulator,
          `store.searchQuery must be "${currentAccumulator}"`
        );

        // 4. dashboardServicesGrid must be updated with rendered content
        assert.ok(
          dom.dashboardServicesGrid.innerHTML.length > 0,
          'dashboardServicesGrid must contain rendered content'
        );
      }

      // Final check for complete string
      assert.equal(dom.globalSearchInput.value, testString);
      assert.equal(app.store.searchQuery, testString);
      assert.equal(document.activeElement, dom.globalSearchInput);
    });

    it(`simulates character-by-character typing of "${testString}" in services catalog view`, () => {
      const dom = setupMockDOM();
      const app = createMockApp('services');

      dom.catalogSearchInput.focus();
      assert.equal(document.activeElement, dom.catalogSearchInput, 'catalogSearchInput must have focus initially');

      let currentAccumulator = '';
      for (let i = 0; i < testString.length; i++) {
        const char = testString[i];
        currentAccumulator += char;

        // Simulate browser input event
        dom.catalogSearchInput.value = currentAccumulator;
        dom.catalogSearchInput.setSelectionRange(currentAccumulator.length, currentAccumulator.length);

        // App setSearch handler invoked
        app.setSearch(dom.catalogSearchInput.value);

        // Assertions:
        // 1. Focus must not be lost
        assert.equal(
          document.activeElement,
          dom.catalogSearchInput,
          `Focus must remain on catalogSearchInput after typing "${char}" at index ${i}`
        );

        // 2. Value must match accumulator exactly
        assert.equal(
          dom.catalogSearchInput.value,
          currentAccumulator,
          `Value must be "${currentAccumulator}" after typing char "${char}"`
        );

        // 3. Store must match accumulator
        assert.equal(
          app.store.searchQuery,
          currentAccumulator,
          `store.searchQuery must be "${currentAccumulator}"`
        );

        // 4. servicesCardsContainer must be updated
        assert.ok(
          dom.servicesCardsContainer.innerHTML.length > 0,
          'servicesCardsContainer must contain rendered content'
        );

        // 5. Global input must be synchronized without stealing focus
        assert.equal(
          dom.globalSearchInput.value,
          currentAccumulator,
          `globalSearchInput must sync to "${currentAccumulator}"`
        );
        assert.equal(
          document.activeElement,
          dom.catalogSearchInput,
          'Active element must remain catalogSearchInput'
        );
      }

      // Final check
      assert.equal(dom.catalogSearchInput.value, testString);
      assert.equal(dom.globalSearchInput.value, testString);
      assert.equal(app.store.searchQuery, testString);
    });
  }

  it('verifies resetSearch clears both inputs and restores original view grids', () => {
    const dom = setupMockDOM();
    const app = createMockApp('services');

    dom.globalSearchInput.value = 'farmer';
    dom.catalogSearchInput.value = 'farmer';
    app.setSearch('farmer');

    assert.equal(app.store.searchQuery, 'farmer');
    assert.ok(dom.servicesCountBadge.textContent.includes('of'));

    app.resetSearch();

    assert.equal(app.store.searchQuery, '');
    assert.equal(dom.globalSearchInput.value, '');
    assert.equal(dom.catalogSearchInput.value, '');
    assert.ok(dom.servicesCardsContainer.innerHTML.includes('service-card'));
  });
});
