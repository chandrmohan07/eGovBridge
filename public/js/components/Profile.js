/**
 * Component: Profile
 * Renders the citizen profile and identity verification status.
 */

export function renderProfile(store) {
  const profile = store.citizenProfile;

  return `
    <div>
      <div class="section-header">
        <div>
          <h2 class="section-title">Citizen Profile & Identity</h2>
          <p class="section-subtitle">Manage your verified citizen profile, linked government document vault, and security preferences.</p>
        </div>
      </div>

      <div class="profile-container">
        <!-- Identity Summary Card -->
        <div class="profile-card">
          <div class="profile-avatar-large">
            ${profile.name.split(' ').map(n => n[0]).join('')}
          </div>
          <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main);">${profile.name}</h3>
          <span style="font-size: 13px; color: var(--text-muted); font-family: var(--font-mono);">${profile.id}</span>
          
          <div style="margin: 16px 0 20px;">
            <span class="badge badge-success" style="font-size: 13px; padding: 4px 10px;">
              🛡️ Role: ${profile.role}
            </span>
          </div>

          <div style="background: var(--color-success-bg); border: 1px solid #bbf7d0; border-radius: var(--radius-md); padding: 12px; margin-bottom: 16px;">
            <div style="font-size: 13px; font-weight: 600; color: var(--color-success); margin-bottom: 2px;">
              ✓ ${profile.kycStatus}
            </div>
            <div style="font-size: 11px; color: #166534;">
              Aadhaar & educational marksheets verified via national digital credentials gateway.
            </div>
          </div>

          <div style="font-size: 12px; color: var(--text-muted);">
            Member since ${profile.joinedDate}
          </div>
        </div>

        <!-- Detailed Attributes Card -->
        <div class="profile-card">
          <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px; color: var(--color-primary);">
            Demographic & Identity Attributes
          </h3>

          <div class="profile-field-row">
            <span class="profile-field-label">Full Name</span>
            <span class="profile-field-val">${profile.name}</span>
          </div>

          <div class="profile-field-row">
            <span class="profile-field-label">Citizen ID</span>
            <span class="profile-field-val" style="font-family: var(--font-mono);">${profile.id}</span>
          </div>

          <div class="profile-field-row">
            <span class="profile-field-label">Aadhaar (Masked)</span>
            <span class="profile-field-val" style="font-family: var(--font-mono);">${profile.aadhaarMasked}</span>
          </div>

          <div class="profile-field-row">
            <span class="profile-field-label">Email Address</span>
            <span class="profile-field-val">${profile.email}</span>
          </div>

          <div class="profile-field-row">
            <span class="profile-field-label">Registered Mobile</span>
            <span class="profile-field-val">${profile.phone}</span>
          </div>

          <div class="profile-field-row">
            <span class="profile-field-label">Residential State</span>
            <span class="profile-field-val">${profile.state}</span>
          </div>

          <div class="profile-field-row">
            <span class="profile-field-label">District</span>
            <span class="profile-field-val">${profile.district}</span>
          </div>

          <!-- Future Role Notice -->
          <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">
              🔐 Role-Based Access Control Architecture
            </div>
            <p style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
              This profile is currently operating in <strong>Citizen</strong> role. Department Officer and System Administrator roles will be unlocked in <strong>Phase 3 (Authentication & Role Management)</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}
