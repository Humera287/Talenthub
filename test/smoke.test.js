// Run with: npm test   (uses a throwaway database, never touches talenthub.db)
const os = require('os');
const path = require('path');
const fs = require('fs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'th-'));
process.env.DB_FILE = path.join(tmp, 'test.db');
process.env.STORAGE_DIR = path.join(tmp, 'files');

const assert = require('assert');
const { checkEligibility } = require('../src/services/eligibilityService');
const { seedIfEmpty } = require('../src/db/seed');
const app = require('../src/app');

let passed = 0;
const ok = (name, fn) => Promise.resolve().then(fn).then(() => { passed++; console.log('  PASS', name); },
  (e) => { console.log('  FAIL', name, '\n      ', e.message); process.exitCode = 1; });

(async () => {
  console.log('Eligibility boundary tests (Lab 4, Part B)');
  const S = (o = {}) => ({ cgpa: 8, active_backlogs: 0, branch: 'CSE', has_accepted_offer: 0, ...o });
  const J = (o = {}) => ({ min_cgpa: 7.5, max_backlogs: 0, ...o });
  await ok('CGPA 7.50 vs min 7.50 passes', () => assert.strictEqual(checkEligibility(S({ cgpa: 7.5 }), J(), []).eligible, true));
  await ok('CGPA 7.49 vs min 7.50 fails R1', () => assert.deepStrictEqual(checkEligibility(S({ cgpa: 7.49 }), J(), []).codes, ['R1']));
  await ok('backlogs 1 vs max 0 fails R2', () => assert.deepStrictEqual(checkEligibility(S({ active_backlogs: 1 }), J(), []).codes, ['R2']));
  await ok('backlogs 0 vs max 0 passes', () => assert.strictEqual(checkEligibility(S(), J(), []).eligible, true));
  await ok('accepted offer fails R3', () => assert.deepStrictEqual(checkEligibility(S({ has_accepted_offer: 1 }), J(), []).codes, ['R3']));
  await ok('pool drive passes any branch', () => assert.strictEqual(checkEligibility(S({ branch: 'ME' }), J(), []).eligible, true));
  await ok('CSE/ISE job rejects ECE with R4', () => assert.deepStrictEqual(checkEligibility(S({ branch: 'ECE' }), J(), ['CSE', 'ISE']).codes, ['R4']));
  await ok('R1 and R2 both returned', () => assert.deepStrictEqual(checkEligibility(S({ cgpa: 6, active_backlogs: 2 }), J(), []).codes, ['R1', 'R2']));
  await ok('missing student throws', () => assert.throws(() => checkEligibility(null, J(), [])));

  seedIfEmpty();
  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}/api`;
  const call = async (method, url, token, body) => {
    const r = await fetch(base + url, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const ct = r.headers.get('content-type') || '';
    return { status: r.status, body: ct.includes('json') ? await r.json() : await r.arrayBuffer() };
  };
  const login = async (email, pw) => (await call('POST', '/auth/login', null, { email, password: pw })).body.token;

  console.log('End-to-end flow (the ABC Technologies / Rahul scenario)');
  const rahul = await login('rahul@student.edu', 'Student@123');
  const abc = await login('hr@abc.com', 'Company@123');
  const coord = await login('coordinator@talenthub.edu', 'Coord@123');
  const arjun = await login('arjun@student.edu', 'Student@123');

  await ok('no token -> 401', async () => assert.strictEqual((await call('GET', '/me')).status, 401));
  await ok('wrong password -> 401', async () => assert.strictEqual((await call('POST', '/auth/login', null, { email: 'rahul@student.edu', password: 'nope' })).status, 401));
  await ok('student cannot use company routes -> 403', async () => assert.strictEqual((await call('GET', '/company/jobs', rahul)).status, 403));
  await ok('ineligible student blocked with codes -> 422', async () => {
    const r = await call('POST', '/applications', arjun, { jobId: 1 });
    assert.strictEqual(r.status, 422);
    assert.deepStrictEqual(r.body.details.codes, ['R1', 'R2', 'R4']);
  });
  let appId;
  await ok('Rahul applies to ABC job', async () => {
    const r = await call('POST', '/applications', rahul, { jobId: 1 });
    assert.strictEqual(r.status, 201); appId = r.body.application_id;
  });
  await ok('duplicate application -> 409', async () => assert.strictEqual((await call('POST', '/applications', rahul, { jobId: 1 })).status, 409));
  await ok('company cannot offer before interview -> 409', async () => assert.strictEqual((await call('POST', `/company/applications/${appId}/offer`, abc, { package_lpa: 10 })).status, 409));
  await ok('company shortlists', async () => assert.strictEqual((await call('POST', `/company/applications/${appId}/shortlist`, abc)).body.status, 'SHORTLISTED'));
  let slot;
  await ok('company schedules interview', async () => {
    const r = await call('POST', `/company/applications/${appId}/interviews`, abc, { round_number: 1, scheduled_at: '2026-11-20T10:00:00', venue: 'Seminar Hall' });
    assert.strictEqual(r.status, 201); slot = r.body.slot_id;
  });
  await ok('offer blocked until round passed -> 409', async () => assert.strictEqual((await call('POST', `/company/applications/${appId}/offer`, abc, { package_lpa: 10 })).status, 409));
  await ok('record pass result', async () => assert.strictEqual((await call('POST', `/company/interviews/${slot}/result`, abc, { passed: true })).status, 200));
  await ok('company issues offer', async () => assert.strictEqual((await call('POST', `/company/applications/${appId}/offer`, abc, { package_lpa: 10.5 })).status, 201));
  await ok('second offer -> 409', async () => assert.strictEqual((await call('POST', `/company/applications/${appId}/offer`, abc, { package_lpa: 12 })).status, 409));
  await ok('offer letter downloads as PDF', async () => {
    const r = await call('GET', `/applications/${appId}/offer-letter`, rahul);
    assert.strictEqual(r.status, 200); assert.strictEqual(Buffer.from(r.body).slice(0, 4).toString(), '%PDF');
  });
  await ok("another student cannot download Rahul's letter -> 403", async () => assert.strictEqual((await call('GET', `/applications/${appId}/offer-letter`, arjun)).status, 403));
  await ok('Rahul accepts', async () => assert.strictEqual((await call('POST', `/applications/${appId}/accept`, rahul)).body.status, 'ACCEPTED'));
  await ok('stats count the placement', async () => {
    const s = (await call('GET', '/coordinator/stats', coord)).body;
    assert.strictEqual(s.placedStudents, 1); assert.strictEqual(s.applicationsByStatus.ACCEPTED, 1);
  });
  await ok('audit trail has 5 changes for the application', async () => {
    const a = (await call('GET', '/coordinator/audit', coord)).body.filter((h) => h.application_id === appId);
    assert.strictEqual(a.length, 5); // APPLIED, SHORTLISTED, INTERVIEW_SCHEDULED, OFFERED, ACCEPTED
  });
  await ok('accepted student now fails R3 on other jobs', async () => {
    const jobs = (await call('GET', '/jobs', rahul)).body;
    assert.ok(jobs.every((j) => j.eligibility.codes.includes('R3')));
  });
  await ok('erasure anonymises and blocks login', async () => {
    assert.strictEqual((await call('DELETE', '/auth/me', rahul)).status, 200);
    assert.strictEqual((await call('POST', '/auth/login', null, { email: 'rahul@student.edu', password: 'Student@123' })).status, 401);
    const st = (await call('GET', '/coordinator/audit', coord)).body; // audit trail still intact
    assert.ok(st.length >= 5);
  });

  server.close();
  console.log(`\n${passed} checks passed${process.exitCode ? ' (some FAILED)' : ''}`);
})();
