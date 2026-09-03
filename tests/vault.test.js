import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { renderDocumentVault } from '../public/js/components/DocumentVault.js';
import { db } from '../server/db.js';

describe('Phase 13 — Digital Document Vault Verification', () => {
  let server;
  let port;

  let citizen1Token = '';
  let citizen2Token = '';
  let eduOfficerToken = '';
  let revOfficerToken = '';
  let adminToken = '';

  let cit1DocId = '';
  let cit1ImgDocId = '';
  let cit1AppId = '';

  const request = (method, pathUrl, body = null, headers = {}) => {
    return new Promise((resolve, reject) => {
      const reqHeaders = { ...headers };
      let payload = null;
      if (body) {
        payload = typeof body === 'string' ? body : JSON.stringify(body);
        if (!reqHeaders['Content-Type']) {
          reqHeaders['Content-Type'] = 'application/json';
        }
        if (!reqHeaders['Content-Length']) {
          reqHeaders['Content-Length'] = Buffer.byteLength(payload);
        }
      }

      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: pathUrl,
        method,
        headers: reqHeaders
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, headers: res.headers, data: JSON.parse(data) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, headers: res.headers, raw: data });
          }
        });
      });

      req.on('error', reject);
      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  };

  it('Start dev server with Digital Document Vault Layer', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  it('Setup: Authenticate Citizen 1, Citizen 2, and Department Officers', async () => {
    // 1. Citizen 1 Registration
    const c1 = await request('POST', '/api/v1/auth/register', {
      name: 'Tanvi Joshi',
      email: `vault_c1_${Date.now()}@test.com`,
      password: 'Password@123',
      phone: '+91 98765 77777',
      state: 'Maharashtra',
      district: 'Pune'
    });
    assert.equal(c1.statusCode, 201);
    citizen1Token = c1.data.token;

    // 2. Citizen 2 Registration
    const c2 = await request('POST', '/api/v1/auth/register', {
      name: 'Vikas Gowda',
      email: `vault_c2_${Date.now()}@test.com`,
      password: 'Password@123',
      phone: '+91 98765 88888',
      state: 'Karnataka',
      district: 'Bengaluru'
    });
    assert.equal(c2.statusCode, 201);
    citizen2Token = c2.data.token;

    // 3. Education Officer Login
    const offEdu = await request('POST', '/api/v1/auth/login', {
      email: 'officer.edu@gov.in',
      password: 'Officer@123'
    });
    assert.equal(offEdu.statusCode, 200);
    eduOfficerToken = offEdu.data.token;

    // 4. Revenue Officer Login
    const offRev = await request('POST', '/api/v1/auth/login', {
      email: 'officer.rev@gov.in',
      password: 'Officer@123'
    });
    assert.equal(offRev.statusCode, 200);
    revOfficerToken = offRev.data.token;

    // 5. Admin Login
    const adm = await request('POST', '/api/v1/auth/login', {
      email: 'admin@gov.in',
      password: 'Admin@123'
    });
    assert.equal(adm.statusCode, 200);
    adminToken = adm.data.token;

    // 6. Citizen 1 submits an Education Application
    const appRes = await request('POST', '/api/v1/applications', {
      serviceId: 'SRV-EDU-001',
      formData: {
        fullName: 'Tanvi Joshi',
        email: 'tanvi.joshi@test.com',
        phone: '+91 98765 77777',
        address: '12 Shivaji Nagar, Pune',
        district: 'Pune',
        state: 'Maharashtra',
        annualIncome: '180000',
        institution: 'Pune University',
        course: 'M.Sc Biotechnology',
        previousMarks: '89.4'
      },
      documents: [
        { name: 'College Admission Letter', fileName: 'admission_letter.pdf', fileSize: 1024, status: 'Uploaded' }
      ],
      status: 'SUBMITTED'
    }, { 'Authorization': `Bearer ${citizen1Token}` });
    assert.equal(appRes.statusCode, 201);
    cit1AppId = appRes.data.application.id;
  });

  // 1. Configurable Document Types
  it('GET /api/v1/vault/types returns configured government document categories', async () => {
    const res = await request('GET', '/api/v1/vault/types');
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(Array.isArray(res.data.documentTypes));
    assert.ok(res.data.documentTypes.some(t => t.code === 'IDENTITY_PROOF'));
    assert.ok(res.data.documentTypes.some(t => t.code === 'INCOME_CERTIFICATE'));
    assert.ok(res.data.documentTypes.some(t => t.code === 'EDUCATION_CERTIFICATE'));
  });

  // 2. Authentication & Security Validation
  it('Unauthenticated upload request returns HTTP 401 Unauthorized', async () => {
    const res = await request('POST', '/api/v1/vault/documents', {
      documentType: 'IDENTITY_PROOF',
      documentName: 'Passport Copy',
      fileName: 'passport.pdf',
      fileData: Buffer.from('mock data').toString('base64')
    });
    assert.equal(res.statusCode, 401);
  });

  it('Officer cannot upload citizen documents (HTTP 403 Forbidden)', async () => {
    const res = await request('POST', '/api/v1/vault/documents', {
      documentType: 'IDENTITY_PROOF',
      documentName: 'Officer Attempt',
      fileName: 'test.pdf',
      fileData: Buffer.from('mock data').toString('base64')
    }, { 'Authorization': `Bearer ${eduOfficerToken}` });
    assert.equal(res.statusCode, 403);
  });

  it('Rejection when uploading executable or malicious file extension (HTTP 400)', async () => {
    const res = await request('POST', '/api/v1/vault/documents', {
      documentType: 'IDENTITY_PROOF',
      documentName: 'Malicious Script',
      fileName: 'exploit_script.exe',
      fileData: Buffer.from('malicious payload').toString('base64')
    }, { 'Authorization': `Bearer ${citizen1Token}` });

    assert.equal(res.statusCode, 400);
    assert.equal(res.data.success, false);
    assert.ok(res.data.error.includes('Insecure file extension'));
  });

  it('Rejection when uploading unsupported file extension (HTTP 400)', async () => {
    const res = await request('POST', '/api/v1/vault/documents', {
      documentType: 'IDENTITY_PROOF',
      documentName: 'Plain Text File',
      fileName: 'notes.txt',
      fileData: Buffer.from('plain text').toString('base64')
    }, { 'Authorization': `Bearer ${citizen1Token}` });

    assert.equal(res.statusCode, 400);
    assert.ok(res.data.error.includes('Unsupported file extension'));
  });

  it('Rejection when document file size exceeds 5 MB threshold (HTTP 400)', async () => {
    // 5.5 MB payload
    const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0x41);
    const res = await request('POST', '/api/v1/vault/documents', {
      documentType: 'IDENTITY_PROOF',
      documentName: 'Massive Scan',
      fileName: 'huge_document.pdf',
      fileData: oversizedBuffer.toString('base64')
    }, { 'Authorization': `Bearer ${citizen1Token}` });

    assert.equal(res.statusCode, 400);
    assert.ok(res.data.error.includes('exceeds maximum permitted limit of 5 MB'));
  });

  it('Rejection when uploaded document payload is empty (0 bytes)', async () => {
    const res = await request('POST', '/api/v1/vault/documents', {
      documentType: 'IDENTITY_PROOF',
      documentName: 'Empty File',
      fileName: 'empty.pdf',
      fileData: ''
    }, { 'Authorization': `Bearer ${citizen1Token}` });

    assert.equal(res.statusCode, 400);
    assert.ok(res.data.error.includes('empty'));
  });

  // 3. Successful Upload & Persistence
  it('Citizen 1 successfully uploads valid PDF document (IDENTITY_PROOF)', async () => {
    const samplePdfBuffer = Buffer.from('%PDF-1.4 Mock Government Aadhaar Card for Tanvi Joshi', 'utf8');
    const res = await request('POST', '/api/v1/vault/documents', {
      documentType: 'IDENTITY_PROOF',
      documentName: 'Aadhaar Card e-KYC',
      fileName: 'tanvi_aadhaar.pdf',
      mimeType: 'application/pdf',
      fileData: samplePdfBuffer.toString('base64'),
      metadata: {
        issuingAuthority: 'UIDAI',
        verificationSource: 'DigiLocker Linked'
      }
    }, { 'Authorization': `Bearer ${citizen1Token}` });

    assert.equal(res.statusCode, 201);
    assert.equal(res.data.success, true);
    assert.ok(res.data.document.id.startsWith('DOC-2026-'));
    assert.equal(res.data.document.documentType, 'IDENTITY_PROOF');
    assert.equal(res.data.document.documentStatus, 'ACTIVE');
    assert.equal(res.data.document.storageReference, undefined, 'Confidential storage path must be stripped');
    cit1DocId = res.data.document.id;
  });

  it('Citizen 1 successfully uploads valid Image document (INCOME_CERTIFICATE, PNG)', async () => {
    const sampleImgBuffer = Buffer.from('\x89PNG\r\n\x1a\nMock PNG Image Data for Revenue Tahsildar Income Cert', 'utf8');
    const res = await request('POST', '/api/v1/vault/documents', {
      documentType: 'INCOME_CERTIFICATE',
      documentName: 'Tahsildar Income Certificate FY25-26',
      fileName: 'income_certificate_signed.png',
      mimeType: 'image/png',
      fileData: sampleImgBuffer.toString('base64'),
      expiryDate: '2027-03-31',
      metadata: {
        issuingAuthority: 'Tahsildar Haveli Pune',
        certifiedIncome: '₹1,80,000'
      }
    }, { 'Authorization': `Bearer ${citizen1Token}` });

    assert.equal(res.statusCode, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.document.documentType, 'INCOME_CERTIFICATE');
    assert.equal(res.data.document.fileType, 'image/png');
    cit1ImgDocId = res.data.document.id;
  });

  // 4. Listing & Filtering
  it('Citizen 1 lists their vault documents (GET /api/v1/vault/documents)', async () => {
    const res = await request('GET', '/api/v1/vault/documents', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.count, 2);
    assert.ok(res.data.documents.some(d => d.id === cit1DocId));
    assert.ok(res.data.documents.some(d => d.id === cit1ImgDocId));
    // Verify storage references are not leaked
    assert.ok(res.data.documents.every(d => d.storageReference === undefined));
  });

  it('Citizen 1 filters vault documents by category and search keyword', async () => {
    const resType = await request('GET', '/api/v1/vault/documents?type=INCOME_CERTIFICATE', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(resType.statusCode, 200);
    assert.equal(resType.data.count, 1);
    assert.equal(resType.data.documents[0].id, cit1ImgDocId);

    const resSearch = await request('GET', '/api/v1/vault/documents?search=Aadhaar', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(resSearch.statusCode, 200);
    assert.equal(resSearch.data.count, 1);
    assert.equal(resSearch.data.documents[0].id, cit1DocId);
  });

  // 5. Cross-Citizen Security Isolation
  it('Citizen 2 CANNOT access Citizen 1 document metadata (HTTP 403 Forbidden)', async () => {
    const res = await request('GET', `/api/v1/vault/documents/${cit1DocId}`, null, {
      'Authorization': `Bearer ${citizen2Token}`
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.data.success, false);
  });

  it('Citizen 2 CANNOT download Citizen 1 document (HTTP 403 Forbidden)', async () => {
    const res = await request('GET', `/api/v1/vault/documents/${cit1DocId}/download`, null, {
      'Authorization': `Bearer ${citizen2Token}`
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.data.success, false);
  });

  // 6. Secure Download Handling
  it('Citizen 1 successfully downloads their own document (binary mode)', async () => {
    const res = await request('GET', `/api/v1/vault/documents/${cit1DocId}/download`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.ok(res.headers['content-disposition'].includes('attachment; filename="tanvi_aadhaar.pdf"'));
    assert.ok(res.raw.includes('Mock Government Aadhaar Card for Tanvi Joshi'));
  });

  it('Citizen 1 downloads document in JSON base64 format when Accept header requests application/json', async () => {
    const res = await request('GET', `/api/v1/vault/documents/${cit1DocId}/download`, null, {
      'Authorization': `Bearer ${citizen1Token}`,
      'Accept': 'application/json'
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.dataBase64.length > 0);
    const decoded = Buffer.from(res.data.dataBase64, 'base64').toString('utf8');
    assert.ok(decoded.includes('Mock Government Aadhaar Card for Tanvi Joshi'));
  });

  // 7. Application Integration & Reuse
  it('Citizen 1 associates vault document with their active service application', async () => {
    const res = await request('POST', `/api/v1/vault/documents/${cit1DocId}/associate`, {
      applicationId: cit1AppId
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.applicationId, cit1AppId);

    // Verify application documents list now contains the vault document reference
    const app = db.getApplicationById(cit1AppId);
    assert.ok(app.documents.some(d => d.vaultDocumentId === cit1DocId));
  });

  // 8. Officer Scoped Access
  it('Authorized Education Officer CAN view metadata and download document linked to Education application', async () => {
    // Education Officer inspects document linked to cit1AppId
    const metaRes = await request('GET', `/api/v1/vault/documents/${cit1DocId}`, null, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(metaRes.statusCode, 200);
    assert.equal(metaRes.data.document.id, cit1DocId);

    // Education Officer downloads the document for scrutiny
    const downRes = await request('GET', `/api/v1/vault/documents/${cit1DocId}/download`, null, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(downRes.statusCode, 200);
  });

  it('Revenue Officer CANNOT access Citizen 1 document not linked to Revenue department (HTTP 403)', async () => {
    // Revenue Officer attempts to inspect document only linked to Education application
    const res = await request('GET', `/api/v1/vault/documents/${cit1DocId}`, null, {
      'Authorization': `Bearer ${revOfficerToken}`
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.data.success, false);
    assert.ok(res.data.error.includes('not authorized'));
  });

  // 9. Document Deletion & Integrity Guard
  it('Citizen CANNOT delete document that is actively associated with pending application (HTTP 400)', async () => {
    const res = await request('DELETE', `/api/v1/vault/documents/${cit1DocId}`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.data.success, false);
    assert.ok(res.data.error.includes('actively linked to pending application'));
  });

  it('Citizen 1 can delete an unattached document successfully (HTTP 200)', async () => {
    const res = await request('DELETE', `/api/v1/vault/documents/${cit1ImgDocId}`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);

    // Verify it is no longer listed in active documents
    const listRes = await request('GET', '/api/v1/vault/documents', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(listRes.data.count, 1);
    assert.ok(!listRes.data.documents.some(d => d.id === cit1ImgDocId));
  });

  // 10. Immutable Audit Logging
  it('GET /api/v1/vault/audit returns audit records of document uploads and accesses', async () => {
    const res = await request('GET', '/api/v1/vault/audit', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.logs.length >= 4);
    assert.ok(res.data.logs.some(l => l.action === 'DOCUMENT_UPLOADED'));
    assert.ok(res.data.logs.some(l => l.action === 'DOCUMENT_DOWNLOADED'));
    assert.ok(res.data.logs.some(l => l.action === 'DOCUMENT_ASSOCIATED_WITH_APPLICATION'));
    assert.ok(res.data.logs.some(l => l.action === 'DOCUMENT_DELETED'));
  });

  // 11. UI Component Rendering
  it('renderDocumentVault renders metrics, upload drawer, and document cards table', () => {
    const mockStore = {
      vaultDocuments: [
        {
          id: 'DOC-2026-TEST-01',
          documentName: 'Voter ID Card',
          documentType: 'IDENTITY_PROOF',
          fileName: 'voter_id.pdf',
          fileSize: 204800,
          documentStatus: 'VERIFIED',
          uploadedAt: '2026-08-20T10:00:00.000Z',
          applications: ['APP-2026-REV-4109']
        }
      ],
      vaultSearchQuery: '',
      vaultTypeFilter: 'ALL',
      showVaultUploadModal: true
    };

    const html = renderDocumentVault(mockStore);
    assert.ok(html.includes('Digital Document Vault'));
    assert.ok(html.includes('Upload Document to Vault'));
    assert.ok(html.includes('DOC-2026-TEST-01'));
    assert.ok(html.includes('Voter ID Card'));
    assert.ok(html.includes('Identity Proof'));
    assert.ok(html.includes('1 Application'));
    assert.ok(html.includes('Download'));
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
