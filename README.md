# Digital Academic Document Workflow System

A high-integrity MERN stack platform for academic document application, multi-tier approvals, SLA tracking, and PDF certificate issuance.

## Technology Stack
- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React, Recharts
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs, Multer, PDFKit
- **Database:** MongoDB with automatic persistent fallback via `mongodb-memory-server` in `server/.data` (ensuring server and seed scripts share one database that survives restarts)

---

## Architecture & Database Sharing
The system solves the in-memory database isolation problem:
1. `config/db.js` attempts connection to `MONGO_URI` from `.env`.
2. If unreachable, it boots or connects to a persistent WiredTiger instance stored at `server/.data`.
3. If the server is already active, `npm run seed -- --reset` connects directly to the running instance over TCP, ensuring seed updates are instantly live.
4. When `users` collection is empty, the server auto-seeds all 4 departments, 22 users, and 3 document types on startup.

---

## Getting Started

### 1. Installation
Install dependencies for both server and client:
```bash
npm install --prefix server
npm install --prefix client
```

### 2. Environment Variables
Server configuration is defined in `server/.env` (mirrored in `server/.env.example`):
```env
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=supersecret_docai_jwt_key_2026_academic_workflow
MONGO_URI=mongodb://localhost:27017/docai
```

### 3. Running the Application
To run the server:
```bash
npm run server
```
To run the frontend:
```bash
npm run client
```

### 4. Seeding & Resetting Data
To reset and re-seed the shared database:
```bash
npm run seed:reset
```

---

## Demo Accounts & Role Verification

See [DEMO_CREDENTIALS.md](DEMO_CREDENTIALS.md) for full accounts directory.

All demo accounts use password: **`password123`**

| Role | Email | Reg No (Students) | Default Dashboard |
| :--- | :--- | :--- | :--- |
| **Student** | `student.aids1@college.edu` | `REG2024AIDS001` | `/student` |
| **Faculty** | `faculty1.aids@college.edu` | `FAC_AIDS_01` | `/faculty` |
| **HOD** | `hod.aids@college.edu` | `HOD_AIDS` | `/hod` |
| **Admin** | `admin@college.edu` | `ADMIN001` | `/admin` |
| **Principal** | `principal@college.edu` | `PRIN001` | `/principal` |

A **"Demo Accounts"** panel on the `/login` page allows 1-click credential autofill for immediate testing.

---
## Demo Video
[Watch the demo video](https://drive.google.com/file/d/1z-5xXHWKaglRXGAg_gn2cLb72FfF9Qxm/view?usp=sharing)

## Automated Acceptance Test Suite

To run the complete automated test suite verifying all 7 acceptance criteria:
```bash
node server/src/scripts/test-final-suite.js
```

### Verified Acceptance Scenarios (29/29 Passing):
1. **Bonafide Approval Chain:** Student applies with attachments &rarr; Faculty approves &rarr; HOD approves &rarr; Admin approves &rarr; PDFKit generates official certificate with 3 cursive signatures & mandatory note: *"Your document is ready. Please collect the original from the Admin office."* &rarr; Student receives notification and downloads certificate.
2. **Faculty Rejection:** Mandatory reason enforcement; student sees exact reason and reviewer credentials.
3. **HOD Correction Loop:** Mandatory reason enforcement; student resubmits revised file; routes back to HOD queue with full audit history.
4. **Principal Rejection:** Multi-tier Transcript review; Principal rejects with mandatory reason; student views rejection reason.
5. **SLA Delay Tracking:** Overdue requests exceeding document expected hours automatically flag as `DELAYED` in the Admin office.
6. **Cross-Access Security:** Unauthorized students attempting to view or download another student's applications or attachments receive `403 Forbidden`.
7. **Database Persistence:** Server kill and restart preserves all users, applications, attachments, and certificates without data loss.
