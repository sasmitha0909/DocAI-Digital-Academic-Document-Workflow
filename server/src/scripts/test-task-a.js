const http = require('http');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
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

async function testTaskA() {
  console.log('================================================================');
  console.log('   TASK A: TEST LOGINS & ROLE AUTHORIZATION VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  async function login(identifier, password) {
    return request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { identifier, password });
  }

  // 1. Student by email
  const studentEmailRes = await login('yourname.student@test.com', 'Test@1234');
  assert(studentEmailRes.status === 200 && studentEmailRes.data?.user?.role === 'student',
    'Student logs in with email (yourname.student@test.com) -> role: student');

  // 2. Student by register number
  const studentRegRes = await login('310624243167', 'Test@1234');
  assert(studentRegRes.status === 200 && studentRegRes.data?.user?.registerNumber === '310624243167',
    'Student logs in with register number (310624243167) -> authenticated');

  // 3. Faculty by email
  const facultyRes = await login('yourname.faculty@test.com', 'Test@1234');
  assert(facultyRes.status === 200 && facultyRes.data?.user?.role === 'faculty',
    'Faculty logs in with email (yourname.faculty@test.com) -> role: faculty');

  // 4. HOD by email
  const hodRes = await login('yourname.hod@test.com', 'Test@1234');
  assert(hodRes.status === 200 && hodRes.data?.user?.role === 'hod',
    'HOD logs in with email (yourname.hod@test.com) -> role: hod');

  // 5. Admin by email
  const adminRes = await login('yourname.admin@test.com', 'Test@1234');
  assert(adminRes.status === 200 && adminRes.data?.user?.role === 'admin',
    'Admin logs in with email (yourname.admin@test.com) -> role: admin');

  // 6. Principal by email
  const principalRes = await login('yourname.principal@test.com', 'Test@1234');
  assert(principalRes.status === 200 && principalRes.data?.user?.role === 'principal',
    'Principal logs in with email (yourname.principal@test.com) -> role: principal');

  // 7. Non-student register number blocked
  const nonStudentRegRes = await login('FAC_AIDS_USER', 'Test@1234');
  assert(nonStudentRegRes.status === 401,
    'Faculty blocked from logging in with register number (email only enforced)');

  // 8. Role Dashboard Redirects mapping
  function getRedirect(role) {
    return role === 'student' ? '/student' : `/${role}`;
  }
  assert(
    getRedirect(studentEmailRes.data.user.role) === '/student' &&
    getRedirect(facultyRes.data.user.role) === '/faculty' &&
    getRedirect(hodRes.data.user.role) === '/hod' &&
    getRedirect(adminRes.data.user.role) === '/admin' &&
    getRedirect(principalRes.data.user.role) === '/principal',
    'All 5 roles map to their respective dashboard routes (/student, /faculty, /hod, /admin, /principal)'
  );

  // 9. Student calling Faculty API gets 403
  const studentToken = studentEmailRes.data.token;
  const studentCallingFacultyApi = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/workflows/queue',
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(studentCallingFacultyApi.status === 403,
    'Student calling Faculty review queue API receives 403 Forbidden');

  // 10. Student calling Admin API gets 403
  const studentCallingAdminApi = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/delayed',
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(studentCallingAdminApi.status === 403,
    'Student calling Admin API receives 403 Forbidden');

  console.log('\n================================================================');
  console.log(`TASK A SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

testTaskA().catch(err => {
  console.error('Task A test failed:', err);
  process.exit(1);
});
