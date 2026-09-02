/**
 * Component: AuthModal
 * Renders secure login, registration forms, and quick demo role switchers.
 */

export function renderAuthModal(store) {
  const mode = store.authModalMode || 'login'; // 'login' or 'register'
  const error = store.authError || '';
  const loading = store.authLoading || false;

  return `
    <div class="modal-backdrop" id="authModalBackdrop" onclick="if(event.target === this) window.app.closeAuthModal()">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 style="font-size: 18px; font-weight: 700; color: var(--color-primary-dark);">
              ${mode === 'login' ? 'Citizen & Official Portal Login' : 'Citizen Registration'}
            </h3>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
              ${mode === 'login' ? 'Access your dashboard with role-based credentials.' : 'Create your citizen profile to apply for government services.'}
            </p>
          </div>
          <button class="btn-icon" onclick="window.app.closeAuthModal()" style="font-size: 20px; line-height: 1; cursor: pointer;">✕</button>
        </div>

        <!-- Mode Toggle Tabs -->
        <div style="display: flex; border-bottom: 1px solid var(--border-color); margin-bottom: 16px;">
          <button 
            class="tab-btn ${mode === 'login' ? 'active' : ''}" 
            onclick="window.app.setAuthModalMode('login')"
            style="flex: 1; padding: 10px; font-size: 14px; font-weight: 600; background: none; border: none; border-bottom: 2px solid ${mode === 'login' ? 'var(--color-primary)' : 'transparent'}; color: ${mode === 'login' ? 'var(--color-primary)' : 'var(--text-muted)'}; cursor: pointer;"
          >
            Sign In
          </button>
          <button 
            class="tab-btn ${mode === 'register' ? 'active' : ''}" 
            onclick="window.app.setAuthModalMode('register')"
            style="flex: 1; padding: 10px; font-size: 14px; font-weight: 600; background: none; border: none; border-bottom: 2px solid ${mode === 'register' ? 'var(--color-primary)' : 'transparent'}; color: ${mode === 'register' ? 'var(--color-primary)' : 'var(--text-muted)'}; cursor: pointer;"
          >
            Create Citizen Account
          </button>
        </div>

        ${error ? `
          <div style="background: var(--color-danger-bg); border: 1px solid #fecaca; color: var(--color-danger); padding: 10px 14px; border-radius: var(--radius-md); font-size: 13px; margin-bottom: 16px;">
            ⚠️ ${error}
          </div>
        ` : ''}

        ${mode === 'login' ? `
          <!-- Login Form -->
          <form onsubmit="event.preventDefault(); window.app.handleLoginSubmit();" style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Email Address</label>
              <input 
                type="email" 
                id="loginEmailInput" 
                placeholder="citizen@example.com or officer@gov.in" 
                style="width: 100%; padding: 9px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
                required
              />
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Password</label>
              <input 
                type="password" 
                id="loginPasswordInput" 
                placeholder="Enter your account password" 
                style="width: 100%; padding: 9px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
                required
              />
            </div>

            <button type="submit" class="btn btn-primary" style="margin-top: 6px;" ${loading ? 'disabled' : ''}>
              ${loading ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
          </form>

          <!-- Quick Role Demo Switcher for SIH Presentation -->
          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-color);">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 8px;">
              ⚡ Quick Role Demo Switcher:
            </span>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button class="btn btn-outline btn-sm" onclick="window.app.quickLogin('citizen@example.com', 'Citizen@123')">
                👤 Citizen (Rahul)
              </button>
              <button class="btn btn-outline btn-sm" onclick="window.app.quickLogin('officer.edu@gov.in', 'Officer@123')">
                🎓 Officer (Education)
              </button>
              <button class="btn btn-outline btn-sm" onclick="window.app.quickLogin('officer.rev@gov.in', 'Officer@123')">
                📜 Officer (Revenue)
              </button>
              <button class="btn btn-outline btn-sm" onclick="window.app.quickLogin('admin@gov.in', 'Admin@123')">
                🛡️ Platform Admin
              </button>
            </div>
          </div>
        ` : `
          <!-- Registration Form -->
          <form onsubmit="event.preventDefault(); window.app.handleRegisterSubmit();" style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Full Name</label>
              <input 
                type="text" 
                id="regNameInput" 
                placeholder="e.g. Priya Sharma" 
                style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
                required
              />
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Email Address</label>
              <input 
                type="email" 
                id="regEmailInput" 
                placeholder="name@example.com" 
                style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
                required
              />
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Password (Min 8 Characters)</label>
              <input 
                type="password" 
                id="regPasswordInput" 
                placeholder="••••••••" 
                style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
                required
                minlength="8"
              />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">State</label>
                <input 
                  type="text" 
                  id="regStateInput" 
                  placeholder="e.g. Maharashtra" 
                  style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
                />
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">District</label>
                <input 
                  type="text" 
                  id="regDistrictInput" 
                  placeholder="e.g. Pune" 
                  style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
                />
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="margin-top: 6px;" ${loading ? 'disabled' : ''}>
              ${loading ? 'Registering...' : 'Complete Citizen Registration'}
            </button>
          </form>
        `}
      </div>
    </div>
  `;
}
