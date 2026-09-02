import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { db, SERVICES } from '../server/db.js';
import { store } from '../public/js/store.js';
import { renderGovernmentServices } from '../public/js/components/GovernmentServices.js';
import { renderServiceDetails } from '../public/js/components/ServiceDetails.js';

describe('Phase 4 — Government Service Catalog Verification', () => {

  // 1. Data Model Completeness
  describe('Service Catalog Data Model Completeness', () => {
    it('every service must contain all mandatory metadata fields per PLAN.md specification', () => {
      assert.ok(SERVICES.length >= 8, 'Catalog must contain at least 8 canonical services');

      const mandatoryFields = [
        'id',
        'code',
        'title',
        'department',
        'departmentCode',
        'category',
        'description',
        'whoCanApply',
        'eligibility',
        'requiredDocuments',
        'turnaroundTime',
        'applicationMethod',
        'serviceStatus',
        'applicationAvailability',
        'officialUrl'
      ];

      for (const service of SERVICES) {
        for (const field of mandatoryFields) {
          assert.ok(
            service[field] !== undefined && service[field] !== null && service[field] !== '',
            `Service ${service.id} is missing mandatory field: ${field}`
          );
        }
        assert.ok(Array.isArray(service.requiredDocuments) && service.requiredDocuments.length >= 2,
          `Service ${service.id} must have at least 2 required documents`);
        assert.ok(service.officialUrl.startsWith('https://'),
          `Service ${service.id} officialUrl must be a secure https link`);
      }
    });
  });

  // 2. Search Engine Verification
  describe('Service Search Functionality', () => {
    it('should search services by title', () => {
      const results = db.getServices({ search: 'Scholarship' });
      assert.ok(results.length >= 2, 'Should find at least 2 scholarship services');
      assert.ok(results.some(s => s.id === 'SRV-EDU-001'));
      assert.ok(results.some(s => s.id === 'SRV-EDU-007'));
    });

    it('should search services by keyword', () => {
      // Keyword "tahsildar" in income/caste certificate
      const certResults = db.getServices({ search: 'tahsildar' });
      assert.ok(certResults.length >= 2, 'Should find certificates by keyword tahsildar');

      // Keyword "kisan" in farmer subsidy
      const kisanResults = db.getServices({ search: 'kisan' });
      assert.ok(kisanResults.length >= 1, 'Should find agriculture scheme by keyword kisan');
      assert.equal(kisanResults[0].id, 'SRV-AGR-005');
    });

    it('should search services by department name or code', () => {
      const eduResults = db.getServices({ search: 'Higher Education' });
      assert.ok(eduResults.length >= 2);

      const revResults = db.getServices({ search: 'Revenue' });
      assert.ok(revResults.length >= 2);
    });

    it('should return empty list gracefully for unmatched queries', () => {
      const noResults = db.getServices({ search: 'NonExistentSpaceService9999' });
      assert.equal(noResults.length, 0, 'Unmatched search should return empty array');
    });
  });

  // 3. Multi-Faceted Filter Verification
  describe('Multi-Facet Filtering (Category, Department, Availability)', () => {
    it('should filter strictly by Category', () => {
      const certs = db.getServices({ category: 'Certificates' });
      assert.ok(certs.length >= 2);
      assert.ok(certs.every(s => s.category.toLowerCase() === 'certificates'));
    });

    it('should filter strictly by Department', () => {
      const eduServices = db.getServices({ department: 'EDUCATION' });
      assert.ok(eduServices.length >= 2);
      assert.ok(eduServices.every(s => s.departmentCode === 'EDUCATION'));
    });

    it('should combine Search, Category, and Department filters', () => {
      const combined = db.getServices({
        search: 'Income',
        category: 'Certificates',
        department: 'REVENUE'
      });
      assert.equal(combined.length, 1);
      assert.equal(combined[0].id, 'SRV-REV-002');
      assert.equal(combined[0].title, 'Issuance of Income Certificate');
    });
  });

  // 4. Service Details Lookup
  describe('Service Details Retrieval', () => {
    it('should retrieve complete service record by ID', () => {
      const service = db.getServiceById('SRV-EDU-001');
      assert.ok(service);
      assert.equal(service.title, 'Post-Matric Scholarship for Higher Education');
      assert.equal(service.turnaroundTime, '5-7 Working Days');
      assert.ok(service.whoCanApply.includes('college'));
      assert.ok(service.workflowStages.length >= 3);
    });

    it('should return null for invalid service ID', () => {
      const service = db.getServiceById('SRV-UNKNOWN-999');
      assert.equal(service, null);
    });
  });

  // 5. REST API Endpoints Verification
  describe('Live HTTP API: /api/v1/services & /api/v1/categories', () => {
    let server;
    let port;

    const fetchJson = (pathUrl) => {
      return new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}${pathUrl}`, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, raw: data });
            }
          });
        }).on('error', reject);
      });
    };

    it('should serve catalog APIs over HTTP with query filtering and 404 validation', async () => {
      server = createServer();
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      port = server.address().port;

      try {
        // 1. GET /api/v1/services (All services)
        const allRes = await fetchJson('/api/v1/services');
        assert.equal(allRes.status, 200);
        assert.ok(allRes.body.success);
        assert.ok(allRes.body.count >= 8);

        // 2. GET /api/v1/services?category=Scholarships
        const catRes = await fetchJson('/api/v1/services?category=Scholarships');
        assert.equal(catRes.status, 200);
        assert.ok(catRes.body.services.every(s => s.category === 'Scholarships'));

        // 3. GET /api/v1/services?search=license
        const searchRes = await fetchJson('/api/v1/services?search=license');
        assert.equal(searchRes.status, 200);
        assert.ok(searchRes.body.count >= 1);
        assert.equal(searchRes.body.services[0].id, 'SRV-TRN-004');

        // 4. GET /api/v1/services/SRV-EDU-001 (Single service)
        const detailRes = await fetchJson('/api/v1/services/SRV-EDU-001');
        assert.equal(detailRes.status, 200);
        assert.equal(detailRes.body.service.id, 'SRV-EDU-001');
        assert.ok(detailRes.body.service.requiredDocuments.length >= 4);

        // 5. GET /api/v1/services/INVALID-999 -> 404 Not Found
        const notFoundRes = await fetchJson('/api/v1/services/INVALID-999');
        assert.equal(notFoundRes.status, 404);
        assert.equal(notFoundRes.body.success, false);
        assert.ok(notFoundRes.body.error.includes('Service not found with ID: INVALID-999'));

        // 6. GET /api/v1/categories
        const categoriesRes = await fetchJson('/api/v1/categories');
        assert.equal(categoriesRes.status, 200);
        assert.ok(categoriesRes.body.categories.length >= 4);
        assert.ok(categoriesRes.body.categories.includes('Scholarships'));

      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    });
  });

  // 6. UI Component Rendering Verification
  describe('UI Component Rendering: Catalog & Details', () => {
    it('renderGovernmentServices must render service cards, filters, and View Details triggers', () => {
      const html = renderGovernmentServices(store);
      assert.ok(html.includes('National Government Service Catalog'), 'Missing catalog title');
      assert.ok(html.includes('View Details'), 'Missing View Details button');
      assert.ok(html.includes('Start Application'), 'Missing Start Application button');
      assert.ok(html.includes('SRV-EDU-001'), 'Missing service ID');
      assert.ok(html.includes('Post-Matric Scholarship for Higher Education'), 'Missing service title');
    });

    it('renderServiceDetails must render deep-dive criteria and official source URL', () => {
      const html = renderServiceDetails(store, 'SRV-EDU-001');
      assert.ok(html.includes('Post-Matric Scholarship for Higher Education'));
      assert.ok(html.includes('Who Can Apply'));
      assert.ok(html.includes('Eligibility Criteria Checklist'));
      assert.ok(html.includes('Required Documents Checklist'));
      assert.ok(html.includes('https://scholarships.gov.in'));
      assert.ok(html.includes('Start Application'));
      assert.ok(html.includes('Back to Service Catalog'));
    });

    it('renderServiceDetails must handle invalid service ID gracefully', () => {
      const html = renderServiceDetails(store, 'NON-EXISTENT-ID');
      assert.ok(html.includes('Service Not Found'));
      assert.ok(html.includes('Back to Service Catalog'));
    });
  });
});
