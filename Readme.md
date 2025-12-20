docker-compose up -d
# GreenReceipt (MERN)

Digital receipts platform with customer and merchant portals. Backend: Node.js/Express + MongoDB. Frontend: React + Vite + Tailwind. Auth uses JWT with email OTP verification.

## Features
- Customer portal: view receipts, basic analytics, auth with OTP email verification.
- Merchant portal: manage receipts, view analytics, auth with OTP email verification.
- Protected APIs for receipts and analytics.
- Email delivery for verification codes (nodemailer).

## Tech Stack
- Frontend: React, Vite, Tailwind, Axios, React Router.
- Backend: Node.js, Express, Mongoose, JWT, bcrypt, Nodemailer.
- Database: MongoDB.

## Prerequisites
- Node.js 18+
- MongoDB instance (local or remote)
- SMTP credentials (e.g., Gmail App Password) for sending OTP codes

## Environment Variables
Create two `.env` files: one in `backend/`, one in `frontend/`.

### backend/.env
```
PORT=5001
MONGO_URI=mongodb://localhost:27017/greenreceipt
JWT_SECRET=replace_with_strong_secret
EMAIL_USER=your_smtp_user@gmail.com
EMAIL_PASS=your_smtp_app_password
CLIENT_URL=http://localhost:5173
```

### frontend/.env
```
VITE_API_URL=http://localhost:5001/api
```

## Installation
From repo root:
```
cd backend && npm install
cd ../frontend && npm install
```

## Running (Development)
Use two terminals.

1) Backend
```
cd backend
npm run dev
```

2) Frontend
```
cd frontend
npm run dev
```

Frontend dev server defaults to http://localhost:5173 and calls the API at `VITE_API_URL`.

## Auth + OTP Flow
- Signup (customer/merchant) at `/api/auth/signup/customer` or `/api/auth/signup/merchant` stores `isVerified=false`, generates a 6-digit OTP, emails it.
- User enters the code on `/verify-customer` or `/verify-merchant` pages.
- Verification calls `POST /api/auth/otp/verify` with `{ email, role, code }`; on success returns JWT, stored in localStorage, and redirects to the dashboard.
- Resend code via `POST /api/auth/otp/request` with `{ email, role }`. Codes expire in 10 minutes; five attempts max.

## Key API Endpoints
- `POST /api/auth/signup/customer` { name, email, password, confirmPassword }
- `POST /api/auth/signup/merchant` { shopName, email, password, confirmPassword }
- `POST /api/auth/login` { email, password, role }
- `POST /api/auth/otp/request` { email, role }
- `POST /api/auth/otp/verify` { email, role, code }

## Frontend Routes
- Customer: `/customer-signup`, `/customer-login`, `/verify-customer`, `/customer-dashboard`
- Merchant: `/merchant-signup`, `/merchant-login`, `/verify-merchant`, `/merchant-dashboard`
- ProtectedRoute guards dashboards using JWT in localStorage.

## Project Structure (trimmed)
```
backend/
  src/controllers/authController.js
  src/routes/authRoutes.js
  src/models/User.js
  src/models/Merchant.js
  src/utils/sendEmail.js
frontend/
  src/services/api.js
  src/pages/CustomerSignup.jsx
  src/pages/MerchantSignup.jsx
  src/pages/CustomerVerify.jsx
  src/pages/MerchantVerify.jsx
```

## Tailwind/Vite Notes
If Tailwind config is missing, run inside `frontend/`:
```
npx tailwindcss init -p
```
Ensure `src/index.css` imports Tailwind base/components/utilities.

## Manual Test Checklist
1) Start backend and frontend dev servers.
2) Sign up a customer, receive email OTP, verify, land on dashboard.
3) Sign up a merchant, receive OTP, verify, land on dashboard.
4) Try invalid/expired code to confirm error handling and resend.

## Deployment Tips
- Set `VITE_API_URL` to your deployed API base.
- Use strong `JWT_SECRET` and production SMTP credentials.
- Ensure MongoDB is reachable from your deployment environment.

## License
MIT
STORAGE_TYPE=local
