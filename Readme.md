# GreenReceipt

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live-green--recipt.vercel.app-22c55e?style=for-the-badge&logo=vercel&logoColor=white)](https://green-recipt.vercel.app)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.5-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**A production-ready digital receipt management platform featuring role-based authentication, bilingual internationalization, and real-time analytics.**

[Live Demo](https://green-recipt.vercel.app) · [Architecture](#architecture) · [API Reference](#api-reference) · [Contributing](#contributing)

</div>

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [API Reference](#api-reference)
- [Security Implementation](#security-implementation)
- [Internationalization](#internationalization)
- [Scalability Considerations](#scalability-considerations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview

GreenReceipt is a full-stack digital receipt platform that connects merchants and customers through QR-code-based instant receipt delivery. The platform eliminates paper waste while providing both parties with actionable insights into their transactions.

### System Flow

```
┌─────────────────┐     QR Scan      ┌─────────────────┐     Real-time     ┌─────────────────┐
│    Merchant     │ ───────────────► │   GreenReceipt  │ ────────────────► │    Customer     │
│    Dashboard    │                  │      API        │                   │    Dashboard    │
└─────────────────┘                  └─────────────────┘                   └─────────────────┘
        │                                    │                                      │
        │                                    │                                      │
        ▼                                    ▼                                      ▼
   Sales Analytics              MongoDB (Mongoose ODM)               Spending Insights
   Item Management               JWT Authentication                  Receipt Wallet
   Receipt Generation            Rate-Limited APIs                   Calendar View
```

### Problem Statement

| Challenge | Impact |
|-----------|--------|
| Paper Receipt Waste | 10M+ trees cut annually for receipt paper globally |
| Lost Documentation | 70% of consumers lose receipts needed for returns |
| Manual Expense Tracking | Time-consuming and error-prone for individuals |
| Limited Merchant Analytics | Small businesses lack customer insights |

### Solution

GreenReceipt provides a dual-portal system:
- **Customers** receive receipts instantly via QR scan, with automatic categorization and spending analytics
- **Merchants** generate professional digital receipts while gaining access to sales dashboards and customer behavior insights

---

## Key Features

### Customer Portal

| Feature | Description |
|---------|-------------|
| **Digital Wallet** | Centralized receipt storage with search and filtering |
| **Spending Analytics** | Category breakdown, merchant distribution, time-series trends |
| **Calendar View** | Visual timeline with daily transaction summaries |
| **Receipt Upload** | Digitize legacy paper receipts via image capture |
| **QR Claiming** | Instant receipt acquisition through merchant QR codes |
| **Expense Tracking** | Include/exclude receipts from analytics calculations |

### Merchant Portal

| Feature | Description |
|---------|-------------|
| **Receipt Generation** | Create itemized digital receipts with auto-generated claim codes |
| **Sales Dashboard** | Real-time revenue metrics, transaction volume, trend analysis |
| **Item Management** | Product catalog with category organization |
| **Customer Analytics** | Purchase patterns and repeat customer identification |
| **Billing History** | Subscription and payment tracking |

### Cross-Platform Features

| Feature | Description |
|---------|-------------|
| **Dark Mode** | System-aware theme with manual toggle |
| **Bilingual Support** | English and Hindi with runtime language switching |
| **Responsive Design** | Mobile-first UI with desktop optimization |
| **PWA Ready** | Service worker registration for offline capability |

---

## Architecture

### Project Structure

```
greenreceipt/
├── backend/
│   └── src/
│       ├── config/
│       │   └── db.js                 # MongoDB connection with pooling
│       ├── controllers/
│       │   ├── analyticsController.js # Cached analytics endpoints
│       │   ├── authController.js      # Auth, OTP, password reset
│       │   ├── categoryController.js  # Category CRUD
│       │   ├── itemController.js      # Item management
│       │   ├── merchantController.js  # Merchant operations
│       │   └── receiptController.js   # Receipt CRUD + pagination
│       ├── middleware/
│       │   ├── authMiddleware.js      # JWT verification + role guard
│       │   └── validate.js            # Zod schema validation
│       ├── models/
│       │   ├── Category.js            # Category schema
│       │   ├── Item.js                # Product schema
│       │   ├── Merchant.js            # Merchant schema + auto-code gen
│       │   ├── Receipt.js             # Receipt schema + indexing
│       │   └── User.js                # Customer schema + password hashing
│       ├── routes/
│       │   ├── analyticsRoutes.js     # Rate-limited analytics
│       │   ├── authRoutes.js          # Public auth endpoints
│       │   ├── merchantRoutes.js      # Protected merchant routes
│       │   └── receiptRoutes.js       # Protected receipt routes
│       ├── utils/
│       │   ├── sendEmail.js           # Nodemailer wrapper
│       │   └── timezone.js            # IST timezone utilities
│       ├── validators/
│       │   ├── authSchemas.js         # Zod auth validation
│       │   └── receiptSchemas.js      # Zod receipt validation
│       └── server.js                  # Express app entry point
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── auth/                  # Authentication UI
│       │   ├── common/                # Shared components (Logo, Theme, etc.)
│       │   ├── customer/              # Customer dashboard components
│       │   ├── home/                  # Landing page sections
│       │   ├── layout/                # Navbar, Footer
│       │   ├── merchant/              # Merchant dashboard components
│       │   └── onboarding/            # Walkthrough wizards
│       ├── contexts/
│       │   ├── AuthContext.jsx        # Auth state management
│       │   └── ThemeContext.jsx       # Dark mode state
│       ├── i18n/
│       │   ├── index.js               # i18next configuration
│       │   └── locales/
│       │       ├── en.json            # English translations
│       │       └── hi.json            # Hindi translations
│       ├── pages/                     # Route-level components
│       ├── services/
│       │   └── api.js                 # Axios instance with interceptors
│       └── utils/
│           ├── mockData.js            # Development test data
│           └── timezone.js            # Client timezone utilities
│
├── public/
│   ├── manifest.json                  # PWA manifest
│   └── sw.js                          # Service worker
│
└── README.md
```

### Data Models

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│     User     │       │   Merchant   │       │   Receipt    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ _id          │       │ _id          │       │ _id          │
│ name         │       │ businessName │       │ merchantId   │──┐
│ email        │       │ email        │       │ customerId   │──┼──► References
│ password     │       │ password     │       │ items[]      │  │
│ isVerified   │       │ merchantCode │       │ total        │  │
│ otp{}        │       │ category     │       │ claimCode    │  │
│ resetToken   │       │ isVerified   │       │ isClaimed    │──┘
└──────────────┘       └──────────────┘       │ createdAt    │
                                              └──────────────┘
```

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI framework with concurrent features |
| Vite | 6.3.5 | Build tool and dev server |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| React Router | 6.23.1 | Client-side routing |
| i18next | 25.7.1 | Internationalization framework |
| Framer Motion | 12.23.3 | Animation library |
| Axios | 1.9.0 | HTTP client with interceptors |
| Lucide React | 0.511.0 | Icon library |
| Recharts | 2.15.2 | Data visualization |
| React Hot Toast | 2.5.2 | Notification system |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime environment |
| Express | 4.19.2 | Web framework |
| Mongoose | 8.5.1 | MongoDB ODM |
| jsonwebtoken | 9.0.2 | JWT authentication |
| bcryptjs | 2.4.3 | Password hashing |
| Zod | 3.23.8 | Schema validation |
| Helmet | 8.1.0 | Security headers |
| express-rate-limit | 7.2.0 | Rate limiting |
| express-mongo-sanitize | 2.2.0 | NoSQL injection prevention |
| compression | 1.7.4 | Response compression |
| Nodemailer | 6.9.14 | Email delivery |

---

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- MongoDB 6.0+ (local installation or Atlas cluster)
- SMTP credentials (Gmail App Password recommended for development)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/greenreceipt.git
cd greenreceipt

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running the Application

```bash
# Terminal 1: Start backend server
cd backend
npm run dev

# Terminal 2: Start frontend dev server
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173` with the API running on `http://localhost:5001`.

---

## Environment Configuration

### Backend (`backend/.env`)

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/greenreceipt

# Authentication
JWT_SECRET=your_secure_random_string_min_32_chars

# Email Service (Gmail with App Password)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_app_password

# CORS
CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5001/api
```

### Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Backend server port |
| `NODE_ENV` | Yes | `development` or `production` |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for JWT signing (min 32 characters) |
| `EMAIL_USER` | Yes | SMTP email address |
| `EMAIL_PASS` | Yes | SMTP password or app password |
| `CLIENT_URL` | Yes | Frontend URL for CORS whitelist |
| `VITE_API_URL` | Yes | Backend API base URL |

---

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/signup/customer` | Register new customer | No |
| `POST` | `/api/auth/signup/merchant` | Register new merchant | No |
| `POST` | `/api/auth/login` | Authenticate user | No |
| `POST` | `/api/auth/otp/request` | Request OTP email | No |
| `POST` | `/api/auth/otp/verify` | Verify OTP code | No |
| `POST` | `/api/auth/forgot-password` | Request password reset | No |
| `POST` | `/api/auth/reset-password` | Reset password with token | No |

### Receipt Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/receipts/customer` | Get customer receipts (paginated) | JWT |
| `GET` | `/api/receipts/merchant` | Get merchant receipts (paginated) | JWT |
| `POST` | `/api/receipts` | Create new receipt | JWT (Merchant) |
| `POST` | `/api/receipts/claim` | Claim receipt via code | JWT (Customer) |
| `GET` | `/api/receipts/:id` | Get receipt by ID | JWT |
| `PATCH` | `/api/receipts/:id` | Update receipt | JWT |
| `DELETE` | `/api/receipts/:id` | Delete receipt | JWT |

### Analytics Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/analytics/customer` | Customer spending analytics | JWT |
| `GET` | `/api/analytics/merchant` | Merchant sales analytics | JWT |

### Response Format

All API responses follow a consistent structure:

```json
{
  "success": true,
  "data": { },
  "message": "Operation completed successfully"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

---

## Security Implementation

### Authentication Flow

```
┌─────────┐    Email/Password    ┌─────────┐    JWT Token    ┌─────────┐
│  Client │ ──────────────────► │   API   │ ──────────────► │  Client │
└─────────┘                      └─────────┘                 └─────────┘
     │                                │                           │
     │         OTP Request            │                           │
     │ ◄─────────────────────────────►│                           │
     │                                │                           │
     │         OTP Verify             │                           │
     │ ──────────────────────────────►│                           │
     │                                │      Set Verified=true    │
     │                                │ ──────────────────────────►│
```

### Security Measures

| Layer | Implementation | Configuration |
|-------|----------------|---------------|
| **Headers** | Helmet.js | XSS, CSP, clickjacking, MIME sniffing protection |
| **Rate Limiting** | express-rate-limit | 300 requests per 15-minute window |
| **Input Sanitization** | express-mongo-sanitize | Strips `$` and `.` from request body |
| **Parameter Pollution** | hpp | Prevents HTTP parameter pollution |
| **Password Hashing** | bcryptjs | 12 salt rounds |
| **Token Security** | JWT | 7-day expiry, HS256 algorithm |
| **OTP Security** | Custom | 6 digits, 10-minute expiry, 5 attempts max |
| **Body Parsing** | Express | 10KB limit on JSON payloads |
| **CORS** | cors middleware | Whitelist-based origin control |
| **Proxy Trust** | Express | Configured for deployment behind reverse proxy |

### Server Security Configuration

```javascript
// Security headers
app.use(helmet());

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                  // 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
}));

// NoSQL injection prevention
app.use(mongoSanitize());

// HTTP parameter pollution prevention
app.use(hpp());

// Body size limit
app.use(express.json({ limit: '10kb' }));

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
```

---

## Internationalization

GreenReceipt implements bilingual support (English and Hindi) using i18next with the following architecture:

### Configuration

```javascript
// i18n/index.js
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'greenreceipt-lang',
      caches: ['localStorage'],
    },
  });
