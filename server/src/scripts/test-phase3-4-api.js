const http = require('http');
const fs = require('fs');

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

function uploadMultipart(options, { fieldName, filename, mimeType, content }) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
    const crlf = '\r\n';
    let body = [];
    body.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="fieldName"${crlf}${crlf}${fieldName}${crlf}`));
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
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.write(fullPayload);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING PHASE 3 & 4 (APPROVAL CHAIN & PDF GENERATION) TEST SUITE ---');
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

  // 1. Authenticate users
  const studentLogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: 'student.aids1@college.edu', password: 'password123' });
  const studentToken = studentLogin.data.token;

  const facultyLogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: 'faculty1.aids@college.edu', password: 'password123' });
  const facultyToken = facultyLogin.data.token;

  const hodLogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: 'hod.aids@college.edu', password: 'password123' });
  const hodToken = hodLogin.data.token;

  const adminLogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: 'admin@college.edu', password: 'password123' });
  const adminToken = adminLogin.data.token;

  const principalLogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: 'principal@college.edu', password: 'password123' });
  const principalToken = principalLogin.data.token;

  assert(studentToken && facultyToken && hodToken && adminToken && principalToken, 'All 5 role accounts authenticated for workflow tests');

  // Helper to upload a sample document
  async function uploadSampleDoc(name = 'test_id.pdf') {
    const res = await uploadMultipart({
      hostname: 'localhost', port: 5000, path: '/api/attachments/upload', method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    }, {
      fieldName: 'id_card',
      filename: name,
      mimeType: 'application/pdf',
      content: '%PDF-1.4 test binary stream for certificate generation'
    });
    return res.data.attachment.id;
  }

  // TEST 1: Full Approval Flow & PDF Generation for Bonafide
  // (Student Apply -> Faculty Approve -> HOD Approve -> Admin Approve -> PDF Certificate Issued)
  console.log('\n>> TEST 1: Full Approval Flow: Faculty -> HOD -> Admin -> PDF Certificate');
  const att1 = await uploadSampleDoc('bonafide_id.pdf');
  const app1Res = await request({
    hostname: 'localhost', port: 5000, path: '/api/applications/apply', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` }
  }, {
    documentTypeCode: 'BONAFIDE',
    formData: { reason: 'State Bank Education Loan Verification', academicYear: '2025-2026' },
    attachments: [{ key: 'id_card', attachmentId: att1 }]
  });
  const app1Id = app1Res.data.application.applicationId;
  assert(app1Res.status === 201, `Student applied for Bonafide (${app1Id})`);

  // Faculty approves
  const facApprove = await request({
    hostname: 'localhost', port: 5000, path: `/api/workflows/${app1Id}/approve`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${facultyToken}` }
  }, { remarks: 'Academic records verified and approved by mentor' });
  assert(facApprove.status === 200 && facApprove.data.application.currentStage === 2, 'Faculty approved stage 1 -> advanced to stage 2 (HOD)');

  // HOD approves
  const hodApprove = await request({
    hostname: 'localhost', port: 5000, path: `/api/workflows/${app1Id}/approve`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hodToken}` }
  }, { remarks: 'Departmental endorsement confirmed' });
  assert(hodApprove.status === 200 && hodApprove.data.application.currentStage === 3, 'HOD approved stage 2 -> advanced to stage 3 (Admin)');

  // Admin approves (Final Stage)
  const adminApprove = await request({
    hostname: 'localhost', port: 5000, path: `/api/workflows/${app1Id}/approve`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { remarks: 'Final administrative seal and issuance authorized' });
  assert(adminApprove.status === 200 && adminApprove.data.completed, 'Admin approved final stage -> Triggered PDF Generation');
  assert(/^DOC-\d{4}-\d{5}$/.test(adminApprove.data.certificate.documentId), `Document ID generated: ${adminApprove.data.certificate.documentId}`);

  const issuedDocId = adminApprove.data.certificate.documentId;

  // Student downloads the generated PDF
  const downloadRes = await request({
    hostname: 'localhost', port: 5000, path: `/api/certificates/${issuedDocId}/download`, method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  assert(
    downloadRes.status === 200 && downloadRes.headers['content-type']?.includes('application/pdf'),
    `Student can download generated PDF certificate (${issuedDocId}) with Content-Type: application/pdf`
  );

  // Student verifies notification in inbox with "Please collect the original from the Admin office"
  const studentNotifs = await request({
    hostname: 'localhost', port: 5000, path: '/api/notifications', method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const readyNotif = studentNotifs.data.notifications?.find(n => n.message.includes('collect the original from the Admin office'));
  assert(!!readyNotif, 'Student received notification containing: "Please collect the original from the Admin office."');

  // TEST 2: Faculty Rejection with Mandatory Reason
  console.log('\n>> TEST 2: Rejection with Mandatory Reason');
  const att2 = await uploadSampleDoc('doc_to_reject.pdf');
  const app2Res = await request({
    hostname: 'localhost', port: 5000, path: '/api/applications/apply', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` }
  }, {
    documentTypeCode: 'BONAFIDE',
    formData: { reason: 'General test', academicYear: '2025-2026' },
    attachments: [{ key: 'id_card', attachmentId: att2 }]
  });
  const app2Id = app2Res.data.application.applicationId;

  // Attempt rejection WITHOUT reason -> Expected 400
  const badReject = await request({
    hostname: 'localhost', port: 5000, path: `/api/workflows/${app2Id}/reject`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${facultyToken}` }
  }, { reason: '' });
  assert(badReject.status === 400, 'Rejection without reason rejected with 400 (Reason is MANDATORY)');

  // Rejection with valid reason
  const validReject = await request({
    hostname: 'localhost', port: 5000, path: `/api/workflows/${app2Id}/reject`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${facultyToken}` }
  }, { reason: 'Academic year does not match enrollment records' });
  assert(
    validReject.status === 200 && validReject.data.application.status === 'REJECTED',
    'Application successfully rejected with status REJECTED'
  );
  assert(
    validReject.data.application.rejectionDetails.reason === 'Academic year does not match enrollment records',
    'Exact rejection reason saved in rejectionDetails'
  );

  // Student checks application to verify rejection details
  const app2Details = await request({
    hostname: 'localhost', port: 5000, path: `/api/applications/${app2Id}`, method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  assert(
    app2Details.data.application.rejectionDetails.reason === 'Academic year does not match enrollment records',
    'Student sees exact rejection reason on tracking view'
  );

  // TEST 3: HOD Correction Request & Student Resubmission
  console.log('\n>> TEST 3: Correction Request & Resubmission');
  const att3 = await uploadSampleDoc('doc_for_corr.pdf');
  const app3Res = await request({
    hostname: 'localhost', port: 5000, path: '/api/applications/apply', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` }
  }, {
    documentTypeCode: 'BONAFIDE',
    formData: { reason: 'Bus Concession Pass', academicYear: '2025-2026' },
    attachments: [{ key: 'id_card', attachmentId: att3 }]
  });
  const app3Id = app3Res.data.application.applicationId;

  // Faculty approves -> arrives at HOD
  await request({
    hostname: 'localhost', port: 5000, path: `/api/workflows/${app3Id}/approve`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${facultyToken}` }
  }, { remarks: 'Forwarded to HOD' });

  // HOD requests correction
  const corrReq = await request({
    hostname: 'localhost', port: 5000, path: `/api/workflows/${app3Id}/correction`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hodToken}` }
  }, { reason: 'Attached ID card scan is blurry. Please upload a clear photo.' });
  assert(
    corrReq.status === 200 && corrReq.data.application.status === 'CORRECTION_REQUIRED',
    'HOD requested correction -> Status updated to CORRECTION_REQUIRED'
  );

  // Student uploads new file and resubmits
  const newAtt = await uploadSampleDoc('clear_id_card.pdf');
  const resubmitRes = await request({
    hostname: 'localhost', port: 5000, path: `/api/workflows/${app3Id}/resubmit`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` }
  }, {
    formData: { reason: 'Bus Concession Pass (Updated)' },
    attachments: [{ key: 'id_card', attachmentId: newAtt }],
    remarks: 'Replaced with high-resolution scan of ID card'
  });
  assert(
    resubmitRes.status === 200 && resubmitRes.data.application.status === 'RESUBMITTED',
    'Student resubmitted corrected file -> Status updated to RESUBMITTED'
  );
  assert(
    resubmitRes.data.application.currentStage === 2,
    'Application returned to the SAME reviewer stage (Stage 2: HOD)'
  );

  // TEST 4: Principal Rejection of Transcript
  console.log('\n>> TEST 4: Principal Rejection of Transcript');
  // Upload marksheet and fee receipt for Transcript
  const marksheetAtt = await uploadSampleDoc('marksheet.pdf');
  const feeAtt = await uploadSampleDoc('fee_receipt.pdf');
  const transcriptRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/applications/apply', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` }
  }, {
    documentTypeCode: 'TRANSCRIPT',
    formData: { targetInstitution: 'Oxford University', purpose: 'Higher Studies', numCopies: 2 },
    attachments: [
      { key: 'marksheet_copy', attachmentId: marksheetAtt },
      { key: 'fee_receipt', attachmentId: feeAtt }
    ]
  });
  const transcriptId = transcriptRes.data.application.applicationId;

  // Faculty approves Transcript
  await request({
    hostname: 'localhost', port: 5000, path: `/api/workflows/${transcriptId}/approve`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${facultyToken}` }
  }, { remarks: 'Approved' });

  // HOD approves Transcript
  await request({
    hostname: 'localhost', port: 5000, path: `/api/workflows/${transcriptId}/approve`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hodToken}` }
  }, { remarks: 'Approved' });

  // Principal rejects Transcript
  const principalReject = await request({
    hostname: 'localhost', port: 5000, path: `/api/workflows/${transcriptId}/reject`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${principalToken}` }
  }, { reason: 'Official fee receipt mismatch with finance register' });
  assert(
    principalReject.status === 200 && principalReject.data.application.status === 'REJECTED',
    'Principal rejected Transcript -> Status set to REJECTED'
  );

  // Student views Transcript details
  const transcriptDetails = await request({
    hostname: 'localhost', port: 5000, path: `/api/applications/${transcriptId}`, method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  assert(
    transcriptDetails.data.application.rejectionDetails.reason === 'Official fee receipt mismatch with finance register',
    'Student sees exact rejection reason from Principal'
  );

  // TEST 5: Certificate Revocation by Admin
  console.log('\n>> TEST 5: Certificate Revocation by Admin');
  const revokeRes = await request({
    hostname: 'localhost', port: 5000, path: `/api/certificates/${issuedDocId}/revoke`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { reason: 'Disciplinary review hold placed by Controller of Examinations' });
  assert(
    revokeRes.status === 200 && revokeRes.data.certificate.status === 'Revoked',
    `Admin successfully revoked document ${issuedDocId}`
  );

  // Student checks revoked document
  const myCerts = await request({
    hostname: 'localhost', port: 5000, path: '/api/certificates/my-certificates', method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const revokedDoc = myCerts.data.certificates?.find(c => c.documentId === issuedDocId);
  assert(
    revokedDoc && revokedDoc.status === 'Revoked',
    'Student sees document status updated to Revoked'
  );

  console.log(`\n--- SUMMARY: ${passCount} PASSED, ${failCount} FAILED ---`);
  if (failCount > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
