/**
 * SIH Government Service Integration Platform — Main Application Controller
 * Orchestrates navigation, reactive DOM updates, Authentication, and Role-Based Access Control.
 */

import { store } from './store.js';
import { renderDashboardSummary } from './components/DashboardSummary.js';
import { renderGovernmentServices } from './components/GovernmentServices.js';
import { renderApplicationTracking } from './components/ApplicationTracking.js';
import { renderAIHelp } from './components/AIHelp.js';
import { renderEmploymentHub } from './components/EmploymentHub.js';
import { renderScholarshipsHub } from './components/ScholarshipsHub.js';
import { renderGovernmentSchemes } from './components/GovernmentSchemes.js';
import { renderNewsAnnouncements } from './components/NewsAnnouncements.js';
import { renderNotifications } from './components/Notifications.js';
import { renderProfile } from './components/Profile.js';
import { renderAuthModal } from './components/AuthModal.js';
import { renderOfficerWorkspace } from './components/OfficerWorkspace.js';
import { renderAdminPortal } from './components/AdminPortal.js';
import { renderAccessDenied } from './components/AccessDenied.js';
import { renderServiceDetails } from './components/ServiceDetails.js';

class App {
  constructor() {
    this.store = store;
    this.init();
  }

  init() {
    this.render();
    this.bindGlobalEvents();
  }

  // Navigate between sections with Server-Side / Role-Based Route Protection
  navigate(tabId) {
    const role = this.store.currentUser?.role || 'CITIZEN';

    // Route Protection Rules:
    // 1. Officer Workspace requires 'OFFICER' role
    if (tabId === 'officer-workspace' && role !== 'OFFICER') {
      this.store.activeTab = 'access-denied';
      this.store.deniedAttemptedTab = tabId;
      this.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 2. Admin Workspace requires 'ADMIN' role
    if (tabId === 'admin-overview' && role !== 'ADMIN') {
      this.store.activeTab = 'access-denied';
      this.store.deniedAttemptedTab = tabId;
      this.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    this.store.activeTab = tabId;
    this.store.searchQuery = ''; // Reset search on tab switch
    this.render();
    this.closeSidebarOnMobile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Filter category
  setCategory(catId) {
    this.store.selectedCategory = catId;
    this.render();
  }

  // Filter department
  setDepartmentFilter(deptId) {
    this.store.selectedDepartment = deptId;
    this.render();
  }

  // Filter availability
  setAvailabilityFilter(avail) {
    this.store.selectedAvailability = avail;
    this.render();
  }

  // Reset all catalog filters
  resetAllCatalogFilters() {
    this.store.searchQuery = '';
    this.store.selectedCategory = 'all';
    this.store.selectedDepartment = 'all';
    this.store.selectedAvailability = 'all';
    this.render();
  }

  // View Service Details
  viewServiceDetails(serviceId) {
    this.store.activeServiceDetailsId = serviceId;
    this.store.activeServiceDetails = this.store.services.find(s => s.id === serviceId) || null;
    this.store.activeTab = 'service-details';
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Global search
  setSearch(query) {
    this.store.searchQuery = query;
    this.render();
  }

  resetSearch() {
    this.store.searchQuery = '';
    this.store.selectedCategory = 'all';
    this.render();
  }

  // Mobile sidebar controls
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    }
  }

  closeSidebarOnMobile() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    }
  }

  // Notifications
  markAllNotificationsRead() {
    this.store.notifications.forEach(n => { n.unread = false; });
    this.render();
  }

  // Auth Modal Controls
  showAuthModal(mode = 'login') {
    this.store.authModalOpen = true;
    this.store.authModalMode = mode;
    this.store.authError = '';
    this.store.authLoading = false;
    this.render();
  }

  closeAuthModal() {
    this.store.authModalOpen = false;
    this.store.authError = '';
    this.store.authLoading = false;
    this.render();
  }

  setAuthModalMode(mode) {
    this.store.authModalMode = mode;
    this.store.authError = '';
    this.render();
  }

