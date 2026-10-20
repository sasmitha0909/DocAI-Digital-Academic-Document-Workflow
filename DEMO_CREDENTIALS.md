# Demo Credentials & Role Access Directory

All test accounts share the default password: **`password123`**

The web application features a **"Demo Accounts"** interactive panel on the login page (`http://localhost:5173/login`) for 1-click autofill across all roles.

---

## 1. User Test Logins (TASK A - Password: `Test@1234`)

| Role | Name | Identifier (Email / Reg No) | Password | Default Redirect | Purpose / Permissions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Student** | YOUR NAME | `yourname.student@test.com`<br>*(or `310624243167`)* | `Test@1234` | `/student` | Apply for documents, upload attachments, track workflow, download issued PDFs |
| **Faculty** | YOUR NAME (Faculty) | `yourname.faculty@test.com` | `Test@1234` | `/faculty` | Stage 1 appraisal: review mentor requests, add remarks, approve, reject, or request corrections |
| **HOD** | YOUR NAME (HOD) | `yourname.hod@test.com` | `Test@1234` | `/hod` | Stage 2 departmental endorsement: verify student applications within their department |
| **Admin** | YOUR NAME (Admin) | `yourname.admin@test.com` | `Test@1234` | `/admin` | Stage 3 Bonafide issuance, SLA delay tracking, user directory, workflow configs, revocation |
| **Principal** | YOUR NAME (Principal) | `yourname.principal@test.com` | `Test@1234` | `/principal` | Stage 3 Transcript final approval, institutional governance, high-level analytics |

> **Note on Login Identifiers:**
> - **Students** can log in using either their **Email** (`yourname.student@test.com`) or **Register Number** (`310624243167`).
> - **Faculty, HOD, Admin, and Principal** log in using **Email only**.

---

## 2. Standard Demo Accounts (Password: `password123`)

| Role | Name | Identifier (Email / Reg No) | Password | Default Redirect | Purpose / Permissions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Student** | Alex Johnson | `student.aids1@college.edu`<br>*(or `REG2024AIDS001`)* | `password123` | `/student` | Apply for documents, upload attachments, track workflow, download issued PDFs |
| **Faculty** | Dr. Arun Kumar | `faculty1.aids@college.edu` | `password123` | `/faculty` | Stage 1 appraisal: review mentor requests, add remarks, approve, reject, or request corrections |
| **HOD** | Prof. Meera Pillai | `hod.aids@college.edu` | `password123` | `/hod` | Stage 2 departmental endorsement: verify student applications within their department |
| **Admin** | Academic Admin | `admin@college.edu` | `password123` | `/admin` | Stage 3 Bonafide issuance, SLA delay tracking, user directory, workflow configs, revocation |
| **Principal** | Dr. Arthur Campbell | `principal@college.edu` | `password123` | `/principal` | Stage 3 Transcript final approval, institutional governance, high-level analytics |

---

## 2. Departmental Accounts Directory

The institution is configured with **4 academic departments**:
1. **AI & Data Science (AIDS)**
2. **Computer Science (CSE)**
3. **Information Technology (IT)**
4. **Electronics and Communication (ECE)**

### A. AI & Data Science (AIDS)
- **HOD:** `hod.aids@college.edu` (`HOD_AIDS`) &mdash; Prof. Meera Pillai
- **Faculty 1:** `faculty1.aids@college.edu` (`FAC_AIDS_01`) &mdash; Dr. Arun Kumar (Assistant Professor)
- **Faculty 2:** `faculty2.aids@college.edu` (`FAC_AIDS_02`) &mdash; Dr. Sneha Roy (Associate Professor)
- **Student 1:** `student.aids1@college.edu` (`REG2024AIDS001`) &mdash; Alex Johnson (Year 3)
- **Student 2:** `student.aids2@college.edu` (`REG2024AIDS002`) &mdash; Maya Sharma (Year 2)

### B. Computer Science & Engineering (CSE)
- **HOD:** `hod.cse@college.edu` (`HOD_CSE`) &mdash; Prof. Rajesh Verma
- **Faculty 1:** `faculty1.cse@college.edu` (`FAC_CSE_01`) &mdash; Dr. Robert Wilson (Assistant Professor)
- **Faculty 2:** `faculty2.cse@college.edu` (`FAC_CSE_02`) &mdash; Dr. Kavita Sharma (Associate Professor)
- **Student 1:** `student.cse1@college.edu` (`REG2024CSE001`) &mdash; John Doe (Year 3)
- **Student 2:** `student.cse2@college.edu` (`REG2024CSE002`) &mdash; Sarah Jenkins (Year 4)

### C. Information Technology (IT)
- **HOD:** `hod.it@college.edu` (`HOD_IT`) &mdash; Prof. Sanjay Mukherjee
- **Faculty 1:** `faculty1.it@college.edu` (`FAC_IT_01`) &mdash; Dr. Vikram Seth (Assistant Professor)
- **Faculty 2:** `faculty2.it@college.edu` (`FAC_IT_02`) &mdash; Dr. Neha Gupta (Associate Professor)
- **Student 1:** `student.it1@college.edu` (`REG2024IT001`) &mdash; David Miller (Year 2)
- **Student 2:** `student.it2@college.edu` (`REG2024IT002`) &mdash; Priya Patel (Year 3)

### D. Electronics and Communication (ECE)
- **HOD:** `hod.ece@college.edu` (`HOD_ECE`) &mdash; Prof. Ananth Iyer
- **Faculty 1:** `faculty1.ece@college.edu` (`FAC_ECE_01`) &mdash; Dr. Suresh Reddy (Assistant Professor)
- **Faculty 2:** `faculty2.ece@college.edu` (`FAC_ECE_02`) &mdash; Dr. Deepa Nair (Associate Professor)
- **Student 1:** `student.ece1@college.edu` (`REG2024ECE001`) &mdash; Rahul Bose (Year 3)
- **Student 2:** `student.ece2@college.edu` (`REG2024ECE002`) &mdash; Ananya Deshmukh (Year 2)

---

## 3. Configured Document Types & Workflows

1. **Bonafide Certificate (`BONAFIDE`)**
   - Workflow: Faculty Mentor &rarr; HOD &rarr; Admin &rarr; Certificate Issuance
   - Expected Processing Window: 48 hours
2. **Transcript (`TRANSCRIPT`)**
   - Workflow: Faculty Mentor &rarr; HOD &rarr; Principal &rarr; Certificate Issuance
   - Expected Processing Window: 72 hours
3. **Recommendation Letter (`RECOMMENDATION_LETTER`)**
   - Workflow: Faculty Mentor &rarr; HOD &rarr; Issued
   - Expected Processing Window: 48 hours

---

## 4. Resetting Data
To reset and re-seed the shared database at any time:
```bash
npm run seed:reset
```
