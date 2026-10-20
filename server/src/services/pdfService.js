const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Counter = require('../models/Counter');
const User = require('../models/User');

// Persistent storage directory for official documents
const STORAGE_DOCUMENTS_DIR = path.resolve(__dirname, '../../storage/documents');
if (!fs.existsSync(STORAGE_DOCUMENTS_DIR)) {
  fs.mkdirSync(STORAGE_DOCUMENTS_DIR, { recursive: true });
}

// Fallback legacy directory (for reading older generated certificates if any)
const LEGACY_CERTIFICATE_DIR = path.resolve(__dirname, '../../uploads/certificates');

/**
 * Generate unique atomic sequential Document ID: DOC-YYYY-00001
 */
async function generateDocumentId() {
  const currentYear = new Date().getFullYear();
  const counterName = `doc_${currentYear}`;

  const counter = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const formattedSeq = String(counter.seq).padStart(5, '0');
  return `DOC-${currentYear}-${formattedSeq}`;
}

/**
 * Generate official academic PDF document
 */
async function generatePDF({ application, documentId, signers = {} }) {
  const filePath = path.join(STORAGE_DOCUMENTS_DIR, `${documentId}.pdf`);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
      compress: false
    });

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    const primaryColor = '#0f172a'; // Slate 900
    const goldColor = '#b45309';    // Amber 700
    const tealColor = '#0f766e';    // Teal 700

    // 1. Decorative Borders
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
      .lineWidth(2)
      .stroke(primaryColor);

    doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48)
      .lineWidth(0.5)
      .stroke(goldColor);

    // 2. Header & Logo Placeholder
    // Vector crest emblem
    const crestCenterX = doc.page.width / 2;
    doc.save();
    doc.circle(crestCenterX, 70, 24)
      .lineWidth(1.5)
      .stroke(goldColor);
    doc.circle(crestCenterX, 70, 21)
      .lineWidth(0.5)
      .stroke(primaryColor);
    doc.fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('CET', crestCenterX - 11, 65);
    doc.restore();

    // College Name & Subtitles
    doc.moveDown(4.5);
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('COLLEGE OF ENGINEERING & TECHNOLOGY', { align: 'center', characterSpacing: 1.2 });

    doc.fontSize(8.5)
      .font('Helvetica')
      .fillColor('#475569')
      .text('(Autonomous Institution Affiliated to State Technological University)', { align: 'center' });

    doc.fontSize(8)
      .text('Approved by AICTE, New Delhi • Accredited by NAAC with "A+" Grade', { align: 'center' });

    doc.moveDown(0.8);
    doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).lineWidth(0.75).stroke(goldColor);

    // Document ID and Issue Date Bar
    doc.moveDown(0.6);
    const idY = doc.y;
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(primaryColor).text(`DOCUMENT ID: ${documentId}`, 60, idY);
    doc.font('Helvetica').text(`APPLICATION REF: ${application.applicationId || 'APP-REF'}`, crestCenterX - 60, idY);
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.text(`ISSUE DATE: ${dateStr}`, doc.page.width - 180, idY, { align: 'right' });

    doc.moveDown(1.5);

    // 3. Document Title
    const docTitle = (application.documentType?.name || 'ACADEMIC CERTIFICATE').toUpperCase();
    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(tealColor)
      .text(docTitle, { align: 'center', characterSpacing: 1.5, underline: true });

    doc.moveDown(1.2);

    // 4. Body Content
    const studentName = (application.student?.name || 'STUDENT').toUpperCase();
    const regNo = application.student?.registerNumber || 'REG-PENDING';
    const deptName = application.department?.name || 'Engineering';
    const year = application.student?.year ? `Year ${application.student.year}` : 'Final Year';

    doc.fontSize(10.5)
      .font('Helvetica')
      .fillColor('#1e293b')
      .lineGap(5);

    if (application.documentType?.code === 'BONAFIDE') {
      const reason = application.formData?.reason || 'Official Academic Purpose';
      const academicYear = application.formData?.academicYear || '2025-2026';

      doc.text(
        `This is to certify that Mr./Ms. ${studentName}, bearing Register Number ${regNo}, is a bonafide student of this institution pursuing undergraduate studies in the Department of ${deptName} during the academic year ${academicYear} (${year}).`,
        { align: 'justify' }
      );
      doc.moveDown(0.8);
      doc.text(
        `This certificate is issued on the student's request for the purpose of: ${reason}.`,
        { align: 'justify' }
      );
      doc.moveDown(0.8);
      doc.text(
        `According to college records, the student maintains good conduct, high moral character, and satisfactory academic progress throughout their enrollment.`,
        { align: 'justify' }
      );
    } else if (application.documentType?.code === 'TRANSCRIPT') {
      const target = application.formData?.targetInstitution || 'Higher Education Authority';
      const purpose = application.formData?.purpose || 'Higher Studies';
      const copies = application.formData?.numCopies || 1;

      doc.text(
        `This official academic transcript record is issued to certify that Mr./Ms. ${studentName}, Register Number ${regNo}, is a duly registered student in the Department of ${deptName}.`,
        { align: 'justify' }
      );
      doc.moveDown(0.8);
      doc.text(
        `Purpose: ${purpose} • Destination: ${target} • Authorized Copies: ${copies}.`,
        { align: 'justify' }
      );
      doc.moveDown(0.8);
      doc.text(
        `The candidate has undergone rigorous coursework, institutional laboratory evaluations, and continuous semester assessments. Official course-by-course credit breakdown and grade-point standing are formally registered with the Office of the Controller of Examinations.`,
        { align: 'justify' }
      );
    } else {
      // Recommendation Letter or general document
      const targetUni = application.formData?.targetUniversity || 'Admissions Committee';
      const program = application.formData?.targetProgram || 'Graduate Studies';
      const achievements = application.formData?.achievements || '';

      doc.text(
        `TO WHOMSOEVER IT MAY CONCERN / TO: ${targetUni.toUpperCase()}`,
        { align: 'left', stroke: false }
      );
      doc.moveDown(0.8);
      doc.text(
        `It is with great pleasure that we recommend Mr./Ms. ${studentName} (Register Number: ${regNo}) for admission into the ${program}. The candidate is an active student of the Department of ${deptName} (${year}).`,
        { align: 'justify' }
      );
      if (achievements) {
        doc.moveDown(0.8);
        doc.text(`Academic & Project Merits: ${achievements}`, { align: 'justify' });
      }
      doc.moveDown(0.8);
      doc.text(
        `The student has demonstrated analytical excellence, diligence, teamwork, and strong foundational knowledge. We strongly endorse their application with utmost confidence in their future academic success.`,
        { align: 'justify' }
      );
    }

    // 5. Signature Block (Faculty, HOD, and Principal)
    // 3-column layout at bottom
    const sigY = doc.page.height - 180;
    const colWidth = (doc.page.width - 120) / 3;

    const signatures = [
      {
        roleName: 'Faculty Mentor',
        name: signers.faculty?.name || 'Dr. Arun Kumar',
        desig: signers.faculty?.designation || 'Assistant Professor',
        sigText: signers.faculty?.name || 'Arun Kumar',
        signatureImage: signers.faculty?.signatureImage
      },
      {
        roleName: 'Head of Department',
        name: signers.hod?.name || 'Prof. Meera Pillai',
        desig: signers.hod?.designation || 'Head of Department',
        sigText: signers.hod?.name || 'Meera Pillai',
        signatureImage: signers.hod?.signatureImage
      },
      {
        roleName: 'Principal & Dean',
        name: signers.principal?.name || 'Dr. Arthur Campbell',
        desig: signers.principal?.designation || 'Principal & Dean',
        sigText: signers.principal?.name || 'A. Campbell',
        signatureImage: signers.principal?.signatureImage
      }
    ];

    signatures.forEach((sig, idx) => {
      const colX = 60 + idx * colWidth;

      // Real signature image if present and exists on disk, else default elegant cursive text
      if (sig.signatureImage && fs.existsSync(sig.signatureImage)) {
        try {
          doc.image(sig.signatureImage, colX + 10, sigY - 5, {
            fit: [colWidth - 20, 25],
            align: 'center'
          });
        } catch {
          doc.font('Courier-Oblique')
            .fontSize(13)
            .fillColor('#1e40af')
            .text(sig.sigText, colX, sigY, { width: colWidth - 10, align: 'center' });
        }
      } else {
        doc.font('Courier-Oblique')
          .fontSize(13)
          .fillColor('#1e40af')
          .text(sig.sigText, colX, sigY, { width: colWidth - 10, align: 'center' });
      }

      // Divider Line
      doc.moveTo(colX + 10, sigY + 22)
        .lineTo(colX + colWidth - 20, sigY + 22)
        .lineWidth(0.75)
        .stroke('#94a3b8');

      // Name & Designation
      doc.font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(primaryColor)
        .text(sig.name, colX, sigY + 28, { width: colWidth - 10, align: 'center' });

      doc.font('Helvetica')
        .fontSize(7.5)
        .fillColor('#64748b')
        .text(sig.desig, colX, sigY + 40, { width: colWidth - 10, align: 'center' });
    });

    // 6. Mandatory Printed Collection Notice
    const noticeY = doc.page.height - 95;
    doc.rect(50, noticeY, doc.page.width - 100, 32)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc.font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#0369a1')
      .text(
        'Your document is ready. Please collect the original from the Admin office.',
        50,
        noticeY + 8,
        { align: 'center', width: doc.page.width - 100 }
      );

    doc.font('Helvetica')
      .fontSize(6.5)
      .fillColor('#64748b')
      .text(
        'This digitally endorsed record is generated via the Institutional Document Workflow Engine. Document ID verification active.',
        50,
        noticeY + 21,
        { align: 'center', width: doc.page.width - 100 }
      );

    doc.end();

    writeStream.on('finish', () => {
      resolve({
        documentId,
        filePath
      });
    });

    writeStream.on('error', reject);
  });
}

