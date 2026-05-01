# TrustMyDegree 🎓⛓️

> *Because a diploma should be trusted — not just printed.*

TrustMyDegree is a blockchain-powered academic credentialing platform built for **ENSTA** (École Nationale Supérieure de Technologie Avancée). Administrators issue tamper-proof digital certificates anchored on-chain, students carry and share their credentials from a personal wallet, and employers verify authenticity in seconds — no phone calls, no paperwork, no doubt.

---

## 👥 Team

| Name | Role |
|---|---|
| **BEDAD Ines** | Project Manager, Blockchain Developer |
| **BENLOULOU Nadjah Cirine** | Designer, Backend Developer |
| **ARAR Bouchra Manel** | Frontend Developer |
| **KHELIL Ikram** | Designer, Backend Developer |
| **BAGHDADI Abderrahim Wael** | Blockchain Developer |

**Supervisors:** Bendouda Djamila · El Hadi Khoemri

---

## Why Does This Exist?

Academic fraud is a real problem. Fake diplomas circulate. Verification processes are slow, manual, and unreliable. TrustMyDegree fixes that by anchoring every certificate to the **Ethereum blockchain** — making it mathematically impossible to forge or tamper with. The certificate either matches its on-chain hash, or it doesn't. No gray area.

---

## How the Blockchain Works

When an admin issues a certificate, here's what actually happens:

1. **Student data is pulled** from the ENSTA university database via automatic synchronization
2. **A certificate is generated** (PDF) from a structured Excel upload
3. **A unique hash is written to a smart contract** deployed on **Arbitrum Sepolia** — creating a permanent, immutable on-chain record
4. **The student receives a verifiable credential** with an embedded QR code linked to that on-chain record
5. **Anyone can verify it** — paste the certificate code or scan the QR code on the public verification page. The platform queries the Ethereum blockchain and returns an instant result

Five separate smart contracts handle different certificate types:
- `DiplomaRegistry` — Diplomas
- `InternshipRegistry` — Internship certificates
- `StudyCertificateRegistry` — School / scolarité certificates
- `DocumentRegistry` — Official documents
- `RankRegistry` — Rank certificates

Revocations are also recorded permanently on-chain. Once revoked, it always shows as **REVOKED** — there is no undoing it.

---

## Features by Role

### 🔑 Super Admin
Full system access — the only role that can create or remove administrator accounts. Also inherits all Admin privileges.

- Add new admins (they receive login details by email automatically) or delete their account
- Permanently remove admin access
- All features listed under Admin below

### 🏫 Admin
- **Student synchronization** — auto-import students from the ENSTA university database (creates accounts using matricule + date of birth as default password)
- **Issue certificates** in bulk via Excel upload — supports Diploma, School Certificate, Internship Certificate, and Rank
- **Revoke certificates** — permanent, blockchain-recorded invalidation
- **Manage document requests** — view, approve, reject, and upload official documents with priority tracking (Normal / Urgent)
- **Manage Students** - delete students , view students data
- **Statistics dashboard** — monthly issuance trends, certificate type breakdown, verification counts over the last 30 days
- Summary cards: Total / Active / Revoked certificates at a glance

### 🎓 Student
Students log in with their matricule and default password (date of birth in `YYYY-MM-DD` format).

- View all personal blockchain-verified certificates in a wallet
- **Download** certificates as PDF (with embedded QR code)
- **Share** certificates via LinkedIn as a verified badge
- **Request** official documents (digital or physical) — fill a form and track status
- Change password after first login

### 🔍 Public (No Login Required)
- Paste a certificate's unique code or scan its QR code
- The platform queries the Ethereum blockchain and instantly confirms: **VALID**, **REVOKED**, or **NOT FOUND**
- No account, no friction

---

## Tech Stack