```

### Language Detection Priority

1. **localStorage** (`greenreceipt-lang` key)
2. **Browser language** (navigator.language)
3. **Fallback** to English

### Usage Pattern

```javascript
import { useTranslation } from 'react-i18next';

function Component() {
  const { t, i18n } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <button onClick={() => i18n.changeLanguage('hi')}>
        {t('settings.switchToHindi')}
      </button>
    </div>
  );
}
```

### Translation Coverage

Both customer and merchant interfaces are fully translated including:
- Navigation and sidebar items
- Dashboard statistics and labels
- Form fields and validation messages
- Notifications and alerts
- Settings and profile pages

---

## Scalability Considerations

### Database Optimization

- **Connection Pooling**: Mongoose default pool size with automatic connection management
- **Indexing**: Compound indexes on frequently queried fields (`merchantId + createdAt`, `customerId + isClaimed`)
- **Pagination**: Cursor-based pagination for receipt lists to handle large datasets

### Caching Strategy

- **Analytics Caching**: 5-minute TTL on computed analytics to reduce database load
- **Static Asset Caching**: Vite build with content hashing for long-term browser caching

### Horizontal Scaling Readiness

- **Stateless API**: JWT-based auth enables multi-instance deployment
- **Environment-based Config**: All secrets externalized for container orchestration
- **Health Check Endpoint**: Available for load balancer configuration

### Performance Optimizations

| Area | Implementation |
|------|----------------|
| Response Compression | gzip via `compression` middleware |
| Code Splitting | Vite dynamic imports for route-based chunks |
| Image Optimization | WebP format with fallbacks |
| Bundle Analysis | `vite-bundle-visualizer` for size monitoring |

---

## Roadmap

### Phase 1: MVP (Completed)

- [x] Customer and merchant authentication with OTP verification
- [x] Receipt CRUD operations with claim codes
- [x] Basic analytics dashboards
- [x] Receipt upload functionality
- [x] Dark mode implementation
- [x] Bilingual support (English/Hindi)

### Phase 2: Enhanced Features (In Progress)

- [ ] Push notifications for new receipts
- [ ] Receipt OCR for paper digitization
- [ ] Export to PDF/Excel
- [ ] Advanced filtering and search
- [ ] Batch receipt operations

### Phase 3: Scale and Enterprise

- [ ] POS integration SDK
- [ ] Merchant subscription tiers
- [ ] White-label solution
- [ ] React Native mobile apps
- [ ] Machine learning insights

---

## Contributing

We welcome contributions from the community. Please follow these guidelines:

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Commit** with conventional commits: `git commit -m "feat: add new feature"`
4. **Push** to your fork: `git push origin feature/your-feature-name`
5. **Open** a Pull Request with a clear description

### Code Standards

- **Linting**: ESLint with React recommended rules
- **Formatting**: Consistent indentation (2 spaces)
- **Naming**: camelCase for functions/variables, PascalCase for components
- **Comments**: JSDoc for utilities, inline comments for complex logic

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Testing Locally

```bash
# Run backend
cd backend && npm run dev

# Run frontend
cd frontend && npm run dev

# Build for production
cd frontend && npm run build
```

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**[Live Demo](https://green-recipt.vercel.app)** · **[Report Issue](https://github.com/24f3001062/greenreceipt/issues)** · **[Request Feature](https://github.com/24f3001062/greenreceipt/issues)**

</div>

