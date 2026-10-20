const http = require('http');
const fs = require('fs');
const path = require('path');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const text = buffer.toString('utf8');
        try {
          const parsed = JSON.parse(text);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed, buffer });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data: text, buffer });
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
    for (const [key, val] of Object.entries(otherFields)) {
      body.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${val}${crlf}`));
    }

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
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
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

async function runTaskBTests() {
  console.log('================================================================');
  console.log('   TASK B: PDF GENERATION, REGENERATION & SECURE DOWNLOAD TEST');
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

  async function login(identifier, password = 'password123') {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { identifier, password });
    return res.data?.token;
  }

  // 1. Authenticate custom accounts
  console.log('1. Authenticating accounts...');
  const studentToken = await login('yourname.student@test.com', 'Test@1234');
  const facultyToken = await login('yourname.faculty@test.com', 'Test@1234');
  const hodToken = await login('yourname.hod@test.com', 'Test@1234');
  const adminToken = await login('yourname.admin@test.com', 'Test@1234');
  const otherStudentToken = await login('student.cse1@college.edu', 'password123');

  assert(studentToken && facultyToken && hodToken && adminToken && otherStudentToken,
    'All accounts authenticated successfully (Custom Student, Faculty, HOD, Admin, Other Student)');

  // 2. Upload verification attachment as Student
  console.log('\n2. Student uploading application attachment...');
  const dummyFileContent = Buffer.from('%PDF-1.4 official student ID card document content for verification');
  const uploadRes = await uploadMultipart({
    hostname: 'localhost',
    port: 5000,
    path: '/api/attachments/upload',
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  }, {
    fieldName: 'id_card',
    filename: 'test_id_card.pdf',
    mimeType: 'application/pdf',
    content: dummyFileContent
  });

  const attachmentId = uploadRes.data?.attachment?.id || uploadRes.data?.attachment?._id;
  assert(uploadRes.status === 201 && attachmentId, `Attachment uploaded successfully (ID: ${attachmentId})`);

  // 3. Student applies for Bonafide Certificate
  console.log('\n3. Student submitting Bonafide application...');
  const applyRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/applications/apply',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentToken}`,
      'Content-Type': 'application/json'
    }
  }, {
    documentTypeCode: 'BONAFIDE',
    formData: {
      reason: 'Official Passport & Higher Studies Verification',
      academicYear: '2025-2026'
    },
    attachments: {
      id_card: attachmentId
    }
  });

  const app = applyRes.data?.application;
  const appId = app?.applicationId;
  assert(applyRes.status === 201 && appId?.startsWith('APP-'), `Application created successfully (ID: ${appId})`);

  // 4. Faculty Review & Approval
  console.log('\n4. Faculty approving application...');
  const facApproveRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/workflows/${appId}/approve`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${facultyToken}`,
      'Content-Type': 'application/json'
    }
  }, { remarks: 'Academic records and attendance verified. Recommended.' });

  assert(facApproveRes.status === 200 && facApproveRes.data?.application?.currentRole === 'hod',
    `Faculty approves -> Stage 1 completed, forwarded to HOD (currentRole: 'hod')`);

  // 5. HOD Review & Endorsement
  console.log('\n5. HOD approving application...');
  const hodApproveRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/workflows/${appId}/approve`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hodToken}`,
      'Content-Type': 'application/json'
    }
  }, { remarks: 'Departmental endorsement granted.' });

  assert(hodApproveRes.status === 200 && hodApproveRes.data?.application?.currentRole === 'admin',
    `HOD approves -> Stage 2 completed, forwarded to Admin Office (currentRole: 'admin')`);

  // 6. Admin Final Approval & PDF Generation
  console.log('\n6. Admin performing final approval & PDF generation...');
  const adminApproveRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/workflows/${appId}/approve`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  }, { remarks: 'Final approval granted by Administrative Office.' });

  const completedApp = adminApproveRes.data?.application;
  const cert = adminApproveRes.data?.certificate;
  assert(adminApproveRes.status === 200 && completedApp?.status === 'COMPLETED',
    `Admin final approval completes application (status: 'COMPLETED')`);
  assert(cert && cert.documentId?.startsWith('DOC-'),
    `Document record generated in MongoDB with ID: ${cert?.documentId}`);

  // 7. Verify persistent storage file in server/storage/documents/
  console.log('\n7. Verifying persistent storage path...');
  const docId = cert.documentId;
  const storageFilePath = path.resolve(__dirname, '../../storage/documents', `${docId}.pdf`);
  const fileExistsInStorage = fs.existsSync(storageFilePath);
  assert(fileExistsInStorage, `PDF file saved in persistent folder: server/storage/documents/${docId}.pdf`);

  // 8. Verify Student Notification includes collection notice
  console.log('\n8. Verifying Student Notification...');
  const notifRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/notifications',
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });

  const latestNotif = notifRes.data?.notifications?.[0];
  const hasExpectedMessage = latestNotif?.message?.includes('Your document is ready. Please collect the original from the Admin office.');
  assert(hasExpectedMessage, `Student notification contains mandatory notice: "${latestNotif?.message}"`);

  // 9. Student downloads PDF via GET /api/documents/:id/download
  console.log('\n9. Testing Student download via GET /api/documents/:id/download...');
  const downloadRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/documents/${docId}/download`,
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });

  const contentType = downloadRes.headers['content-type'];
  const contentDisp = downloadRes.headers['content-disposition'];
  const isPdfHeader = downloadRes.buffer.slice(0, 5).toString('utf8') === '%PDF-';

  assert(downloadRes.status === 200, `GET /api/documents/:id/download returns HTTP 200 OK`);
  assert(contentType === 'application/pdf', `Content-Type header is strictly 'application/pdf'`);
  assert(contentDisp === `attachment; filename="${docId}.pdf"`,
    `Content-Disposition header matches: attachment; filename="${docId}.pdf"`);
  assert(isPdfHeader && downloadRes.buffer.length > 1000,
    `Downloaded payload is a valid binary PDF document (${downloadRes.buffer.length} bytes, starts with %PDF-)`);

  // 10. Test Automatic On-the-Fly Regeneration when physical file is missing
  console.log('\n10. Testing On-the-Fly PDF Auto-Regeneration when file is missing from disk...');
  // Delete the physical PDF file
  if (fs.existsSync(storageFilePath)) {
    fs.unlinkSync(storageFilePath);
  }
  assert(!fs.existsSync(storageFilePath), `Physical PDF file successfully deleted from disk to test regeneration`);

  // Student calls download again
  const regenDownloadRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/documents/${docId}/download`,
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });

  const regenIsPdf = regenDownloadRes.buffer.slice(0, 5).toString('utf8') === '%PDF-';
  const fileRestored = fs.existsSync(storageFilePath);
  assert(regenDownloadRes.status === 200 && regenIsPdf,
    `Download succeeds on missing file: Status 200 and valid PDF streamed`);
  assert(fileRestored, `File was automatically re-created and saved in server/storage/documents/${docId}.pdf`);

  // 11. Security Test: Another Student calling GET /api/documents/:id/download must get 403 Forbidden
  console.log('\n11. Testing Authorization: Different student accessing document gets 403 Forbidden...');
  const unauthorizedRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/documents/${docId}/download`,
    method: 'GET',
    headers: { Authorization: `Bearer ${otherStudentToken}` }
  });

  assert(unauthorizedRes.status === 403, `Different student calling download receives HTTP 403 Forbidden`);
  assert(unauthorizedRes.data?.success === false && unauthorizedRes.data?.message?.includes('forbidden'),
    `Returns clear JSON error: "${unauthorizedRes.data?.message}"`);

  // 12. Security Test: Unauthenticated request gets 401 Unauthorized
  console.log('\n12. Testing Authentication: Unauthenticated download receives 401...');
  const noAuthRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/documents/${docId}/download`,
    method: 'GET'
  });
  assert(noAuthRes.status === 401, `Unauthenticated download returns HTTP 401 Unauthorized`);

  // 13. Test Non-existent Document returns 404
  console.log('\n13. Testing Non-existent Document returns 404...');
  const notFoundRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/documents/DOC-9999-99999/download`,
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(notFoundRes.status === 404, `Non-existent document returns HTTP 404 Not Found`);

  console.log('\n================================================================');
  console.log(`TASK B SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTaskBTests().catch(err => {
  console.error('Fatal error running Task B tests:', err);
  process.exit(1);
});