### Frontend
| Technology | Usage |
|---|---|
| React 19 | UI framework |
| React Router | Client-side routing |
| Axios | HTTP requests |
| React Hot Toast | Notifications |
| Chart.js / Recharts | Statistics charts |
| CSS Modules | Scoped styling |

### Backend
| Technology | Usage |
|---|---|
| Node.js + Express | REST API |
| Prisma ORM | Database access |
| PostgreSQL 14+ | Primary application database |
| PostgreSQL (secondary) | Read-only sync from ENSTA university database |
| JWT | Authentication (24-hour sessions) |
| bcrypt | Password hashing |
| Nodemailer | Email notifications |
| **Ethers.js** | **Blockchain interaction** |
| Multer / express-fileupload | File uploads |
| XLSX | Excel import/export |

### Blockchain
| Component | Detail |
|---|---|
| Network | **Arbitrum Sepolia** (Ethereum L2 testnet) |
| Language | Solidity 0.8.20 |
| Framework | Hardhat |
| Interaction | Ethers.js via backend service |
| Storage | Contract ABIs in `TMD-backend/src/config/abis/` |
| Smart Contracts | 5 separate registries (Diploma, Internship, Study, Document, Rank) |

### External Services
| Service | Purpose |
|---|---|
| **Alchemy** | Blockchain RPC provider (Arbitrum Sepolia) |
| **MetaMask** | School wallet for signing transactions |
| **Filebase** | IPFS storage for PDF certificates |
| **Cloudinary** | Avatar image hosting |
| **Gmail / SMTP** | Email notifications & admin onboarding |

---

## Getting Started

### Prerequisites

**Hardware:**
- RAM: minimum 8 GB (16 GB recommended)
- Disk: minimum 5 GB free space
- OS: Windows 10/11, Ubuntu 20.04+, or macOS 12+

**Software:**
- Node.js v18+ (v22 recommended)
- npm v9+
- Git
- PostgreSQL 14+
- Hardhat / Solidity 0.8.20

**External accounts to create before you start:**

| Service | Why you need it | Where to get it |
|---|---|---|
| Alchemy | Blockchain RPC (Arbitrum Sepolia) | alchemy.com → create app → Arbitrum Sepolia |
| MetaMask | Sign blockchain transactions | metamask.io → export private key |
| Filebase | IPFS storage for PDF certificates | filebase.com → create S3 bucket |
| Cloudinary | Avatar image hosting | cloudinary.com → dashboard → API keys |
| Gmail | Send notification emails | Gmail → Security → App Password |

---

### 1. Clone the Repository

```bash
git clone https://github.com/itj-7/TrustMyDegreeFinal.git
cd TrustMyDegreeFinal
```

### 2. Install Dependencies

Open **3 separate terminals** and run the following in each:

```bash
# Terminal 1 — Backend
cd TMD-backend && npm install

# Terminal 2 — Blockchain
cd TMD-blockchain && npm install

# Terminal 3 — Frontend
cd TMD-frontend && npm install
```

### 3. Configure Environment Variables

In **Terminal 1** (backend), copy and fill in the `.env`:

```bash
cp .env.example .env
```

Open `.env` and fill in all values:

```env
# Server
PORT=5000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_long_random_secret_here

# PostgreSQL — Main application database
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# PostgreSQL — University student database (read-only sync)
UNIVERSITY_DB_URL=postgresql://user:password@host/uni_dbname?sslmode=require

# Email (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Blockchain (Arbitrum Sepolia — from Alchemy)
BLOCKCHAIN_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/your_key
SCHOOL_WALLET_PRIVATE_KEY=your_metamask_private_key  # Never commit this

# Deployed contract addresses (fill these in after Step 5)
DIPLOMA_CONTRACT_ADDRESS=
INTERNSHIP_CONTRACT_ADDRESS=
STUDY_CONTRACT_ADDRESS=
DOCUMENT_CONTRACT_ADDRESS=
RANK_REGISTRY_ADDRESS=

# Filebase (IPFS storage for PDFs)
FILEBASE_KEY=your_filebase_access_key
FILEBASE_SECRET=your_filebase_secret_key
FILEBASE_BUCKET=your_bucket_name

# Cloudinary (avatar image storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Set Up the Database

In **Terminal 1** (backend):

```bash
npx prisma migrate deploy   # Create all tables
npx prisma generate         # Generate Prisma client

