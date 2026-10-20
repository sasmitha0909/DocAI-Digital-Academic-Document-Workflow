const http = require('http');
const fs = require('fs');
const path = require('path');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      if (Buffer.isBuffer(postData) || typeof postData === 'string') {
        req.write(postData);
      } else {
        req.write(JSON.stringify(postData));
      }
    }
    req.end();
  });
}

function uploadMultipart(options, { fieldName, filename, mimeType, content, otherFields = {} }) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
    const crlf = '\r\n';

    let body = [];

    // Add other text fields
    for (const [key, val] of Object.entries(otherFields)) {
      body.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${val}${crlf}`));
    }

    // Add file
    body.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="file"; filename="${filename}"${crlf}Content-Type: ${mimeType}${crlf}${crlf}`));
    body.push(Buffer.isBuffer(content) ? content : Buffer.from(content));
    body.push(Buffer.from(`${crlf}--${boundary}--${crlf}`));

    const fullPayload = Buffer.concat(body);

    const headers = {
      ...options.headers,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': fullPayload.length
    };

    const req = http.request({ ...options, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    req.write(fullPayload);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING PHASE 2 API VERIFICATION TESTS ---');
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

  // 1. Log in Student 1 (AIDS)
  const student1Login = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: 'student.aids1@college.edu', password: 'password123' });
  assert(student1Login.status === 200, 'Student 1 logged in successfully');
  const student1Token = student1Login.data.token;

  // Log in Student 2 (CSE) - for unauthorized cross-access test
  const student2Login = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: 'student.cse1@college.edu', password: 'password123' });
  const student2Token = student2Login.data.token;

  // Log in Faculty 1 (AIDS)
  const facultyLogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: 'faculty1.aids@college.edu', password: 'password123' });
  const facultyToken = facultyLogin.data.token;
  const facultyId = facultyLogin.data.user.id;

  // 2. Test Multer File Upload
  const dummyPdfContent = '%PDF-1.4 sample academic test document payload for student application verification';
  const uploadRes = await uploadMultipart({
    hostname: 'localhost', port: 5000, path: '/api/attachments/upload', method: 'POST',
    headers: { 'Authorization': `Bearer ${student1Token}` }
  }, {
    fieldName: 'id_card',
    filename: 'student_id_card.pdf',
    mimeType: 'application/pdf',
    content: dummyPdfContent,
    otherFields: { fieldName: 'id_card' }
  });

  assert(uploadRes.status === 201 && uploadRes.data.success, 'Valid PDF uploaded successfully through Multer');
  const attachmentId = uploadRes.data.attachment.id;

  // 3. Test Invalid File Upload (e.g. invalid mime type like text/plain or exe)
  const badUploadRes = await uploadMultipart({
    hostname: 'localhost', port: 5000, path: '/api/attachments/upload', method: 'POST',
    headers: { 'Authorization': `Bearer ${student1Token}` }
  }, {
    fieldName: 'id_card',
    filename: 'malicious.exe',
    mimeType: 'application/x-msdownload',
    content: 'executable binary content',
    otherFields: { fieldName: 'id_card' }
  });
  assert(badUploadRes.status === 400, 'Invalid file mime type rejected with 400 Bad Request');

  // 4. Test Missing Required File (Submit application without required attachment)
  const missingAttSubmit = await request({
    hostname: 'localhost', port: 5000, path: '/api/applications/apply', method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${student1Token}`
    }
  }, {
    documentTypeCode: 'BONAFIDE',
    formData: {
      reason: 'Passport Renewal',
      academicYear: '2025-2026'
    },
    attachments: [] // Deliberately missing required id_card!
  });
  assert(
    missingAttSubmit.status === 400 && missingAttSubmit.data.message.includes('Missing required attachment'),
    'Application submission correctly blocked when required file is missing (400 Bad Request)'
  );

  // 5. Successful Application Submission
  const validSubmit = await request({
    hostname: 'localhost', port: 5000, path: '/api/applications/apply', method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${student1Token}`
    }
  }, {
    documentTypeCode: 'BONAFIDE',
    formData: {
      reason: 'Passport Renewal Application',
      academicYear: '2025-2026'
    },
    attachments: [
      { key: 'id_card', attachmentId }
    ],
    assignedMentorId: facultyId
  });

  const appData = validSubmit.data.application;
  assert(
    validSubmit.status === 201 && appData && /^APP-\d{4}-\d{5}$/.test(appData.applicationId),
    `Application submitted with sequential ID '${appData?.applicationId}'`
  );
  assert(appData.status === 'SUBMITTED', 'Initial status set to SUBMITTED');
  assert(appData.stages.length === 3, 'Workflow stages populated (Faculty -> HOD -> Admin)');

  const createdAppId = appData.applicationId;

  // 6. Verify Reviewer Notification in MongoDB
  const facultyNotifications = await request({
    hostname: 'localhost', port: 5000, path: '/api/notifications', method: 'GET',
    headers: { 'Authorization': `Bearer ${facultyToken}` }
  });
  const foundNotif = facultyNotifications.data.notifications?.find(n => n.title.includes(createdAppId));
  assert(
    facultyNotifications.status === 200 && !!foundNotif,
    `Reviewer received notification in MongoDB for application ${createdAppId}`
  );

  // 7. Verify Authorized Attachment Preview/Download
  // Student 1 (owner) preview
  const ownerPreview = await request({
    hostname: 'localhost', port: 5000, path: `/api/attachments/${attachmentId}/preview`, method: 'GET',
    headers: { 'Authorization': `Bearer ${student1Token}` }
  });
  assert(ownerPreview.status === 200, 'Owner student can preview uploaded attachment');

  // Faculty reviewer preview
  const facultyPreview = await request({
    hostname: 'localhost', port: 5000, path: `/api/attachments/${attachmentId}/preview`, method: 'GET',
    headers: { 'Authorization': `Bearer ${facultyToken}` }
  });
  assert(facultyPreview.status === 200, 'Assigned Faculty reviewer can preview attachment');

  // Student 2 (unauthorized student) preview -> MUST RETURN 403 FORBIDDEN
  const unauthorizedPreview = await request({
    hostname: 'localhost', port: 5000, path: `/api/attachments/${attachmentId}/preview`, method: 'GET',
    headers: { 'Authorization': `Bearer ${student2Token}` }
  });
  assert(
    unauthorizedPreview.status === 403,
    `Unauthorized student attempting to view another student's file gets 403 Forbidden (got ${unauthorizedPreview.status})`
  );

  // Student 2 attempting to view Student 1's application details -> MUST RETURN 403 FORBIDDEN
  const unauthorizedAppView = await request({
    hostname: 'localhost', port: 5000, path: `/api/applications/${createdAppId}`, method: 'GET',
    headers: { 'Authorization': `Bearer ${student2Token}` }
  });
  assert(
    unauthorizedAppView.status === 403,
    `Unauthorized student attempting to view another student's application gets 403 Forbidden (got ${unauthorizedAppView.status})`
  );

  // 8. Test Student Dashboard Stats & My Applications list
  const studentStats = await request({
    hostname: 'localhost', port: 5000, path: '/api/applications/my-stats', method: 'GET',
    headers: { 'Authorization': `Bearer ${student1Token}` }
  });
  assert(
    studentStats.status === 200 && studentStats.data.stats.total >= 1 && studentStats.data.stats.underReview >= 1,
    `Student dashboard stats fetched from MongoDB (Total: ${studentStats.data.stats?.total}, Under Review: ${studentStats.data.stats?.underReview})`
  );

  const myApps = await request({
    hostname: 'localhost', port: 5000, path: '/api/applications/my-applications', method: 'GET',
    headers: { 'Authorization': `Bearer ${student1Token}` }
  });
  assert(
    myApps.status === 200 && myApps.data.applications.some(a => a.applicationId === createdAppId),
    'Student can retrieve their active applications list from MongoDB'
  );

  console.log(`\n--- SUMMARY: ${passCount} PASSED, ${failCount} FAILED ---`);
  if (failCount > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
