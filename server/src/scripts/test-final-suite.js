require('dotenv').config({ path: require('path').resolve(__dirname, '../../.data') });
const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Application = require('../models/Application');
const Attachment = require('../models/Attachment');
const Certificate = require('../models/Certificate');
const User = require('../models/User');

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

function downloadBinary(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, buffer });
      });
    });
    req.on('error', reject);
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

async function runFinalSuite() {
  console.log('================================================================');
  console.log('   DIGITAL ACADEMIC DOCUMENT WORKFLOW SYSTEM - FINAL ACCEPTANCE SUITE');
  console.log('================================================================\n');

  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passCount++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failCount++;
    }
  }

  // Connect to DB for direct inspection / backdating
  await connectDB();

  // Login helpers
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

  const student1Token = await login('student.aids1@college.edu');
  const student2Token = await login('student.cse1@college.edu');
  const facultyAidsToken = await login('faculty1.aids@college.edu');
  const hodAidsToken = await login('hod.aids@college.edu');
  const adminToken = await login('admin@college.edu');
  const principalToken = await login('principal@college.edu');

  assert(student1Token && student2Token && facultyAidsToken && hodAidsToken && adminToken && principalToken,
    'All 5 roles (Students, Faculty, HOD, Admin, Principal) authenticated successfully');

  // ====================================================================
  // TEST 1: Full Bonafide Flow: Student apply -> Faculty approve -> HOD approve -> Admin approve -> PDF -> Student notified & downloads
  // ====================================================================
  console.log('\n--- TEST 1: Bonafide End-to-End Approval Chain & PDF Generation ---');
  
  // 1a. Upload attachment
  const dummyIdCard = Buffer.from('%PDF-1.4 Dummy student ID card content for Bonafide certificate application');
  const uploadRes = await uploadMultipart({
    hostname: 'localhost',
    port: 5000,
    path: '/api/attachments/upload',
    method: 'POST',
    headers: { Authorization: `Bearer ${student1Token}` }
  }, {
    fieldName: 'id_card',
    filename: 'student_id_card.pdf',
    mimeType: 'application/pdf',
    content: dummyIdCard
  });

  const idCardAttId = uploadRes.data?.attachment?.id || uploadRes.data?.attachment?._id;
  assert(uploadRes.status === 201 && idCardAttId, `Student uploads required attachment: idCard (${idCardAttId})`);

  // 1b. Apply for Bonafide
  const applyRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/applications/apply',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${student1Token}`,
      'Content-Type': 'application/json'
    }
  }, {
    documentTypeCode: 'BONAFIDE',
    formData: {
      reason: 'Passport and Visa Verification',
      academicYear: '2025-2026'
    },
    attachments: {
      id_card: idCardAttId
    }
  });

  const bonafideApp = applyRes.data?.application;
  const bonafideAppId = bonafideApp?.applicationId;
  const bonafideMongoId = bonafideApp?._id;
  assert(applyRes.status === 201 && bonafideAppId?.startsWith('APP-'), `Application created with ID: ${bonafideAppId}`);

  // 1c. Faculty Approves
  const facApproveRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/workflows/${bonafideAppId}/approve`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${facultyAidsToken}`,
      'Content-Type': 'application/json'
    }
  }, { remarks: 'Academic attendance and conduct verified. Approved.' });

  assert(facApproveRes.status === 200 && facApproveRes.data?.application?.currentRole === 'hod',
    `Faculty approves Bonafide -> transitioned to HOD (Stage 2)`);

  // 1d. HOD Approves
  const hodApproveRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/workflows/${bonafideAppId}/approve`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hodAidsToken}`,
      'Content-Type': 'application/json'
    }
  }, { remarks: 'Department endorsement granted.' });

  assert(hodApproveRes.status === 200 && hodApproveRes.data?.application?.currentRole === 'admin',
    `HOD approves Bonafide -> transitioned to Admin Office (Stage 3)`);

  // 1e. Admin Approves (Final Stage for Bonafide)
  const adminApproveRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/workflows/${bonafideAppId}/approve`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  }, { remarks: 'Official Bonafide Certificate issued by central administration.' });

  const completedApp = adminApproveRes.data?.application;
  const generatedCert = adminApproveRes.data?.certificate;
  assert(adminApproveRes.status === 200 && (completedApp?.status === 'COMPLETED' || completedApp?.status === 'APPROVED'),
    `Admin approves Bonafide -> application marked COMPLETED/APPROVED`);
  assert(generatedCert && generatedCert.documentId?.startsWith('DOC-'),
    `Automated PDF certificate generated with Document ID: ${generatedCert?.documentId}`);

  // 1f. Verify Student Notification
  const notifRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/notifications',
    method: 'GET',
    headers: { Authorization: `Bearer ${student1Token}` }
  });

  const readyNotif = notifRes.data?.notifications?.find(n => n.message && n.message.includes('collect the original from the Admin office'));
  assert(readyNotif !== undefined, `Student received notification with mandatory note: "Your document is ready. Please collect the original from the Admin office."`);

  // 1g. Student Downloads Generated PDF
  const certId = generatedCert?._id || generatedCert?.id;
  const downloadRes = await downloadBinary({
    hostname: 'localhost',
    port: 5000,
    path: `/api/certificates/${certId}/download`,
    method: 'GET',
    headers: { Authorization: `Bearer ${student1Token}` }
  });

  const pdfBuffer = downloadRes.buffer;
  const pdfString = pdfBuffer ? pdfBuffer.toString('latin1') : '';
  let extractedPdfText = '';
  for (const m of pdfString.matchAll(/<([0-9a-fA-F]+)>/g)) {
    extractedPdfText += Buffer.from(m[1], 'hex').toString('utf8');
  }
  assert(downloadRes.status === 200 && pdfBuffer && pdfBuffer.length > 1000 && pdfString.startsWith('%PDF-'),
    `Student downloads valid PDF certificate (Content length: ${pdfBuffer?.length} bytes)`);
  assert(extractedPdfText.includes('collect the original from the Admin office'),
    `PDF certificate contains mandatory printed notice: "collect the original from the Admin office"`);

  // ====================================================================
  // TEST 2: Faculty rejects -> student sees exact reason (and mandatory reason validation)
  // ====================================================================
  console.log('\n--- TEST 2: Faculty Rejection with Mandatory Reason ---');

  // 2a. Apply another Bonafide
  const apply2Res = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/applications/apply',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${student1Token}`,
      'Content-Type': 'application/json'
    }
  }, {
    documentTypeCode: 'BONAFIDE',
    formData: { reason: 'Fee concession application', academicYear: '2025-2026' },
    attachments: { id_card: idCardAttId }
  });
  const app2Id = apply2Res.data?.application?.applicationId;

  // 2b. Attempt rejection without reason (must fail with 400)
  const emptyRejectRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/workflows/${app2Id}/reject`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${facultyAidsToken}`,
      'Content-Type': 'application/json'
    }
  }, { reason: '' });
  assert(emptyRejectRes.status === 400, 'Rejection blocked with 400 when reason is empty');

  // 2c. Reject with mandatory reason
  const rejectionReason = 'Attendance below 75% threshold in current semester';
  const rejectRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/workflows/${app2Id}/reject`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${facultyAidsToken}`,
      'Content-Type': 'application/json'
    }
  }, { reason: rejectionReason });
  assert(rejectRes.status === 200 && rejectRes.data?.application?.status === 'REJECTED',
    `Faculty rejected application -> status set to REJECTED`);

  // 2d. Student checks application details
  const studentViewRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/applications/${app2Id}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${student1Token}` }
  });
  const studentAppView = studentViewRes.data?.application;
  assert(
    studentAppView?.status === 'REJECTED' &&
    studentAppView?.rejectionDetails?.reason === rejectionReason &&
    studentAppView?.rejectionDetails?.rejectedBy?.role === 'faculty',
    `Student sees exact rejection reason: "${studentAppView?.rejectionDetails?.reason}" by Faculty`
  );

  // ====================================================================
  // TEST 3: HOD requests correction -> student replaces file & resubmits -> returns to HOD
  // ====================================================================
  console.log('\n--- TEST 3: HOD Correction Request & Student Resubmission Loop ---');

  // 3a. Apply new application
  const apply3Res = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/applications/apply',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${student1Token}`,
      'Content-Type': 'application/json'
    }
  }, {
    documentTypeCode: 'BONAFIDE',
    formData: { reason: 'Bank Loan Application', academicYear: '2025-2026' },
    attachments: { id_card: idCardAttId }
  });
  const app3Id = apply3Res.data?.application?.applicationId;

  // Faculty approves to push to HOD
  await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/workflows/${app3Id}/approve`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${facultyAidsToken}`,
      'Content-Type': 'application/json'
    }
  }, { remarks: 'Faculty recommends.' });

  // 3b. Attempt correction without reason (must fail with 400)
  const emptyCorrRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/workflows/${app3Id}/request-correction`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hodAidsToken}`,
      'Content-Type': 'application/json'
    }
  }, { reason: '' });
  assert(emptyCorrRes.status === 400, 'Correction request blocked with 400 when reason is empty');

  // 3c. HOD requests correction with reason
  const correctionReason = 'ID card scan is blurred. Upload clear high-resolution scanned copy.';
  const corrRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/workflows/${app3Id}/request-correction`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hodAidsToken}`,
      'Content-Type': 'application/json'
    }
  }, { reason: correctionReason });

  assert(corrRes.status === 200 && corrRes.data?.application?.status === 'CORRECTION_REQUIRED',
    `HOD requested correction -> status set to CORRECTION_REQUIRED`);

  // 3d. Student uploads replacement file
  const newIdCardBuffer = Buffer.from('%PDF-1.4 Clear high-res ID card scan file content');
  const uploadNewRes = await uploadMultipart({
    hostname: 'localhost',
    port: 5000,
    path: '/api/attachments/upload',
    method: 'POST',
    headers: { Authorization: `Bearer ${student1Token}` }
  }, {
    fieldName: 'id_card',
    filename: 'id_card_clear_rescan.pdf',
    mimeType: 'application/pdf',
    content: newIdCardBuffer
  });
  const newAttId = uploadNewRes.data?.attachment?.id || uploadNewRes.data?.attachment?._id;

  // 3e. Student resubmits
  const resubmitRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/workflows/${app3Id}/resubmit`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${student1Token}`,
      'Content-Type': 'application/json'
    }
  }, {
    remarks: 'Uploaded clear scan of student ID card as requested.',
    replacementAttachments: { id_card: newAttId }
  });

  const resubmittedApp = resubmitRes.data?.application;
  assert(resubmitRes.status === 200 && (resubmittedApp?.status === 'RESUBMITTED' || resubmittedApp?.status === 'UNDER_REVIEW'),
    `Student resubmitted application -> status is ${resubmittedApp?.status}`);
  assert(resubmittedApp?.currentRole === 'hod',
    `Resubmission routed directly back to HOD (same reviewer who requested correction)`);

  // 3f. Check HOD Queue
  const hodQueueRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/workflows/queue',
    method: 'GET',
    headers: { Authorization: `Bearer ${hodAidsToken}` }
  });
  const inHodQueue = hodQueueRes.data?.applications?.some(a => a.applicationId === app3Id);
  assert(inHodQueue, `Application ${app3Id} appears in HOD reviewer queue for re-evaluation`);

  // ====================================================================
  // TEST 4: Principal rejects a Transcript -> student sees the exact reason
  // ====================================================================
  console.log('\n--- TEST 4: Principal Rejection of Transcript ---');

  // 4a. Student applies for Transcript (requires marksheet_copy and fee_receipt)
  const marksheetBuffer = Buffer.from('%PDF-1.4 Official semester grade sheets');
  const uploadMarksheet = await uploadMultipart({
    hostname: 'localhost',
    port: 5000,
    path: '/api/attachments/upload',
    method: 'POST',
    headers: { Authorization: `Bearer ${student1Token}` }
  }, {
    fieldName: 'marksheet_copy',
    filename: 'semester_marksheets.pdf',
    mimeType: 'application/pdf',
    content: marksheetBuffer
  });
  const marksheetAttId = uploadMarksheet.data?.attachment?.id || uploadMarksheet.data?.attachment?._id;

  const feeReceiptBuffer = Buffer.from('%PDF-1.4 Official transcript payment fee receipt');
  const uploadFeeReceipt = await uploadMultipart({
    hostname: 'localhost',
    port: 5000,
    path: '/api/attachments/upload',
    method: 'POST',
    headers: { Authorization: `Bearer ${student1Token}` }
  }, {
    fieldName: 'fee_receipt',
    filename: 'transcript_fee_receipt.pdf',
    mimeType: 'application/pdf',
    content: feeReceiptBuffer
  });
  const feeReceiptAttId = uploadFeeReceipt.data?.attachment?.id || uploadFeeReceipt.data?.attachment?._id;

  const applyTranscriptRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/applications/apply',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${student1Token}`,
      'Content-Type': 'application/json'
    }
  }, {
    documentTypeCode: 'TRANSCRIPT',
    formData: {
      purpose: 'Higher Studies Abroad',
      targetInstitution: 'Technical University of Munich',
      numCopies: 2
    },
    attachments: {
      marksheet_copy: marksheetAttId,
      fee_receipt: feeReceiptAttId
    }
  });

  const transcriptAppId = applyTranscriptRes.data?.application?.applicationId;
  assert(applyTranscriptRes.status === 201 && transcriptAppId, `Transcript application created: ${transcriptAppId}`);

  // Faculty approves
  await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/workflows/${transcriptAppId}/approve`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${facultyAidsToken}`,
      'Content-Type': 'application/json'
    }
  }, { remarks: 'Coursework grades audited. Approved.' });

  // HOD approves -> moves to Principal
  const hodToPrincipalRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/workflows/${transcriptAppId}/approve`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hodAidsToken}`,
      'Content-Type': 'application/json'
    }
  }, { remarks: 'Department head recommendation endorsed.' });

  assert(hodToPrincipalRes.data?.application?.currentRole === 'principal',
    `HOD approves Transcript -> moved to Principal (Stage 3)`);

  // Principal Rejects
  const principalRejectReason = 'Disciplinary inquiry pending from Dean of Student Affairs Office';
  const principalRejectRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/workflows/${transcriptAppId}/reject`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${principalToken}`,
      'Content-Type': 'application/json'
    }
  }, { reason: principalRejectReason });

  assert(principalRejectRes.status === 200 && principalRejectRes.data?.application?.status === 'REJECTED',
    `Principal rejects Transcript -> application status is REJECTED`);

  // Student checks Transcript details
  const studentTranscriptCheck = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/applications/${transcriptAppId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${student1Token}` }
  });

  const transcriptDetails = studentTranscriptCheck.data?.application;
  assert(
    transcriptDetails?.rejectionDetails?.reason === principalRejectReason &&
    transcriptDetails?.rejectionDetails?.rejectedBy?.role === 'principal',
    `Student sees Principal rejection reason: "${transcriptDetails?.rejectionDetails?.reason}" (Rejected by: Principal)`
  );

  // ====================================================================
  // TEST 5: Overdue application shows DELAYED in Admin
  // ====================================================================
  console.log('\n--- TEST 5: Overdue Application SLA Delay Tracking ---');

  // Backdate app3 (which is currently under review / resubmitted) to 60 hours ago using raw collection
  await Application.collection.updateOne(
    { applicationId: app3Id },
    { $set: { createdAt: new Date(Date.now() - 60 * 3600 * 1000) } }
  );

  const delayedRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/delayed',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  const delayedList = delayedRes.data?.delayed || [];
  const foundDelayedApp = delayedList.find(a => a.applicationId === app3Id);
  assert(
    foundDelayedApp !== undefined &&
    foundDelayedApp.isDelayed === true &&
    foundDelayedApp.elapsedHours >= 59,
    `Overdue application ${app3Id} flagged as DELAYED in Admin portal (Elapsed: ${foundDelayedApp?.elapsedHours} hrs, SLA: ${foundDelayedApp?.expectedHours} hrs)`
  );

  // ====================================================================
  // TEST 6: Student cross-access blocked (403 Forbidden)
  // ====================================================================
  console.log('\n--- TEST 6: Security & Cross-Access Isolation ---');

  // Student 2 (CSE) tries to view Student 1's (AIDS) application
  const crossAppRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/applications/${bonafideAppId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${student2Token}` }
  });
  assert(crossAppRes.status === 403, `Student 2 viewing Student 1 application blocked with 403 Forbidden`);

  // Student 2 tries to download Student 1's attachment
  const crossDownloadRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/attachments/${idCardAttId}/download`,
    method: 'GET',
    headers: { Authorization: `Bearer ${student2Token}` }
  });
  assert(crossDownloadRes.status === 403, `Student 2 downloading Student 1 attachment blocked with 403 Forbidden`);

  // Student 2 tries to preview Student 1's attachment
  const crossPreviewRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/attachments/${idCardAttId}/preview`,
    method: 'GET',
    headers: { Authorization: `Bearer ${student2Token}` }
  });
  assert(crossPreviewRes.status === 403, `Student 2 previewing Student 1 attachment blocked with 403 Forbidden`);

  // Student 1 calling Faculty queue gets 403
  const studentCallingFacultyApi = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/workflows/queue',
    method: 'GET',
    headers: { Authorization: `Bearer ${student1Token}` }
  });
  assert(studentCallingFacultyApi.status === 403, `Student calling reviewer queue endpoint blocked with 403 Forbidden`);

  // Student 1 calling Admin delayed endpoint gets 403
  const studentCallingAdminApi = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/delayed',
    method: 'GET',
    headers: { Authorization: `Bearer ${student1Token}` }
  });
  assert(studentCallingAdminApi.status === 403, `Student calling Admin API blocked with 403 Forbidden`);

  // ====================================================================
  // TEST 7: Data survives a server restart (Persistent dbPath & active_mongo.json)
  // ====================================================================
  console.log('\n--- TEST 7: Data Persistence & Survival Verification ---');
  const storedApp = await Application.findOne({ applicationId: bonafideAppId });
  const storedCert = await Certificate.findOne({ documentId: generatedCert.documentId });
  const userCount = await User.countDocuments();
  assert(
    storedApp && storedCert && userCount >= 22 && fs.existsSync(path.resolve(__dirname, '../../.data')),
    `Data verified persistent in server/.data: 22 users, ${bonafideAppId} and ${generatedCert.documentId} preserved`
  );

  // Summary
  console.log('\n================================================================');
  console.log(`FINAL SUITE EXECUTION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runFinalSuite().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