  // Quick 1-Click Login for SIH Evaluator Role Demonstration
  async quickLogin(email, password) {
    const emailInput = document.getElementById('loginEmailInput');
    const passwordInput = document.getElementById('loginPasswordInput');
    if (emailInput && passwordInput) {
      emailInput.value = email;
      passwordInput.value = password;
    }
    await this.handleLogin(email, password);
  }

  async handleLoginSubmit() {
    const email = document.getElementById('loginEmailInput')?.value;
    const password = document.getElementById('loginPasswordInput')?.value;
    await this.handleLogin(email, password);
  }

  async handleLogin(email, password) {
    if (!email || !password) {
      this.store.authError = 'Please provide both email and password.';
      this.render();
      return;
    }

    this.store.authLoading = true;
    this.store.authError = '';
    this.render();

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Save token and user state
      this.store.token = data.token;
      this.store.currentUser = data.user;
      this.store.isAuthenticated = true;
      this.store.authModalOpen = false;

      // Fetch role-specific data from protected endpoints
      await this.loadRoleSpecificData();

      // Route to user's home workspace
      if (data.user.role === 'OFFICER') {
        this.navigate('officer-workspace');
      } else if (data.user.role === 'ADMIN') {
        this.navigate('admin-overview');
      } else {
        this.navigate('dashboard');
      }
    } catch (err) {
      this.store.authError = err.message;
    } finally {
      this.store.authLoading = false;
      this.render();
    }
  }

  async handleRegisterSubmit() {
    const name = document.getElementById('regNameInput')?.value;
    const email = document.getElementById('regEmailInput')?.value;
    const password = document.getElementById('regPasswordInput')?.value;
    const state = document.getElementById('regStateInput')?.value;
    const district = document.getElementById('regDistrictInput')?.value;

    this.store.authLoading = true;
    this.store.authError = '';
    this.render();

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, state, district })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      this.store.token = data.token;
      this.store.currentUser = data.user;
      this.store.isAuthenticated = true;
      this.store.authModalOpen = false;
      this.navigate('dashboard');
    } catch (err) {
      this.store.authError = err.message;
    } finally {
      this.store.authLoading = false;
      this.render();
    }
  }

  // Load role-protected data from server
  async loadRoleSpecificData() {
    const token = this.store.token;
    const role = this.store.currentUser?.role;

    if (role === 'OFFICER') {
      try {
        const res = await fetch('/api/v1/officer/workspace', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          this.store.officerApplications = data.applications || [];
        }
      } catch (e) {
        console.error('Failed to load officer applications', e);
      }
    } else if (role === 'ADMIN') {
      try {
        const [usersRes, deptsRes] = await Promise.all([
          fetch('/api/v1/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/v1/admin/departments', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        const usersData = await usersRes.json();
        const deptsData = await deptsRes.json();
        if (usersData.success) this.store.adminUsersList = usersData.users || [];
        if (deptsData.success) this.store.adminDepartments = deptsData.departments || [];
      } catch (e) {
        console.error('Failed to load admin data', e);
      }
    }
  }

  // Logout
  async logout() {
    if (this.store.token) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.store.token}` }
        });
      } catch (e) {
        // Ignore logout network error
      }
    }

    this.store.token = null;
    this.store.currentUser = {
      id: 'USR-CIT-001',
      name: 'Rahul Verma',
      email: 'citizen@example.com',
      role: 'CITIZEN',
      roleTitle: 'Citizen',
      departmentCode: null,
      permissions: ['services:read', 'applications:create', 'applications:read_own', 'vault:read_own'],
      aadhaarMasked: 'XXXX-XXXX-4819',
      phone: '+91 98765 43210',
      kycStatus: 'Verified (DigiLocker Linked)',
      state: 'Maharashtra',
      district: 'Pune'
    };
    this.store.officerApplications = [];
    this.store.adminUsersList = [];
    this.store.adminDepartments = [];
    this.navigate('dashboard');
  }

  // Service Application placeholder (Phase 4 -> Phase 5 Entry Point)
  openApplyPlaceholder(serviceId) {
    const service = this.store.services.find(s => s.id === serviceId);
    if (!service) return;

    alert(
      `[START APPLICATION — Unified Application Workflow Entry Point]\n\n` +
      `Service: ${service.title} (${service.id})\n` +
      `Department: ${service.department} (${service.departmentCode})\n` +
      `Estimated Turnaround: ${service.turnaroundTime}\n` +
      `Application Fee: ${service.fee || 'Free'}\n` +
      `Required Documents:\n• ${service.requiredDocuments.join('\n• ')}\n\n` +
      `Notice: Phase 4 has verified service eligibility and catalog discovery. In Phase 5 (Unified Application Workflow), this button will launch the single-entry submission form with automated inter-department document verification.`
    );
  }

  // AI Chat Handlers
  sendAIChatPrompt(promptText) {
    const input = document.getElementById('chatUserPromptInput');
    if (input) {
      input.value = promptText;
    }
    this.handleChatSubmit(promptText);
  }

  handleChatSubmit(overridePrompt) {
    const input = document.getElementById('chatUserPromptInput');
    const text = (overridePrompt || (input ? input.value : '')).trim();
    if (!text) return;

    this.store.aiHelpConversation.push({ sender: 'user', text });

    let reply = '';
    const lower = text.toLowerCase();

    if (lower.includes('post-matric') || lower.includes('scholarship')) {
      reply = `**Post-Matric Scholarship Guidance**:\nEligible students can apply online through this platform. Family income must not exceed ₹2,50,000 per annum.\n\nOur **Revenue Adapter** cross-verifies your income certificate digitally so you don't have to upload certified paper stamps.`;
    } else if (lower.includes('income certificate') || lower.includes('income')) {
      reply = `**Income Certificate Verification**:\nIssued by the State Revenue Department. Turnaround time is approximately 3-5 working days. Documents required: Salary slips / affidavit, ration card, and address proof.`;
    } else if (lower.includes('driving') || lower.includes('license')) {
      reply = `**Driving License Renewal**:\nProcessed by the Ministry of Road Transport & Highways. Standard turnaround time is 7-10 working days. Required: Expired DL and Medical Form 1A.`;
    } else if (lower.includes('orchestration') || lower.includes('interoperability') || lower.includes('adapter')) {
      reply = `**Smart Orchestration Architecture**:\nWhen you submit an application, our platform identifies which government departments are involved, transforms data into a canonical schema, and calls the respective department adapter for instant digital verification.`;
    } else {
      reply = `I have received your query: "${text}".\n\nI am grounded in cataloged government guidelines. You can view all eligible services under **Government Services** or check latest notifications under **News & Announcements**.`;
    }

    this.store.aiHelpConversation.push({ sender: 'bot', text: reply });

    if (input) input.value = '';
    this.render();

    setTimeout(() => {
      const historyBox = document.getElementById('chatHistoryBox');
      if (historyBox) historyBox.scrollTop = historyBox.scrollHeight;
    }, 50);
  }

  bindGlobalEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        const searchInput = document.getElementById('globalSearchInput');
        if (searchInput) searchInput.focus();
      }
    });
  }

  // Master render function
  render() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    const unreadCount = this.store.notifications.filter(n => n.unread).length;
    const tab = this.store.activeTab;
    const user = this.store.currentUser;
    const role = user?.role || 'CITIZEN';

    appEl.innerHTML = `
      <div class="app-wrapper">
        <!-- Mobile Sidebar Overlay -->
        <div class="sidebar-overlay" id="sidebarOverlay" onclick="window.app.toggleSidebar()"></div>

        <!-- Sidebar Navigation -->
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <div class="emblem-icon">🏛️</div>
            <div class="brand-text">
              <h1>GovPortal</h1>
              <span>Unified Interop Platform</span>
            </div>
          </div>

          <nav class="sidebar-nav">
            ${role === 'CITIZEN' ? `
              <span class="nav-section-title">Citizen Gateway</span>
              
              <button class="nav-item ${tab === 'dashboard' ? 'active' : ''}" onclick="window.app.navigate('dashboard')">
                <span class="nav-icon">📊</span>
                <span>Dashboard</span>
              </button>

              <button class="nav-item ${tab === 'services' ? 'active' : ''}" onclick="window.app.navigate('services')">
                <span class="nav-icon">🏛️</span>
                <span>Government Services</span>
                <span class="nav-badge">${this.store.services.length}</span>
              </button>

              <button class="nav-item ${tab === 'tracking' ? 'active' : ''}" onclick="window.app.navigate('tracking')">
                <span class="nav-icon">📋</span>
                <span>Application Tracking</span>
                <span class="nav-badge">${this.store.applications.length}</span>
              </button>

              <button class="nav-item ${tab === 'ai-help' ? 'active' : ''}" onclick="window.app.navigate('ai-help')">
                <span class="nav-icon">🤖</span>
                <span>AI Citizen Help</span>
              </button>

              <span class="nav-section-title">Opportunities & News</span>

              <button class="nav-item ${tab === 'employment' ? 'active' : ''}" onclick="window.app.navigate('employment')">
                <span class="nav-icon">💼</span>
                <span>Employment Hub</span>
                <span class="nav-badge">${this.store.employmentListings.length}</span>
              </button>

              <button class="nav-item ${tab === 'scholarships' ? 'active' : ''}" onclick="window.app.navigate('scholarships')">
                <span class="nav-icon">🎓</span>
                <span>Scholarships</span>
                <span class="nav-badge">${this.store.scholarshipsListings.length}</span>
              </button>

              <button class="nav-item ${tab === 'schemes' ? 'active' : ''}" onclick="window.app.navigate('schemes')">
                <span class="nav-icon">📜</span>
                <span>Government Schemes</span>
                <span class="nav-badge">${this.store.schemesListings.length}</span>
              </button>

              <button class="nav-item ${tab === 'news' ? 'active' : ''}" onclick="window.app.navigate('news')">
                <span class="nav-icon">📰</span>
                <span>Announcements</span>
              </button>

              <span class="nav-section-title">Account</span>

              <button class="nav-item ${tab === 'notifications' ? 'active' : ''}" onclick="window.app.navigate('notifications')">
                <span class="nav-icon">🔔</span>
                <span>Notifications</span>
                ${unreadCount > 0 ? `<span class="nav-badge" style="background: var(--color-accent);">${unreadCount}</span>` : ''}
              </button>

              <button class="nav-item ${tab === 'profile' ? 'active' : ''}" onclick="window.app.navigate('profile')">
                <span class="nav-icon">👤</span>
                <span>Citizen Profile</span>
              </button>
            ` : role === 'OFFICER' ? `
              <span class="nav-section-title">Department Officer Portal</span>

              <button class="nav-item ${tab === 'officer-workspace' ? 'active' : ''}" onclick="window.app.navigate('officer-workspace')">
                <span class="nav-icon">🏛️</span>
                <span>Department Queue</span>
                <span class="nav-badge" style="background: var(--color-accent);">${user.departmentCode}</span>
              </button>

              <button class="nav-item ${tab === 'services' ? 'active' : ''}" onclick="window.app.navigate('services')">
                <span class="nav-icon">📋</span>
                <span>Service Catalog</span>
              </button>

              <button class="nav-item ${tab === 'news' ? 'active' : ''}" onclick="window.app.navigate('news')">
                <span class="nav-icon">📰</span>
                <span>Official Notices</span>
              </button>

              <button class="nav-item ${tab === 'profile' ? 'active' : ''}" onclick="window.app.navigate('profile')">
                <span class="nav-icon">👤</span>
                <span>Officer Profile</span>
              </button>
            ` : `
              <span class="nav-section-title">Administration Console</span>

              <button class="nav-item ${tab === 'admin-overview' ? 'active' : ''}" onclick="window.app.navigate('admin-overview')">
                <span class="nav-icon">🛡️</span>
                <span>Users & Roles</span>
              </button>

              <button class="nav-item ${tab === 'services' ? 'active' : ''}" onclick="window.app.navigate('services')">
                <span class="nav-icon">🏛️</span>
                <span>Service Registry</span>
              </button>

              <button class="nav-item ${tab === 'dashboard' ? 'active' : ''}" onclick="window.app.navigate('dashboard')">
                <span class="nav-icon">📊</span>
                <span>Citizen Gateway</span>
              </button>

              <button class="nav-item ${tab === 'profile' ? 'active' : ''}" onclick="window.app.navigate('profile')">
                <span class="nav-icon">👤</span>
                <span>Admin Profile</span>
              </button>
            `}
          </nav>

          <div class="sidebar-footer">
            <div class="interop-pill">
              <span class="status-dot"></span>
              <span>RBAC Security: ${role}</span>
            </div>
          </div>
        </aside>

        <!-- Main Wrapper -->
        <div class="main-wrapper">
          <div class="tricolor-ribbon"></div>

          <!-- Top Header -->
          <header class="top-header">
            <div class="header-left">
              <button class="menu-toggle" onclick="window.app.toggleSidebar()" aria-label="Toggle navigation">
                ☰
              </button>
              
              <!-- Global Search Bar -->
              <div class="search-box">
                <span class="search-icon">🔍</span>
                <input 
                  type="text" 
                  id="globalSearchInput"
                  class="search-input" 
                  placeholder="Search services, schemes, records... (Press '/' to focus)" 
                  value="${this.store.searchQuery}"
                  oninput="window.app.setSearch(this.value)"
                />
              </div>
            </div>

            <div class="header-right">
              <!-- Switch Role / Login Trigger Button -->
              <button class="btn btn-outline btn-sm" onclick="window.app.showAuthModal('login')" title="Switch Role / Login">
                🔑 Switch Role
              </button>

              <!-- Notifications Bell Button (Citizen) -->
              ${role === 'CITIZEN' ? `
                <button class="icon-btn" onclick="window.app.navigate('notifications')" title="Notifications">
                  🔔
                  ${unreadCount > 0 ? `<span class="badge-counter">${unreadCount}</span>` : ''}
                </button>
              ` : ''}

              <!-- Profile Pill -->
              <div class="user-profile-badge" onclick="window.app.navigate('profile')">
                <div class="user-avatar" style="background: ${role === 'ADMIN' ? 'var(--color-danger)' : role === 'OFFICER' ? '#7e22ce' : 'var(--color-primary)'};">
                  ${user.name[0]}
                </div>
                <div class="user-info">
                  <div class="user-name">${user.name}</div>
                  <div class="user-role" style="color: ${role === 'ADMIN' ? 'var(--color-danger)' : role === 'OFFICER' ? '#7e22ce' : 'var(--color-success)'};">
                    ${user.roleTitle || role} ${user.departmentCode ? `(${user.departmentCode})` : ''}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <!-- Main Page Body -->
          <main class="page-container" id="mainContent">
            ${this.renderActiveSection()}
          </main>
        </div>

        <!-- Auth Modal -->
        ${this.store.authModalOpen ? renderAuthModal(this.store) : ''}
      </div>
    `;
  }

  renderActiveSection() {
    switch (this.store.activeTab) {
      case 'dashboard':
        return renderDashboardSummary(this.store);
      case 'services':
        return renderGovernmentServices(this.store);
      case 'tracking':
        return renderApplicationTracking(this.store);
      case 'ai-help':
        return renderAIHelp(this.store);
      case 'employment':
        return renderEmploymentHub(this.store);
      case 'scholarships':
        return renderScholarshipsHub(this.store);
      case 'schemes':
        return renderGovernmentSchemes(this.store);
      case 'news':
        return renderNewsAnnouncements(this.store);
      case 'notifications':
        return renderNotifications(this.store);
      case 'profile':
        return renderProfile(this.store);
      case 'officer-workspace':
        return renderOfficerWorkspace(this.store);
      case 'admin-overview':
        return renderAdminPortal(this.store);
      case 'access-denied':
        return renderAccessDenied(this.store, this.store.deniedAttemptedTab);
      case 'service-details':
        return renderServiceDetails(this.store, this.store.activeServiceDetailsId);
      default:
        return renderDashboardSummary(this.store);
    }
  }
}

// Instantiate global app
window.app = new App();