# Optional: open a visual DB browser to verify
npx prisma studio
```

### 5. Deploy Smart Contracts

In **Terminal 2** (blockchain):

```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network arbitrumSepolia
```

The terminal will print 5 contract addresses. Copy each one back into your `.env`:

```
DiplomaRegistry deployed at:          0x826...
InternshipRegistry deployed at:       0x0f5...
StudyCertificateRegistry deployed at: 0x83c...
DocumentRegistry deployed at:         0x7c5...
RankRegistry deployed at:             0xa64...
```

> Once deployed, contracts live on Arbitrum Sepolia **permanently**. You don't need to redeploy unless you change the contract code.

### 6. Copy Contract ABIs to Backend

In **Terminal 2** (from the project root):

```bash
cd ..
cp TMD-blockchain/artifacts/contracts/DiplomaRegistry.sol/DiplomaRegistry.json TMD-backend/src/config/abis/
cp TMD-blockchain/artifacts/contracts/InternshipRegistry.sol/InternshipRegistry.json TMD-backend/src/config/abis/
cp TMD-blockchain/artifacts/contracts/StudyCertificateRegistry.sol/StudyCertificateRegistry.json TMD-backend/src/config/abis/
cp TMD-blockchain/artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json TMD-backend/src/config/abis/
cp TMD-blockchain/artifacts/contracts/StudentRegistry.sol/StudentRegistry.json TMD-backend/src/config/abis/RankRegistry.json

# Set up blockchain .env
cd TMD-blockchain
cp .env.example .env
# Fill in BLOCKCHAIN_RPC_URL and SCHOOL_WALLET_PRIVATE_KEY
```

In **Terminal 3** (frontend):

```bash
cp .env.example .env
# Fill in: REACT_APP_API_URL=http://localhost:5000
```

### 7. Create the Super Admin Account

Make sure the backend is running first (Step 8), then call this **once**:

```bash
curl -X POST http://localhost:5000/api/auth/seed-super-admin
# Expected: { "message": "Super Admin created successfully" }
```

Default credentials:
- **Matricule:** `SUPERADMIN`
- **Password:** `superadmin123`

> ⚠️ Change the password immediately after first login.

### 8. Run the Application

**Development:**

```bash
# Terminal 1
cd TMD-backend && npm run dev    # → http://localhost:5000

# Terminal 3
cd TMD-frontend && npm start     # → http://localhost:3000
```

**Production:**

```bash
cd TMD-backend && npm start
cd TMD-frontend && npm run build
```

Recommended deployment: **Railway** (backend) · **Vercel** (frontend) · **Supabase or Railway PostgreSQL** (database)

---

## Verification Checklist

After setup, confirm everything works:

| What to test | How | Expected result |
|---|---|---|
| Backend is running | `GET http://localhost:5000/api/health` | `{ "status": "ok" }` |
| Database connected | Check backend terminal on start | `"trustmydegree database connected"` |
| Frontend loads | Open `http://localhost:3000` | Home page appears |
| Student login | Matricule + date of birth | Student dashboard opens |
| Admin login | Email + password | Admin dashboard opens |
| Blockchain connected | Import one student from Excel | Certificate appears in DB with `blockchainCertId` |

---

## Project Structure

