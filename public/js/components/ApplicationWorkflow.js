/**
 * Component: ApplicationWorkflow
 * Multi-Step Unified Government Application Workflow
 * Steps: 1. Applicant Info -> 2. Service Info -> 3. Documents -> 4. Review -> 5. Confirmation
 */

export function renderApplicationWorkflow(store) {
  const draft = store.activeApplicationDraft;
  if (!draft || !draft.serviceId) {
    return `
      <div style="max-width: 600px; margin: 48px auto; text-align: center; background: #ffffff; padding: 36px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
        <div style="font-size: 40px; margin-bottom: 12px;">📄</div>
        <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">No Active Application Session</h3>
        <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 20px;">
          Please select a government service from the catalog to initiate your unified application.
        </p>
        <button class="btn btn-primary" onclick="window.app.navigate('services')">
          ← Explore Service Catalog
        </button>
      </div>
    `;
  }

  const service = store.services.find(s => s.id === draft.serviceId) || draft.service;
  const currentStep = draft.step || 1;
  const formData = draft.formData || {};
  const documents = draft.documents || [];
  const errors = draft.errors || [];

  return `
    <div class="workflow-container" style="max-width: 900px; margin: 0 auto;">
      <!-- Breadcrumbs & Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="badge badge-neutral" style="font-family: var(--font-mono);">${service.id}</span>
          <h1 style="font-size: 22px; font-weight: 700; color: var(--color-primary-dark); margin-top: 4px;">
            ${service.title}
          </h1>
          <p style="font-size: 13px; color: var(--text-muted);">
            🏛️ ${service.department} • Turnaround SLA: <strong>${service.turnaroundTime}</strong>
          </p>
        </div>
        <div>
          <button class="btn btn-outline btn-sm" onclick="window.app.cancelApplication()">
            ✕ Cancel
          </button>
        </div>
      </div>

      <!-- Multi-Step Progress Tracker -->
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 18px 24px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; position: relative;">
          <!-- Step 1 -->
          <div style="display: flex; flex-direction: column; align-items: center; z-index: 1; flex: 1; text-align: center;">
            <div style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; margin-bottom: 6px; ${currentStep >= 1 ? 'background: var(--color-primary); color: #ffffff;' : 'background: #e2e8f0; color: var(--text-muted);'}">
              ${currentStep > 1 ? '✓' : '1'}
            </div>
            <span style="font-size: 12px; font-weight: ${currentStep === 1 ? '700' : '500'}; color: ${currentStep === 1 ? 'var(--color-primary)' : 'var(--text-muted)'};">
              Applicant Info
            </span>
          </div>

          <!-- Step 2 -->
          <div style="display: flex; flex-direction: column; align-items: center; z-index: 1; flex: 1; text-align: center;">
            <div style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; margin-bottom: 6px; ${currentStep >= 2 ? 'background: var(--color-primary); color: #ffffff;' : 'background: #e2e8f0; color: var(--text-muted);'}">
              ${currentStep > 2 ? '✓' : '2'}
            </div>
            <span style="font-size: 12px; font-weight: ${currentStep === 2 ? '700' : '500'}; color: ${currentStep === 2 ? 'var(--color-primary)' : 'var(--text-muted)'};">
              Service Details
            </span>
          </div>

          <!-- Step 3 -->
          <div style="display: flex; flex-direction: column; align-items: center; z-index: 1; flex: 1; text-align: center;">
            <div style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; margin-bottom: 6px; ${currentStep >= 3 ? 'background: var(--color-primary); color: #ffffff;' : 'background: #e2e8f0; color: var(--text-muted);'}">
              ${currentStep > 3 ? '✓' : '3'}
            </div>
            <span style="font-size: 12px; font-weight: ${currentStep === 3 ? '700' : '500'}; color: ${currentStep === 3 ? 'var(--color-primary)' : 'var(--text-muted)'};">
              Documents
            </span>
          </div>

          <!-- Step 4 -->
          <div style="display: flex; flex-direction: column; align-items: center; z-index: 1; flex: 1; text-align: center;">
            <div style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; margin-bottom: 6px; ${currentStep >= 4 ? 'background: var(--color-primary); color: #ffffff;' : 'background: #e2e8f0; color: var(--text-muted);'}">
              ${currentStep > 4 ? '✓' : '4'}
            </div>
            <span style="font-size: 12px; font-weight: ${currentStep === 4 ? '700' : '500'}; color: ${currentStep === 4 ? 'var(--color-primary)' : 'var(--text-muted)'};">
              Review
            </span>
          </div>

          <!-- Step 5 -->
          <div style="display: flex; flex-direction: column; align-items: center; z-index: 1; flex: 1; text-align: center;">
            <div style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; margin-bottom: 6px; ${currentStep === 5 ? 'background: var(--color-success); color: #ffffff;' : 'background: #e2e8f0; color: var(--text-muted);'}">
              ${currentStep === 5 ? '✓' : '5'}
            </div>
            <span style="font-size: 12px; font-weight: ${currentStep === 5 ? '700' : '500'}; color: ${currentStep === 5 ? 'var(--color-success)' : 'var(--text-muted)'};">
              Confirmation
            </span>
          </div>
        </div>
      </div>

      <!-- Validation Error Banner -->
      ${errors && errors.length > 0 ? `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; border-radius: var(--radius-md); margin-bottom: 20px;">
          <h4 style="font-size: 14px; font-weight: 700; color: #991b1b; margin-bottom: 4px;">Please correct the following errors:</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #b91c1c;">
            ${errors.map(err => `<li>${err}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Step Content Switcher -->
      ${renderCurrentStepContent(currentStep, service, formData, documents, draft, store)}
    </div>
  `;
}

function renderCurrentStepContent(step, service, formData, documents, draft, store) {
  switch (step) {
    case 1:
      return renderStep1ApplicantInfo(service, formData);
    case 2:
      return renderStep2ServiceInfo(service, formData);
    case 3:
      return renderStep3Documents(service, documents);
    case 4:
      return renderStep4Review(service, formData, documents);
    case 5:
      return renderStep5Confirmation(draft, service);
    default:
      return renderStep1ApplicantInfo(service, formData);
  }
}

// -----------------------------------------------------------------------------
// STEP 1: Applicant Information
// -----------------------------------------------------------------------------
function renderStep1ApplicantInfo(service, formData) {
  return `
    <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 28px; box-shadow: var(--shadow-sm);">
      <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 14px; margin-bottom: 20px;">
        <h3 style="font-size: 17px; font-weight: 700; color: var(--color-primary-dark);">
          Step 1: Citizen Identity & Contact Details
        </h3>
        <p style="font-size: 13px; color: var(--text-muted);">
          Pre-filled automatically from your verified citizen account. Confirm or update as needed.
        </p>
      </div>

      <form id="workflowStep1Form" onsubmit="window.app.handleStep1Submit(event)" style="display: flex; flex-direction: column; gap: 18px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
              Full Legal Name <span style="color: #ef4444;">*</span>
            </label>
            <input 
              type="text" 
              name="fullName" 
              value="${formData.fullName || formData.applicantName || ''}" 
              required 
              style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
            />
          </div>
          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
              Aadhaar ID (Masked)
            </label>
            <input 
              type="text" 
              name="aadhaarMasked" 
              value="${formData.aadhaarMasked || 'XXXX-XXXX-4819'}" 
              disabled 
              style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px; background: #f8fafc; font-family: var(--font-mono);"
            />
            <span style="font-size: 11px; color: var(--color-success);">✓ e-KYC Verified via DigiLocker</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
              Email Address <span style="color: #ef4444;">*</span>
            </label>
            <input 
              type="email" 
              name="email" 
              value="${formData.email || ''}" 
              required 
              style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
            />
          </div>
          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
              Mobile Number (10 Digits) <span style="color: #ef4444;">*</span>
            </label>
            <input 
              type="tel" 
              name="phone" 
              value="${formData.phone || ''}" 
              required 
              pattern="[0-9+ ]{10,15}"
              style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
            />
          </div>
        </div>

        <div>
          <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
            Permanent Residential Address <span style="color: #ef4444;">*</span>
          </label>
          <input 
            type="text" 
            name="address" 
            value="${formData.address || 'Flat 402, Green Meadows Apartment, Shivaji Nagar'}" 
            required 
            style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
          />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
              State <span style="color: #ef4444;">*</span>
            </label>
            <input 
              type="text" 
              name="state" 
              value="${formData.state || 'Maharashtra'}" 
              required 
              style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
            />
          </div>
          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
              District <span style="color: #ef4444;">*</span>
            </label>
            <input 
              type="text" 
              name="district" 
              value="${formData.district || 'Pune'}" 
              required 
              style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
            />
          </div>
        </div>

        <!-- Controls -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 10px;">
          <button type="button" class="btn btn-outline" onclick="window.app.saveApplicationDraft()">
            💾 Save Draft
          </button>
          <button type="submit" class="btn btn-primary">
            Next: Service Details →
          </button>
        </div>
      </form>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// STEP 2: Service Specific Information
// -----------------------------------------------------------------------------
function renderStep2ServiceInfo(service, formData) {
  const category = (service.category || '').toLowerCase();
  const code = (service.code || service.id || '').toUpperCase();

  return `
    <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 28px; box-shadow: var(--shadow-sm);">
      <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 14px; margin-bottom: 20px;">
        <h3 style="font-size: 17px; font-weight: 700; color: var(--color-primary-dark);">
          Step 2: Service-Specific Requirements
        </h3>
        <p style="font-size: 13px; color: var(--text-muted);">
          Provide specific details required by <strong>${service.department}</strong>.
        </p>
      </div>

      <form id="workflowStep2Form" onsubmit="window.app.handleStep2Submit(event)" style="display: flex; flex-direction: column; gap: 18px;">
        ${category.includes('scholarship') || code.includes('SCHOLARSHIP') ? `
          <!-- Scholarship Fields -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                Institution / University Name <span style="color: #ef4444;">*</span>
              </label>
              <input 
                type="text" 
                name="institution" 
                placeholder="e.g. Pune University / Government Engineering College"
                value="${formData.institution || ''}" 
                required 
                style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
              />
            </div>
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                Enrolled Course / Degree <span style="color: #ef4444;">*</span>
              </label>
              <input 
                type="text" 
                name="course" 
                placeholder="e.g. B.Tech Computer Science & Engineering"
                value="${formData.course || ''}" 
                required 
                style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
              />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                Annual Gross Family Income (₹) <span style="color: #ef4444;">*</span>
              </label>
              <input 
                type="number" 
                name="annualIncome" 
                placeholder="e.g. 180000"
                value="${formData.annualIncome || ''}" 
                required 
                style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
              />
              <span style="font-size: 11px; color: var(--text-muted);">Eligibility threshold: ≤ ₹2,50,000 / year</span>
            </div>
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                Previous Qualifying Examination Score (%) <span style="color: #ef4444;">*</span>
              </label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                max="100"
                name="previousMarks" 
                placeholder="e.g. 84.50"
                value="${formData.previousMarks || ''}" 
                required 
                style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
              />
            </div>
          </div>
        ` : category.includes('certificate') || code.includes('INCOME_CERT') ? `
          <!-- Revenue Certificate Fields -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                Declared Annual Family Income (₹) <span style="color: #ef4444;">*</span>
              </label>
              <input 
                type="number" 
                name="annualIncome" 
                placeholder="e.g. 145000"
                value="${formData.annualIncome || ''}" 
                required 
                style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
              />
            </div>
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                Primary Household Occupation <span style="color: #ef4444;">*</span>
              </label>
              <input 
                type="text" 
                name="occupation" 
                placeholder="e.g. Agriculture / Small Business / Private Service"
                value="${formData.occupation || ''}" 
                required 
                style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
              />
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
              Purpose for Obtaining Certificate <span style="color: #ef4444;">*</span>
            </label>
            <input 
              type="text" 
              name="purpose" 
              placeholder="e.g. Higher Education Scholarship Application / Fee Concession"
              value="${formData.purpose || ''}" 
              required 
              style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
            />
          </div>
        ` : category.includes('health') || code.includes('HEALTH') ? `
          <!-- Health Coverage Fields -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                Ration Card / NFSA Beneficiary Number <span style="color: #ef4444;">*</span>
              </label>
              <input 
                type="text" 
                name="rationCardNumber" 
                placeholder="e.g. MH-NFSA-2849102"
                value="${formData.rationCardNumber || ''}" 
                required 
                style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
              />
            </div>
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                Total Dependent Family Members Count <span style="color: #ef4444;">*</span>
              </label>
              <input 
                type="number" 
                min="1"
                max="20"
                name="familyMembersCount" 
                value="${formData.familyMembersCount || '4'}" 
                required 
                style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
              />
            </div>
          </div>
        ` : category.includes('transport') || code.includes('DL_') ? `
          <!-- Transport Driving License Fields -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                Existing Driving License Number <span style="color: #ef4444;">*</span>
              </label>
              <input 
                type="text" 
                name="licenseNumber" 
                placeholder="e.g. MH12-20180094182"
                value="${formData.licenseNumber || ''}" 
                required 
                style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
              />
            </div>
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                Date of License Expiry <span style="color: #ef4444;">*</span>
              </label>
              <input 
                type="date" 
                name="expiryDate" 
                value="${formData.expiryDate || '2026-06-30'}" 
                required 
                style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
              />
            </div>
          </div>
        ` : `
          <!-- Generic Fallback Form Fields -->
          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
              Applicant Specific Justification & Purpose <span style="color: #ef4444;">*</span>
            </label>
            <textarea 
              name="purpose" 
              rows="3" 
              required 
              style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px;"
            >${formData.purpose || 'Official application for ' + service.title}</textarea>
          </div>
        `}

        <!-- Navigation Buttons -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 10px;">
          <button type="button" class="btn btn-outline" onclick="window.app.goToApplicationStep(1)">
            ← Back
          </button>
          <div style="display: flex; gap: 10px;">
            <button type="button" class="btn btn-outline" onclick="window.app.saveApplicationDraft()">
              💾 Save Draft
            </button>
            <button type="submit" class="btn btn-primary">
              Next: Upload Documents →
            </button>
          </div>
        </div>
      </form>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// STEP 3: Required Documents Upload
// -----------------------------------------------------------------------------
function renderStep3Documents(service, documents) {
  const requiredList = service.requiredDocuments || [];

  return `
    <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 28px; box-shadow: var(--shadow-sm);">
      <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 14px; margin-bottom: 20px;">
        <h3 style="font-size: 17px; font-weight: 700; color: var(--color-primary-dark);">
          Step 3: Document Uploads & Verification
        </h3>
        <p style="font-size: 13px; color: var(--text-muted);">
          Upload clear scanned copies of required documents. Accepted formats: <strong>PDF, JPG, PNG</strong> (Max 5 MB each).
        </p>
      </div>

      <!-- Required Documents Checklist -->
      <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
        ${requiredList.map((docName, index) => {
          const uploadedDoc = documents.find(d => d.name === docName);
          return `
            <div style="border: 1px solid ${uploadedDoc ? 'var(--color-success)' : 'var(--border-color)'}; border-radius: var(--radius-md); padding: 16px; background: ${uploadedDoc ? '#f0fdf4' : '#f8fafc'};">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 14px; font-weight: 700; color: var(--text-main);">${index + 1}. ${docName}</span>
                    <span style="color: #ef4444; font-size: 12px;">*</span>
                  </div>
                  <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                    Official government record or attested copy.
                  </p>
                </div>

                <div>
                  ${uploadedDoc ? `
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span class="badge badge-success">✓ Uploaded: ${uploadedDoc.fileName} (${(uploadedDoc.fileSize / 1024).toFixed(0)} KB)</span>
                      <button type="button" class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #fca5a5;" onclick="window.app.removeDocument('${docName}')">
                        ✕ Remove
                      </button>
                    </div>
                  ` : `
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <input 
                        type="file" 
                        id="docInput_${index}"
                        accept=".pdf,.jpg,.jpeg,.png" 
                        style="display: none;"
                        onchange="window.app.handleDocumentUpload('${docName}', this)"
                      />
                      <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('docInput_${index}').click()">
                        📁 Select File
                      </button>
                    </div>
                  `}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Navigation Buttons -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
        <button type="button" class="btn btn-outline" onclick="window.app.goToApplicationStep(2)">
          ← Back
        </button>
        <div style="display: flex; gap: 10px;">
          <button type="button" class="btn btn-outline" onclick="window.app.saveApplicationDraft()">
            💾 Save Draft
          </button>
          <button type="button" class="btn btn-primary" onclick="window.app.goToApplicationStep(4)">
            Next: Review Application →
          </button>
        </div>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// STEP 4: Application Review & Submission
// -----------------------------------------------------------------------------
function renderStep4Review(service, formData, documents) {
  return `
    <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 28px; box-shadow: var(--shadow-sm);">
      <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 14px; margin-bottom: 20px;">
        <h3 style="font-size: 17px; font-weight: 700; color: var(--color-primary-dark);">
          Step 4: Application Review & Consent Declaration
        </h3>
        <p style="font-size: 13px; color: var(--text-muted);">
          Please review all entered details carefully before final submission.
        </p>
      </div>

      <!-- Review Section: Service Overview -->
      <div style="background: #f8fafc; border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px; border-left: 4px solid var(--color-primary);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
          <div>
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Target Service</span>
            <h4 style="font-size: 16px; font-weight: 700; color: var(--color-primary-dark);">${service.title}</h4>
            <span style="font-size: 13px; color: var(--text-muted);">🏛️ ${service.department} • Code: <code>${service.id}</code></span>
          </div>
          <div>
            <span class="badge badge-info">Turnaround: ${service.turnaroundTime}</span>
          </div>
        </div>
      </div>

      <!-- Review Section: Applicant Details -->
      <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main);">Applicant Information</h4>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.app.goToApplicationStep(1)">
            ✎ Edit
          </button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
          <div><strong>Full Name:</strong> ${formData.fullName || formData.applicantName || '—'}</div>
          <div><strong>Aadhaar ID:</strong> ${formData.aadhaarMasked || 'XXXX-XXXX-4819'}</div>
          <div><strong>Email Address:</strong> ${formData.email || '—'}</div>
          <div><strong>Mobile Number:</strong> ${formData.phone || '—'}</div>
          <div style="grid-column: 1 / -1;"><strong>Residential Address:</strong> ${formData.address || '—'}, ${formData.district || '—'}, ${formData.state || '—'}</div>
        </div>
      </div>

      <!-- Review Section: Service Details -->
      <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main);">Service Information</h4>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.app.goToApplicationStep(2)">
            ✎ Edit
          </button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
          ${formData.institution ? `<div><strong>Institution:</strong> ${formData.institution}</div>` : ''}
          ${formData.course ? `<div><strong>Course:</strong> ${formData.course}</div>` : ''}
          ${formData.annualIncome ? `<div><strong>Declared Annual Income:</strong> ₹${Number(formData.annualIncome).toLocaleString('en-IN')}</div>` : ''}
          ${formData.previousMarks ? `<div><strong>Previous Marks:</strong> ${formData.previousMarks}%</div>` : ''}
          ${formData.occupation ? `<div><strong>Occupation:</strong> ${formData.occupation}</div>` : ''}
          ${formData.purpose ? `<div><strong>Purpose:</strong> ${formData.purpose}</div>` : ''}
          ${formData.rationCardNumber ? `<div><strong>Ration Card:</strong> ${formData.rationCardNumber}</div>` : ''}
          ${formData.licenseNumber ? `<div><strong>Driving License:</strong> ${formData.licenseNumber}</div>` : ''}
        </div>
      </div>

      <!-- Review Section: Uploaded Documents -->
      <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main);">Attached Documents (${documents.length})</h4>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.app.goToApplicationStep(3)">
            ✎ Manage
          </button>
        </div>
        ${documents.length === 0 ? `
          <p style="font-size: 13px; color: #dc2626;">⚠️ No documents attached yet. Please attach required verification files.</p>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${documents.map(d => `
              <div style="display: flex; justify-content: space-between; font-size: 13px; background: #f8fafc; padding: 8px 12px; border-radius: var(--radius-md);">
                <span>📁 <strong>${d.name}:</strong> ${d.fileName}</span>
                <span style="color: var(--text-muted);">${(d.fileSize / 1024).toFixed(0)} KB</span>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Citizen Legal Declaration -->
      <div style="background: #f1f5f9; border-radius: var(--radius-md); padding: 16px; margin-bottom: 24px;">
        <label style="display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: var(--text-main); cursor: pointer;">
          <input type="checkbox" id="declarationConsent" required style="margin-top: 3px;" />
          <span>
            I solemnly declare that all particulars furnished above are true and complete. I authorize the unified portal to cross-verify the uploaded certificates with departmental records.
          </span>
        </label>
      </div>

      <!-- Submission Actions -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
        <button type="button" class="btn btn-outline" onclick="window.app.goToApplicationStep(3)">
          ← Back
        </button>
        <div style="display: flex; gap: 10px;">
          <button type="button" class="btn btn-outline" onclick="window.app.saveApplicationDraft()">
            💾 Save Draft
          </button>
          <button type="button" class="btn btn-primary" onclick="window.app.submitFinalApplication()">
            🚀 Submit Final Application
          </button>
        </div>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// STEP 5: Submission Confirmation Screen
// -----------------------------------------------------------------------------
function renderStep5Confirmation(draft, service) {
  const submittedApp = draft.submittedApp || {};
  const appId = submittedApp.id || 'APP-2026-GOV-' + Math.floor(1000 + Math.random() * 9000);
  const submittedDate = submittedApp.submittedAt || new Date().toISOString();

  return `
    <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 36px 28px; text-align: center; box-shadow: var(--shadow-sm);">
      <div style="width: 64px; height: 64px; border-radius: 50%; background: #dcfce7; color: #15803d; font-size: 32px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
        ✓
      </div>

      <h2 style="font-size: 22px; font-weight: 700; color: var(--color-primary-dark); margin-bottom: 6px;">
        Application Submitted Successfully!
      </h2>
      <p style="font-size: 14px; color: var(--text-muted); max-width: 500px; margin: 0 auto 20px;">
        Your application for <strong>${service.title}</strong> has been assigned to <strong>${service.department}</strong>.
      </p>

      <!-- Application Reference Receipt Card -->
      <div style="max-width: 480px; margin: 0 auto 24px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 20px; text-align: left;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Application ID</span>
          <span style="font-family: var(--font-mono); font-weight: 700; color: var(--color-primary); font-size: 15px;">${appId}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Status</span>
          <span class="badge badge-success">● SUBMITTED</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Submission Timestamp</span>
          <span style="font-size: 13px; font-family: var(--font-mono);">${new Date(submittedDate).toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Estimated Turnaround</span>
          <span style="font-size: 13px; font-weight: 600;">${service.turnaroundTime}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
        <button class="btn btn-outline" onclick="window.app.navigate('services')">
          Explore Other Services
        </button>
        <button class="btn btn-primary" onclick="window.app.navigate('tracking')">
          View My Applications & Track Status
        </button>
      </div>
    </div>
  `;
}
