/**
 * Component: DocumentVault
 * Secure Digital Document Vault UI:
 * Document listing, category filtering, search, metadata inspection,
 * secure download action, deletion, and upload form.
 */

export function renderDocumentVault(store) {
  const docs = store.vaultDocuments || [];
  const query = (store.vaultSearchQuery || '').toLowerCase().trim();
  const typeFilter = store.vaultTypeFilter || 'ALL';
  const showUploadModal = !!store.showVaultUploadModal;

  // Category Icon & Badge helper
  const getCategoryBadge = (type) => {
    switch (type) {
      case 'IDENTITY_PROOF':
        return '<span class="badge badge-info">🪪 Identity Proof</span>';
      case 'ADDRESS_PROOF':
        return '<span class="badge badge-neutral">🏠 Address Proof</span>';
      case 'INCOME_CERTIFICATE':
        return '<span class="badge badge-success">💰 Income Certificate</span>';
      case 'CASTE_CERTIFICATE':
        return '<span class="badge badge-warning">📜 Caste Certificate</span>';
      case 'EDUCATION_CERTIFICATE':
        return '<span class="badge badge-primary">🎓 Education Marksheet</span>';
      case 'LAND_RECORD':
        return '<span class="badge badge-neutral">🗺️ Land Record</span>';
      case 'EMPLOYMENT_DOCUMENT':
        return '<span class="badge badge-info">💼 Employment Proof</span>';
      case 'SCHOLARSHIP_DOCUMENT':
        return '<span class="badge badge-success">🏆 Scholarship Order</span>';
      default:
        return `<span class="badge badge-neutral">📄 ${type || 'Other'}</span>`;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Filter documents
  const filtered = docs.filter(d => {
    const name = (d.documentName || '').toLowerCase();
    const fileName = (d.fileName || '').toLowerCase();
    const id = (d.id || '').toLowerCase();
    const t = d.documentType || 'OTHER';

    const matchesQuery = !query || name.includes(query) || fileName.includes(query) || id.includes(query);
    const matchesType = typeFilter === 'ALL' || t === typeFilter;
    return matchesQuery && matchesType;
  });

  const verifiedCount = docs.filter(d => d.documentStatus === 'VERIFIED').length;
  const categoriesCount = new Set(docs.map(d => d.documentType)).size;
  const totalBytes = docs.reduce((sum, d) => sum + (d.fileSize || 0), 0);

  return `
    <div class="document-vault-view" style="max-width: 1100px; margin: 0 auto; padding-bottom: 48px;">
      <!-- Vault Header -->
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
        <div>
          <h2 class="section-title" style="font-size: 24px; font-weight: 800; color: var(--color-primary-dark); margin: 0 0 6px 0;">
            📁 Digital Document Vault
          </h2>
          <p class="section-subtitle" style="font-size: 14px; color: var(--text-muted); margin: 0;">
            Store, organize, and seamlessly reuse verified government certificates and documents across unified service applications.
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-primary" onclick="window.app.openVaultUploadModal()">
            ➕ Upload New Document
          </button>
        </div>
      </div>

      <!-- Vault Metrics Banner -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 28px;">
        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; box-shadow: var(--shadow-sm);">
          <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Total Vault Documents</div>
          <div style="font-size: 26px; font-weight: 800; color: var(--color-primary); margin-top: 4px;">${docs.length}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Stored securely</div>
        </div>

        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; box-shadow: var(--shadow-sm);">
          <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Verified Documents</div>
          <div style="font-size: 26px; font-weight: 800; color: #16a34a; margin-top: 4px;">${verifiedCount}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">DigiLocker & Revenue Verified</div>
        </div>

        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; box-shadow: var(--shadow-sm);">
          <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Document Categories</div>
          <div style="font-size: 26px; font-weight: 800; color: var(--text-main); margin-top: 4px;">${categoriesCount}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Identity, Income, Marksheets</div>
        </div>

        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; box-shadow: var(--shadow-sm);">
          <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Storage Used</div>
          <div style="font-size: 26px; font-weight: 800; color: var(--color-primary-dark); margin-top: 4px;">${formatFileSize(totalBytes)}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Encrypted Development Storage</div>
        </div>
      </div>

      <!-- Upload Modal / Drawer -->
      ${showUploadModal ? `
        <div id="vault-upload-modal" style="background: #ffffff; border: 2px solid var(--color-primary); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 28px; box-shadow: var(--shadow-md);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
            <h3 style="font-size: 18px; font-weight: 800; color: var(--color-primary-dark); margin: 0;">
              Upload Document to Vault
            </h3>
            <button class="btn btn-outline btn-sm" onclick="window.app.closeVaultUploadModal()">✕ Cancel</button>
          </div>

          <form id="vaultUploadForm" onsubmit="window.app.handleVaultUpload(event)">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 16px;">
              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">Document Category *</label>
                <select id="uploadDocType" required style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 13px;">
                  <option value="IDENTITY_PROOF">Identity Proof (Aadhaar / PAN / Passport)</option>
                  <option value="ADDRESS_PROOF">Address Proof (Utility Bill / Ration Card)</option>
                  <option value="INCOME_CERTIFICATE">Income Certificate / Salary Slip</option>
                  <option value="CASTE_CERTIFICATE">Caste / Community Certificate</option>
                  <option value="EDUCATION_CERTIFICATE">Education Marksheet / Degree</option>
                  <option value="LAND_RECORD">Land Record / RoR / Khasra</option>
                  <option value="EMPLOYMENT_DOCUMENT">Employment Proof</option>
                  <option value="SCHOLARSHIP_DOCUMENT">Scholarship Order / Bonafide</option>
                  <option value="OTHER">Other Auxiliary Proof</option>
                </select>
              </div>

              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">Document Title / Label *</label>
                <input type="text" id="uploadDocName" placeholder="e.g. Income Certificate FY2025-26" required
                  style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 13px;" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 16px;">
              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">Select Document File * (PDF, JPG, PNG - Max 5 MB)</label>
                <input type="file" id="uploadDocFile" accept=".pdf,.jpg,.jpeg,.png" required
                  style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 13px;" />
              </div>

              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">Validity / Expiry Date (Optional)</label>
                <input type="date" id="uploadDocExpiry"
                  style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 13px;" />
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 18px;">
              <button type="button" class="btn btn-outline btn-sm" onclick="window.app.closeVaultUploadModal()">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm">🔒 Encrypt & Save to Vault</button>
            </div>
          </form>
        </div>
      ` : ''}

      <!-- Search and Filter Bar -->
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 20px;">
          <div>
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin: 0 0 4px 0;">
              Stored Government Documents
            </h3>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
              Browse your uploaded certificates or inspect linked applications.
            </p>
          </div>

          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <input 
              type="text" 
              id="vault-search-input" 
              placeholder="Search document name, file..." 
              value="${store.vaultSearchQuery || ''}"
              style="padding: 8px 12px; font-size: 13px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); width: 220px;"
              oninput="window.app.setVaultSearch ? window.app.setVaultSearch(this.value) : null"
            />

            <select id="vault-type-select" 
              style="padding: 8px 12px; font-size: 13px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);"
              onchange="window.app.setVaultTypeFilter ? window.app.setVaultTypeFilter(this.value) : null">
              <option value="ALL" ${typeFilter === 'ALL' ? 'selected' : ''}>All Categories</option>
              <option value="IDENTITY_PROOF" ${typeFilter === 'IDENTITY_PROOF' ? 'selected' : ''}>Identity Proof</option>
              <option value="ADDRESS_PROOF" ${typeFilter === 'ADDRESS_PROOF' ? 'selected' : ''}>Address Proof</option>
              <option value="INCOME_CERTIFICATE" ${typeFilter === 'INCOME_CERTIFICATE' ? 'selected' : ''}>Income Certificate</option>
              <option value="CASTE_CERTIFICATE" ${typeFilter === 'CASTE_CERTIFICATE' ? 'selected' : ''}>Caste Certificate</option>
              <option value="EDUCATION_CERTIFICATE" ${typeFilter === 'EDUCATION_CERTIFICATE' ? 'selected' : ''}>Education Certificate</option>
              <option value="LAND_RECORD" ${typeFilter === 'LAND_RECORD' ? 'selected' : ''}>Land Record</option>
              <option value="EMPLOYMENT_DOCUMENT" ${typeFilter === 'EMPLOYMENT_DOCUMENT' ? 'selected' : ''}>Employment Document</option>
              <option value="SCHOLARSHIP_DOCUMENT" ${typeFilter === 'SCHOLARSHIP_DOCUMENT' ? 'selected' : ''}>Scholarship Document</option>
            </select>
          </div>
        </div>

        <!-- Document Table or Empty State -->
        ${filtered.length === 0 ? `
          <div style="text-align: center; padding: 48px 20px; background: var(--color-bg); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
            <div style="font-size: 36px; margin-bottom: 10px;">📂</div>
            <h4 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin: 0 0 6px 0;">No Documents Found</h4>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 16px 0;">
              ${query || typeFilter !== 'ALL' ? 'No vault documents match your search filter.' : 'Your Digital Vault is currently empty.'}
            </p>
            ${query || typeFilter !== 'ALL' ? `
              <button class="btn btn-outline btn-sm" onclick="window.app.resetVaultFilters()">Reset Filters</button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="window.app.openVaultUploadModal()">
                Upload Your First Document →
              </button>
            `}
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-size: 12px; text-transform: uppercase;">
                  <th style="padding: 10px 12px;">Document ID</th>
                  <th style="padding: 10px 12px;">Document Title</th>
                  <th style="padding: 10px 12px;">Category</th>
                  <th style="padding: 10px 12px;">File Name & Size</th>
                  <th style="padding: 10px 12px;">Uploaded Date</th>
                  <th style="padding: 10px 12px;">Linked Applications</th>
                  <th style="padding: 10px 12px; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(doc => `
                  <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px; font-family: var(--font-mono); font-weight: 700; color: var(--color-primary); font-size: 12px;">
                      ${doc.id}
                    </td>
                    <td style="padding: 12px;">
                      <div style="font-weight: 700; color: var(--text-main);">${doc.documentName}</div>
                      ${doc.metadata?.issuingAuthority ? `<div style="font-size: 11px; color: var(--text-muted);">${doc.metadata.issuingAuthority}</div>` : ''}
                    </td>
                    <td style="padding: 12px;">
                      ${getCategoryBadge(doc.documentType)}
                    </td>
                    <td style="padding: 12px;">
                      <div style="font-family: var(--font-mono); font-size: 12px; color: var(--text-main);">${doc.fileName}</div>
                      <div style="font-size: 11px; color: var(--text-muted);">${formatFileSize(doc.fileSize)} • ${doc.fileType || 'PDF'}</div>
                    </td>
                    <td style="padding: 12px; color: var(--text-muted); font-size: 12px;">
                      ${doc.uploadedAt ? doc.uploadedAt.slice(0, 10) : 'Recent'}
                    </td>
                    <td style="padding: 12px;">
                      ${(doc.applications && doc.applications.length > 0) ? `
                        <span class="badge badge-outline" style="font-family: var(--font-mono); font-size: 11px;">
                          🔗 ${doc.applications.length} Application${doc.applications.length > 1 ? 's' : ''}
                        </span>
                      ` : `
                        <span style="font-size: 12px; color: var(--text-muted);">Unattached</span>
                      `}
                    </td>
                    <td style="padding: 12px; text-align: right;">
                      <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <button class="btn btn-outline btn-sm" style="padding: 4px 8px;" onclick="window.app.downloadVaultDocument('${doc.id}')" title="Download Document">
                          📥 Download
                        </button>
                        <button class="btn btn-outline btn-sm" style="padding: 4px 8px; color: #dc2626; border-color: #fecaca;" onclick="window.app.deleteVaultDocument('${doc.id}')" title="Delete Document">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;
}