/**
 * Automatically regenerates missing PDF file for an existing Certificate / GeneratedDocument record
 */
async function regeneratePDFForCertificate(cert) {
  // Populate all required references if not populated
  if (!cert.populated('application')) {
    await cert.populate({
      path: 'application',
      populate: ['student', 'department', 'documentType', 'assignedMentor']
    });
  }
  if (!cert.populated('department')) {
    await cert.populate('department');
  }
  if (!cert.populated('student')) {
    await cert.populate('student');
  }
  if (!cert.populated('documentType')) {
    await cert.populate('documentType');
  }

  const deptId = cert.department?._id || cert.department;
  const [hodUser, principalUser] = await Promise.all([
    User.findOne({ department: deptId, role: 'hod' }),
    User.findOne({ role: 'principal' })
  ]);

  const signers = {
    faculty: cert.application?.assignedMentor || null,
    hod: hodUser,
    principal: principalUser
  };

  const appData = cert.application || {
    applicationId: 'APP-RECORD',
    documentType: cert.documentType,
    student: cert.student,
    department: cert.department
  };

  const pdfResult = await generatePDF({
    application: appData,
    documentId: cert.documentId,
    signers
  });

  cert.filePath = pdfResult.filePath;
  await cert.save();

  return pdfResult.filePath;
}

module.exports = {
  generateDocumentId,
  generatePDF,
  regeneratePDFForCertificate,
  STORAGE_DOCUMENTS_DIR,
  LEGACY_CERTIFICATE_DIR
};
