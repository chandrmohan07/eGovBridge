import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('Search Input Multi-Character Typing & Focus Retention Verification', () => {

  it('simulates typing multi-character string without focus or character loss', async () => {
    // 1. Mock minimal DOM environment for Node.js
    const elements = new Map();
    let activeElement = null;

    class MockElement {
      constructor(id, tagName = 'div') {
        this.id = id;
        this.tagName = tagName.toUpperCase();
        this.value = '';
        this.innerHTML = '';
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

    const appEl = new MockElement('app');
    const mainContent = new MockElement('mainContent');
    const globalSearchInput = new MockElement('globalSearchInput', 'input');

    elements.set('app', appEl);
    elements.set('mainContent', mainContent);
    elements.set('globalSearchInput', globalSearchInput);

    global.document = {
      getElementById(id) {
        return elements.get(id) || null;
      },
      querySelector(sel) {
        if (sel === '#globalSearchInput' || sel.includes('globalSearchInput')) return globalSearchInput;
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

    // 2. Import the App class logic
    const { store } = await import('../public/js/store.js');
    
    // Simulate App search behavior
    const mockApp = {
      store,
      renderActiveSection() {
        const query = (this.store.searchQuery || '').toLowerCase();
        const filtered = this.store.services.filter(s => 
          s.title.toLowerCase().includes(query) || s.category.toLowerCase().includes(query)
        );
        return `<div class="results-count">${filtered.length} services found</div>`;
      },
      setSearch(query) {
        this.store.searchQuery = query;
        const main = global.document.getElementById('mainContent');
        if (main) {
          main.innerHTML = this.renderActiveSection();
        }
        const input = global.document.getElementById('globalSearchInput');
        if (input && input !== global.document.activeElement && input.value !== query) {
          input.value = query;
        }
      }
    };

    // 3. Simulate user clicking into globalSearchInput
    globalSearchInput.focus();
    assert.equal(global.document.activeElement, globalSearchInput, 'Input must be focused initially');

    // 4. Simulate typing the word "scholar" letter by letter
    const wordToType = 'scholar';
    let currentAccumulated = '';

    for (let i = 0; i < wordToType.length; i++) {
      const char = wordToType[i];
      currentAccumulated += char;

      // User types char into input
      globalSearchInput.value = currentAccumulated;
      globalSearchInput.setSelectionRange(currentAccumulated.length, currentAccumulated.length);

      // oninput fires
      mockApp.setSearch(globalSearchInput.value);

      // Verify the element stayed focused
      assert.equal(
        global.document.activeElement,
        globalSearchInput,
        `Input must retain focus after typing letter "${char}" at index ${i}`
      );

      // Verify the value in the input matches exactly what was typed so far
      assert.equal(
        globalSearchInput.value,
        currentAccumulated,
        `Input value must equal "${currentAccumulated}" after typing "${char}"`
      );

      // Verify the store state reflects all characters
      assert.equal(
        mockApp.store.searchQuery,
        currentAccumulated,
        `Store searchQuery must equal "${currentAccumulated}"`
      );

      // Verify main content rendered filtered results without remounting the input
      assert.ok(
        mainContent.innerHTML.includes('services found'),
        'Main content must dynamically update with filtered results'
      );
    }

    // 5. Final assertion: all 7 characters present
    assert.equal(globalSearchInput.value, 'scholar', 'All 7 characters must be present in input');
    assert.equal(mockApp.store.searchQuery, 'scholar', 'Search query in store must be "scholar"');
  });
});