```
TrustMyDegreeFinal/
├── TMD-frontend/
│   └── src/
│       ├── component/
│       │   ├── home/          # Landing page, layout, public verify
│       │   ├── login/         # Login, ForgotPassword
│       │   ├── admin/         # Dashboard, Issue, List, Requests, Stats, Audit
│       │   └── student/       # Student wallet, requests, settings
│       └── api.js             # Axios instance
│
├── TMD-backend/
│   ├── controllers/           # Auth, Admin, Student, Verify logic
│   ├── routes/                # Express routers
│   ├── middleware/            # JWT protect, isAdmin guards
│   ├── src/config/abis/       # Smart contract ABIs (copied after deploy)
│   ├── services/              # Blockchain service (Ethers.js)
│   └── prisma/
│       └── schema.prisma      # Database schema
│
└── TMD-blockchain/
    ├── contracts/             # Solidity smart contracts (.sol)
    ├── scripts/deploy.js      # Deployment script
    └── hardhat.config.js      # Hardhat + Arbitrum Sepolia config
```

---

## User Roles Summary

| Role | Login | Access |
|---|---|---|
| `SUPER_ADMIN` | Email + password | Full — manage admins + all features |
| `ADMIN` | Email + password | Issue, revoke, manage requests, view stats |
| `STUDENT` | Matricule + date of birth (`YYYY-MM-DD`) | Own certificates, document requests |
| `PUBLIC` | No login | Certificate verification only |

---

## Troubleshooting

| Error | Real Cause | Fix |
|---|---|---|
| `HardhatError: Connected to chain id 42161` | Alchemy RPC points to Arbitrum Mainnet, not Sepolia | Go to Alchemy → verify the network is **Arbitrum Sepolia**. URL must contain `arb-sepolia` |
| `Prisma: Environment variable not found: DATABASE_URL` | `.env` is missing or malformed | Make sure `.env` exists in `TMD-backend/` with a valid `DATABASE_URL` |
| `Filebase did not return an IPFS CID` | Wrong credentials or bucket doesn't exist | Check `FILEBASE_KEY`, `FILEBASE_SECRET`, `FILEBASE_BUCKET`. Create the bucket on filebase.com if needed |
| `Cannot find module '../config/abis/RankRegistry.json'` | ABIs not copied after deployment | Re-run Step 6 in full |
| `CORS error in browser console` | `FRONTEND_URL` in `.env` doesn't match the actual frontend URL | Set `FRONTEND_URL=http://localhost:3000` (or your deployed domain in production) |

---

## FAQ

| Question | Answer |
|---|---|
| **I can't log in** | Students: password = date of birth in `YYYY-MM-DD` format. Admins: check the email with your received password. Make sure Caps Lock is off. |
| **LinkedIn sharing doesn't work** | Make sure you're logged into LinkedIn in the same browser and that pop-ups are not blocked. |
| **Certificate shows NOT FOUND** | The code may be incorrect, or the certificate was never issued. Double-check the code and try again. |
| **My certificate doesn't appear** | The admin must issue it first. Verify your student ID is correct in the database, then refresh (F5). |
| **The Excel file is rejected** | Check: `matricule` column matches the database exactly, dates are `YYYY-MM-DD`, file is `.xlsx` format. An error report lists unmatched IDs. |
| **Can I undo a revocation?** | **No.** Revocation is permanent and recorded on the blockchain — the certificate will always show as REVOKED. Verify carefully before revoking. |

---

## Best Practices

| ✅ Do | ❌ Don't |
|---|---|
| Change your password on first login | Share your login credentials with anyone |
| Synchronize students at the start of each academic year | Issue certificates without synchronizing students first |
| Verify all Excel columns before uploading | Use an incorrect date format (e.g. `01/01/2024` instead of `2024-01-01`) |
| Log out after each session on a shared computer | Leave your session open on a public device |


*Built with ☕ and too many late nights · ENSTA 2025/2026*  
*This project was built as part of a final year project at ENSTA Algiers by: BEDAD · BENLOULOU · ARAR · KHELIL · BAGHDADI* 

© 2026 TrustMyDegree — All rights reserved.
