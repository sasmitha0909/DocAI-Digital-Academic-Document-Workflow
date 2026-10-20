const http = require('http');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING PHASE 1 API VERIFICATION TESTS ---');
  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failCount++;
    }
  }

  // 1. Health check
  const health = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
  });
  assert(health.status === 200 && health.data.status === 'healthy', 'Health check is operational');
  assert(health.data.database.userCount === 22, `Database user count is 22 (got ${health.data.database.userCount})`);

  // 2. Test Login for all 5 roles
  const testAccounts = [
    { role: 'student', identifier: 'student.aids1@college.edu', name: 'Alex Johnson' },
    { role: 'student', identifier: 'REG2024AIDS001', name: 'Alex Johnson (by Register Number)' },
    { role: 'faculty', identifier: 'faculty1.aids@college.edu', name: 'Dr. Arun Kumar' },
    { role: 'hod', identifier: 'hod.aids@college.edu', name: 'Prof. Meera Pillai' },
    { role: 'admin', identifier: 'admin@college.edu', name: 'Academic Administrator' },
    { role: 'principal', identifier: 'principal@college.edu', name: 'Dr. Arthur Campbell' }
  ];

  const tokens = {};

  for (const acc of testAccounts) {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      identifier: acc.identifier,
      password: 'password123'
    });

    const isSuccess = res.status === 200 && res.data.success && res.data.user.role === acc.role;
    assert(isSuccess, `Login as ${acc.role.toUpperCase()} using "${acc.identifier}" succeeds`);
    if (res.data.token && !tokens[acc.role]) {
      tokens[acc.role] = res.data.token;
    }
  }

  // 3. Test Invalid Login
  const badLogin = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    identifier: 'admin@college.edu',
    password: 'wrongpassword'
  });
  assert(badLogin.status === 401, 'Bad credentials correctly rejected with 401');

  // 4. Test Route Guard & Role Middleware (403 Enforcement)
  // Student calling Faculty Probe -> Expected: 403 Forbidden
  const studentToFacultyProbe = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/probe/faculty',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokens['student']}` }
  });
  assert(
    studentToFacultyProbe.status === 403,
    `Student calling Faculty API returns 403 Forbidden (got ${studentToFacultyProbe.status})`
  );

  // Student calling Admin Probe -> Expected: 403 Forbidden
  const studentToAdminProbe = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/probe/admin',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokens['student']}` }
  });
  assert(
    studentToAdminProbe.status === 403,
    `Student calling Admin API returns 403 Forbidden (got ${studentToAdminProbe.status})`
  );

  // Faculty calling Faculty Probe -> Expected: 200 OK
  const facultyToFacultyProbe = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/probe/faculty',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokens['faculty']}` }
  });
  assert(
    facultyToFacultyProbe.status === 200,
    `Faculty calling Faculty API returns 200 OK (got ${facultyToFacultyProbe.status})`
  );

  // Admin calling Admin Probe -> Expected: 200 OK
  const adminToAdminProbe = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/probe/admin',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokens['admin']}` }
  });
  assert(
    adminToAdminProbe.status === 200,
    `Admin calling Admin API returns 200 OK (got ${adminToAdminProbe.status})`
  );

  // 5. Test Unauthenticated request to protected endpoint -> Expected: 401
  const unauthProbe = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/probe/admin',
    method: 'GET'
  });
  assert(unauthProbe.status === 401, 'Unauthenticated call returns 401 Unauthorized');

  // 6. Test Document Types Endpoint
  const docTypesRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/document-types',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokens['student']}` }
  });
  assert(
    docTypesRes.status === 200 && docTypesRes.data.documentTypes.length === 3,
    `Authenticated user can view all 3 document types (Bonafide, Transcript, Recommendation Letter)`
  );

  console.log(`\n--- SUMMARY: ${passCount} PASSED, ${failCount} FAILED ---`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
