# GroundZero: Loan Default Risk Intelligence

GroundZero is an institutional-grade loan default prediction platform designed for both borrowers and bank analysts. Utilizing advanced Logistic Regression models, it provides real-time default probability estimates and behavioral risk insights through a high-performance React dashboard.

## 🚀 Portals

- **Borrower Portal**: Secure entry for loan applications, risk simulation, repayment scheduling, and AI-driven financial health suggestions.
- **Bank Analyst Portal**: Centralized hub for application underwriting, manual risk assessment, portfolio-wide monitoring, and institutional analytics.

## 🛠️ Tech Stack

### Frontend
- **React 18** (Vite-powered)
- **Chart.js** (Institutional Analytics)
- **Vanilla CSS** (Custom Design System)

### Backend & ML
- **Flask** (REST API)
- **SQLAlchemy** (ORM)
- **scikit-learn** (Risk Intelligence)
- **PostgreSQL** (Production Database)

### Infrastructure
- **Vercel**: Frontend Hosting
- **Railway**: Backend & Database
- **Resend**: Transactional Communication

## 📁 Project Structure

```text
GroundZero/
├── frontend/                # React + Vite Frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components (Auth, Sidebar, AI)
│   │   ├── pages/           # Main portal views (Dashboards, Landing)
│   │   ├── services/        # API and external integration layers
│   │   ├── utils/           # Business logic and risk models
│   │   ├── styles/          # Global and component styling
│   │   └── assets/          # Static assets and media
│   └── package.json
├── ml-service/              # Flask + ML Risk Service
│   ├── core/                # Database models and core engine
│   ├── services/            # Business logic (Mailer, Predictions)
│   ├── scripts/             # Internal DB & training scripts
│   ├── model_artifacts/     # Serialized model binaries (joblib)
│   ├── api.py               # Main Service Entry Point
│   └── requirements.txt
├── scripts/                 # Global utility and maintenance scripts
├── archive/                 # Legacy backups and development history
├── data/                    # Raw and processed datasets
├── notebooks/               # Research and development notebooks
├── docs/                    # Project documentation
└── README.md
```

## ✨ Key Features

- **Multi-Tenant Architecture**: Dedicated portals for borrowers and institutional officers.
- **ML-Driven Predictions**: Real-time logistic regression assessment of default probability.
- **Risk Categorization**: Instant classification into Low, Medium, and High risk tiers.
- **Financial Engineering**: Automated EMI calculation and repayment amortization.
- **Communication CRM**: Integrated email dispatch for loan approvals and status updates.
- **Persistence Layer**: Robust PostgreSQL integration with multi-environment support.

## Environment Variables

Use `.env.example` as a reference. Do not commit real passwords or production
secrets to GitHub.

### Frontend

For local development:

```env
VITE_API_URL=http://localhost:5000
```

For production:

```env
VITE_API_URL=https://your-backend-url.up.railway.app
```

Do not add `/api` at the end. The frontend already appends endpoint paths such
as `/api/login`.

### Backend

```env
DATABASE_URL=postgresql://user:password@host:port/dbname
CORS_ORIGINS=http://localhost:5173
PORT=5000
```

For production:

```env
CORS_ORIGINS=https://your-vercel-frontend-url.vercel.app
```

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/avniparihar-07/Loan-Deafult-Baseline-Model.git
cd Loan-Deafult-Baseline-Model
```

### 2. Backend Setup

Go to the backend folder:

```bash
cd ml-service
```

Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Set the database URL for the current PowerShell session:

```powershell
$env:DATABASE_URL="postgresql://postgres:password@127.0.0.1:5432/GroundZero"
```

Run the backend:

```bash
python api.py
```

The backend should run at:

```text
http://localhost:5000
```

### 3. Frontend Setup

Open a new terminal from the project root and go to the frontend folder:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

The frontend should run at:

```text
http://localhost:5173
```

## PostgreSQL Notes

If PostgreSQL is running on your own laptop, use `127.0.0.1` or `localhost` in
`DATABASE_URL`.

If PostgreSQL is running on another laptop, do not use `127.0.0.1`. Use that
laptop's network IP address:

```powershell
$env:DATABASE_URL="postgresql://postgres:password@FRIEND_IP_ADDRESS:5432/GroundZero"
```

The PostgreSQL host machine must allow remote connections:

- PostgreSQL service must be running.
- Both laptops should be on the same network, unless using a public database.
- `postgresql.conf` should allow external listening.
- `pg_hba.conf` should allow the client laptop IP.
- The firewall must allow inbound traffic on port `5432`.

For production, use a hosted PostgreSQL database such as Railway PostgreSQL,
Supabase, Neon, or another managed database provider.

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Check backend health |
| POST | `/api/signup` | Create a user account |
| POST | `/api/login` | Login user |
| POST | `/api/predict` | Predict loan default risk |
| GET | `/api/applications` | Get all loan applications |
| GET | `/api/my-applications` | Get applications for a borrower email |
| GET | `/api/model-info` | Get model metadata and feature importance |
| GET | `/api/feature-options` | Get valid input options |

## Deployment

### Vercel Frontend

Set this environment variable in Vercel:

```env
VITE_API_URL=https://your-backend-url.up.railway.app
```

Then redeploy the frontend.

### Railway Backend

Set these environment variables in Railway:

```env
DATABASE_URL=postgresql://user:password@host:port/dbname
CORS_ORIGINS=https://your-vercel-frontend-url.vercel.app
```

Then redeploy the backend.

## Common Issues

### Frontend Still Calls Localhost

If the browser console shows a request like this on the deployed Vercel site:

```text
http://localhost:5000/api/login
```

the deployed frontend is still using an old build or does not have
`VITE_API_URL` configured.

Fix:

1. Set `VITE_API_URL` in Vercel.
2. Redeploy the Vercel frontend.
3. Hard refresh the browser with `Ctrl + Shift + R`.

### CORS Error

If the browser blocks requests from Vercel to the backend, set this in Railway:

```env
CORS_ORIGINS=https://your-vercel-frontend-url.vercel.app
```

Then redeploy the backend.

### PostgreSQL Connection Refused

If the backend logs show:

```text
connection to server at "127.0.0.1", port 5432 failed: Connection refused
```

PostgreSQL is not running on the same machine as the backend process, or it is
not accepting connections on port `5432`.

Use the correct PostgreSQL host in `DATABASE_URL`, start PostgreSQL, or switch to
a hosted PostgreSQL database.

## Security Notes

- Do not commit real database passwords.
- Use environment variables for deployment secrets.
- Passwords should be hashed before using this project in production.
- The Flask development server is for local development only.

## License

This project is for educational and demonstration purposes.
