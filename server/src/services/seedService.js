const Department = require('../models/Department');
const User = require('../models/User');
const DocumentType = require('../models/DocumentType');

const DEFAULT_PASSWORD = 'password123';

/**
 * Seed initial departments, users, and document types
 */
/**
 * Seed initial departments, users, and document types idempotently
 */
async function seedData({ reset = false } = {}) {
  if (reset) {
    console.log('[Seed] Reset requested. Clearing collections...');
    await Promise.all([
      Department.deleteMany({}),
      User.deleteMany({}),
      DocumentType.deleteMany({})
    ]);
    console.log('[Seed] Cleared existing data.');
  }

  console.log('[Seed] Ensuring 4 departments exist...');
  const departmentsData = [
    {
      name: 'AI & Data Science',
      code: 'AIDS',
      description: 'Department of Artificial Intelligence and Data Science'
    },
    {
      name: 'Computer Science',
      code: 'CSE',
      description: 'Department of Computer Science and Engineering'
    },
    {
      name: 'Information Technology',
      code: 'IT',
      description: 'Department of Information Technology'
    },
    {
      name: 'Electronics and Communication',
      code: 'ECE',
      description: 'Department of Electronics and Communication Engineering'
    }
  ];

  const deptMap = {};
  for (const d of departmentsData) {
    let dept = await Department.findOne({ code: d.code });
    if (!dept) {
      dept = await Department.create(d);
    }
    deptMap[d.code] = dept._id;
  }

  console.log('[Seed] Seeding users across all 5 roles...');
  const usersToCreate = [];

  // 1. Admin
  usersToCreate.push({
    name: 'Academic Administrator',
    email: 'admin@college.edu',
    registerNumber: 'ADMIN001',
    password: DEFAULT_PASSWORD,
    role: 'admin',
    designation: 'Chief Administrative Officer',
    department: null
  });

  // 2. Principal
  usersToCreate.push({
    name: 'Dr. Arthur Campbell',
    email: 'principal@college.edu',
    registerNumber: 'PRIN001',
    password: DEFAULT_PASSWORD,
    role: 'principal',
    designation: 'Principal & Dean of Academics',
    department: null
  });

  // 3. Departmental Users (HOD, 2 Faculty, 2 Students per department)
  const deptConfigs = [
    {
      code: 'AIDS',
      hod: { name: 'Prof. Meera Pillai', email: 'hod.aids@college.edu', reg: 'HOD_AIDS' },
      faculty: [
        { name: 'Dr. Arun Kumar', email: 'faculty1.aids@college.edu', reg: 'FAC_AIDS_01', desig: 'Assistant Professor' },
        { name: 'Dr. Sneha Roy', email: 'faculty2.aids@college.edu', reg: 'FAC_AIDS_02', desig: 'Associate Professor' }
      ],
      students: [
        { name: 'Alex Johnson', email: 'student.aids1@college.edu', reg: 'REG2024AIDS001', year: 3 },
        { name: 'Maya Sharma', email: 'student.aids2@college.edu', reg: 'REG2024AIDS002', year: 2 }
      ]
    },
    {
      code: 'CSE',
      hod: { name: 'Prof. Rajesh Verma', email: 'hod.cse@college.edu', reg: 'HOD_CSE' },
      faculty: [
        { name: 'Dr. Robert Wilson', email: 'faculty1.cse@college.edu', reg: 'FAC_CSE_01', desig: 'Assistant Professor' },
        { name: 'Dr. Kavita Sharma', email: 'faculty2.cse@college.edu', reg: 'FAC_CSE_02', desig: 'Associate Professor' }
      ],
      students: [
        { name: 'John Doe', email: 'student.cse1@college.edu', reg: 'REG2024CSE001', year: 3 },
        { name: 'Sarah Jenkins', email: 'student.cse2@college.edu', reg: 'REG2024CSE002', year: 4 }
      ]
    },
    {
      code: 'IT',
      hod: { name: 'Prof. Sanjay Mukherjee', email: 'hod.it@college.edu', reg: 'HOD_IT' },
      faculty: [
        { name: 'Dr. Vikram Seth', email: 'faculty1.it@college.edu', reg: 'FAC_IT_01', desig: 'Assistant Professor' },
        { name: 'Dr. Neha Gupta', email: 'faculty2.it@college.edu', reg: 'FAC_IT_02', desig: 'Associate Professor' }
      ],
      students: [
        { name: 'David Miller', email: 'student.it1@college.edu', reg: 'REG2024IT001', year: 2 },
        { name: 'Priya Patel', email: 'student.it2@college.edu', reg: 'REG2024IT002', year: 3 }
      ]
    },
    {
      code: 'ECE',
      hod: { name: 'Prof. Ananth Iyer', email: 'hod.ece@college.edu', reg: 'HOD_ECE' },
      faculty: [
        { name: 'Dr. Suresh Reddy', email: 'faculty1.ece@college.edu', reg: 'FAC_ECE_01', desig: 'Assistant Professor' },
        { name: 'Dr. Deepa Nair', email: 'faculty2.ece@college.edu', reg: 'FAC_ECE_02', desig: 'Associate Professor' }
      ],
      students: [
        { name: 'Rahul Bose', email: 'student.ece1@college.edu', reg: 'REG2024ECE001', year: 3 },
        { name: 'Ananya Deshmukh', email: 'student.ece2@college.edu', reg: 'REG2024ECE002', year: 2 }
      ]
    }
  ];

  for (const cfg of deptConfigs) {
    const deptId = deptMap[cfg.code];

    // HOD
    usersToCreate.push({
      name: cfg.hod.name,
      email: cfg.hod.email,
      registerNumber: cfg.hod.reg,
      password: DEFAULT_PASSWORD,
      role: 'hod',
      designation: 'Head of Department',
      department: deptId
    });

    // 2 Faculty
    for (const fac of cfg.faculty) {
      usersToCreate.push({
        name: fac.name,
        email: fac.email,
        registerNumber: fac.reg,
        password: DEFAULT_PASSWORD,
        role: 'faculty',
        designation: fac.desig,
        department: deptId
      });
    }

    // Students
    for (const stu of cfg.students) {
      usersToCreate.push({
        name: stu.name,
        email: stu.email,
        registerNumber: stu.reg,
        password: DEFAULT_PASSWORD,
        role: 'student',
        designation: 'Undergraduate Student',
        department: deptId,
        year: stu.year
      });
    }
  }

  // 4. Custom User Test Logins (TASK A Requirement)
  usersToCreate.push(
    {
      name: 'YOUR NAME',
      email: 'yourname.student@test.com',
      registerNumber: '310624243167',
      password: 'Test@1234',
      role: 'student',
      designation: 'Undergraduate Student',
      department: deptMap['AIDS'],
      year: 3
    },
    {
      name: 'YOUR NAME (Faculty)',
      email: 'yourname.faculty@test.com',
      registerNumber: 'FAC_AIDS_USER',
      password: 'Test@1234',
      role: 'faculty',
      designation: 'Assistant Professor',
      department: deptMap['AIDS']
    },
    {
      name: 'YOUR NAME (HOD)',
      email: 'yourname.hod@test.com',
      registerNumber: 'HOD_AIDS_USER',
      password: 'Test@1234',
      role: 'hod',
      designation: 'Head of Department',
      department: deptMap['AIDS']
    },
    {
      name: 'YOUR NAME (Admin)',
      email: 'yourname.admin@test.com',
      registerNumber: 'ADMIN_USER',
      password: 'Test@1234',
      role: 'admin',
      designation: 'System Administrator',
      department: null
    },
    {
      name: 'YOUR NAME (Principal)',
      email: 'yourname.principal@test.com',
      registerNumber: 'PRIN_USER',
      password: 'Test@1234',
      role: 'principal',
      designation: 'Principal & Dean',
      department: null
    }
  );

  // Idempotently create users so existing data/applications are preserved
  let createdCount = 0;
  for (const u of usersToCreate) {
    const existing = await User.findOne({ email: u.email.toLowerCase() });
    if (!existing) {
      await User.create(u);
      createdCount++;
    }
  }
  console.log(`[Seed] Seeded ${createdCount} new users (${usersToCreate.length - createdCount} already existed).`);

  // 4. Document Types with Workflows
  console.log('[Seed] Seeding Document Types with workflows...');
  const documentTypesData = [
    {
      name: 'Bonafide Certificate',
      code: 'BONAFIDE',
      description: 'Official proof of student enrollment at the institution for loan, visa, or transport concessions.',
      expectedHours: 48,
      workflowStages: [
        { stageNumber: 1, role: 'faculty', stepName: 'Faculty Mentor Review', isFinal: false },
        { stageNumber: 2, role: 'hod', stepName: 'HOD Departmental Verification', isFinal: false },
        { stageNumber: 3, role: 'admin', stepName: 'Admin Verification & Issuance', isFinal: true }
      ],
      requiredFields: [
        {
          key: 'reason',
          label: 'Purpose of Bonafide',
          type: 'text',
          required: true,
          placeholder: 'e.g. Passport Application, Education Loan, Bus Pass'
        },
        {
          key: 'academicYear',
          label: 'Academic Year',
          type: 'text',
          required: true,
          placeholder: 'e.g. 2025-2026'
        }
      ],
      requiredAttachments: [
        {
          key: 'id_card',
          label: 'Student College ID Card',
          description: 'Upload a clear scanned copy of your valid student identity card.',
          required: true,
          allowedTypes: ['application/pdf', 'image/jpeg', 'image/png']
        }
      ]
    },
    {
      name: 'Transcript',
      code: 'TRANSCRIPT',
      description: 'Comprehensive academic transcript detailing grades, credits, and cumulative GPA.',
      expectedHours: 72,
      workflowStages: [
        { stageNumber: 1, role: 'faculty', stepName: 'Faculty Mentor Review', isFinal: false },
        { stageNumber: 2, role: 'hod', stepName: 'HOD Departmental Endorsement', isFinal: false },
        { stageNumber: 3, role: 'principal', stepName: 'Principal Academic Approval', isFinal: true }
      ],
      requiredFields: [
        {
          key: 'targetInstitution',
          label: 'Destination University / Organization',
          type: 'text',
          required: true,
          placeholder: 'e.g. Stanford University'
        },
        {
          key: 'purpose',
          label: 'Purpose of Transcript',
          type: 'text',
          required: true,
          placeholder: 'e.g. Higher Studies, WES Evaluation, Employment'
        },
        {
          key: 'numCopies',
          label: 'Number of Official Copies',
          type: 'number',
          required: true,
          placeholder: 'e.g. 2'
        }
      ],
      requiredAttachments: [
        {
          key: 'marksheet_copy',
          label: 'Semester Grade Sheets',
          description: 'Consolidated or all semester grade sheets combined in a single PDF.',
          required: true,
          allowedTypes: ['application/pdf']
        },
        {
          key: 'fee_receipt',
          label: 'Transcript Fee Payment Receipt',
          description: 'Official payment receipt from college accounts portal.',
          required: true,
          allowedTypes: ['application/pdf', 'image/jpeg', 'image/png']
        }
      ]
    },
    {
      name: 'Recommendation Letter',
      code: 'RECOMMENDATION_LETTER',
      description: 'Letter of recommendation endorsed by departmental faculty and HOD.',
      expectedHours: 48,
      workflowStages: [
        { stageNumber: 1, role: 'faculty', stepName: 'Faculty Mentor Appraisal', isFinal: false },
        { stageNumber: 2, role: 'hod', stepName: 'HOD Final Endorsement', isFinal: true }
      ],
      requiredFields: [
        {
          key: 'targetUniversity',
          label: 'Target University / Organization',
          type: 'text',
          required: true,
          placeholder: 'e.g. Carnegie Mellon University'
        },
        {
          key: 'targetProgram',
          label: 'Target Degree Program',
          type: 'text',
          required: true,
          placeholder: 'e.g. Master of Science in Data Science'
        },
        {
          key: 'achievements',
          label: 'Key Academic & Project Highlights',
          type: 'textarea',
          required: true,
          placeholder: 'Brief summary of projects, research papers, GPA, or notable achievements with faculty mentor'
        }
      ],
      requiredAttachments: [
        {
          key: 'resume',
          label: 'Updated Resume / CV',
          description: 'Latest curriculum vitae formatted in PDF.',
          required: true,
          allowedTypes: ['application/pdf']
        },
        {
          key: 'sop',
          label: 'Statement of Purpose Draft',
          description: 'Draft SOP explaining motivation for the chosen program.',
          required: true,
          allowedTypes: ['application/pdf']
        }
      ]
    }
  ];

  let createdDocTypeCount = 0;
  for (const dt of documentTypesData) {
    const existing = await DocumentType.findOne({ code: dt.code });
    if (!existing) {
      await DocumentType.create(dt);
      createdDocTypeCount++;
    }
  }
  console.log(`[Seed] Seeded ${createdDocTypeCount} new document types.`);

  return {
    departments: Object.keys(deptMap).length,
    usersCreated: createdCount,
    documentTypesCreated: createdDocTypeCount
  };
}

module.exports = {
  seedData,
  DEFAULT_PASSWORD
};
