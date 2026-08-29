# Edu-Herbal Clinic - Backend Specification (`server.md`)

## 1. Tech Stack & Architecture

- **Runtime & Language**: Node.js 20+ LTS, TypeScript 5.x
- **Framework**: Express.js 4.x
- **Database & ORM**: PostgreSQL 15+, Prisma ORM (or Sequelize)
- **Auth & Security**: JWT, Bcrypt, Helmet, CORS, Rate-Limiting
- **Real-Time**: Socket.io (EduBot Live Handover & Call Centre sync)
- **Validation**: Zod
- **Deployment Target**: Render.com (Web Service + Managed PostgreSQL)

---

## 2. Directory Structure

```
Backend/
├── src/
│   ├── config/          # db, env, cors
│   ├── controllers/     # auth, patient, appointment, product, inventory, order, payment, call, chat, content, report, staff
│   ├── middlewares/     # auth, validation, rateLimit, errorHandler
│   ├── routes/          # express routers mounted under /api/*
│   ├── services/        # edubot engine, sms gateway, report generator
│   ├── sockets/         # websocket handlers for chat handover
│   ├── types/           # shared interfaces & DTOs
│   ├── utils/           # logger, phone normalizer (+233)
│   └── app.ts           # express app entry
├── prisma/
│   ├── schema.prisma    # prisma schema
│   └── seed.ts          # db seed
├── .env.example
├── package.json
├── tsconfig.json
└── render.yaml          # render deployment blueprint
```

---

## 3. REST API Endpoints Matrix

### 3.1. Authentication & Staff (`/api/auth`, `/api/staff`)
| Method | Endpoint | Access | Description | Key Body / Query |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Staff sign-in with 3-attempt lockout | `{ email, phone, password }` |
| `POST` | `/api/auth/signup` | Admin | Register staff member | `{ name, email, phone, password, role, department }` |
| `POST` | `/api/auth/reset-request`| Public | Request password reset | `{ email, phone }` |
| `POST` | `/api/auth/reset-confirm`| Public | Set new password (validates prefix & min length) | `{ email, phone, newPassword, confirmPassword }` |
| `GET` | `/api/auth/me` | Staff | Get logged-in user profile | Bearer Token |
| `GET` | `/api/staff` | Staff | List staff directory with status counts | Query: `?status=Present|Leave|Remote` |
| `PUT` | `/api/staff/:id/status` | Staff | Update staff duty status / schedule | `{ status, schedule }` |

---

### 3.2. Patients & CRM (`/api/patients`)
| Method | Endpoint | Access | Description | Key Body / Query |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/patients` | Staff | List/search patients grouped by status | Query: `?search=kwame&status=Active` |
| `GET` | `/api/patients/:id` | Staff | Get patient profile, history, balance | Param: `id` |
| `POST` | `/api/patients` | Staff | Create new patient record & first booking | `{ name, phone, condition, doctorId, date, time }` |
| `PUT` | `/api/patients/:id` | Staff | Update patient details / balance | `{ condition, status, balance, doctorId }` |
| `DELETE`| `/api/patients/:id` | Admin | Delete/archive patient record | Param: `id` |

---

### 3.3. Appointments & Doctors (`/api/appointments`, `/api/doctors`)
| Method | Endpoint | Access | Description | Key Body / Query |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/doctors` | Public | List doctors, specialties & time slots | None |
| `GET` | `/api/appointments` | Staff | List appointments with filters | Query: `?date=YYYY-MM-DD&status=Confirmed` |
| `GET` | `/api/appointments/today`| Staff | Get today's queue for Overview dashboard | None |
| `POST` | `/api/appointments` | Public/Staff | Book appointment, dispatches SMS | `{ service, doctorId, fullName, phone, email, notes, date, time }` |
| `PUT` | `/api/appointments/:id/status` | Staff | Update status | `{ status: "Pending"|"Confirmed"|"Completed"|"Cancelled" }` |
| `DELETE`| `/api/appointments/:id` | Staff | Cancel/delete appointment | Param: `id` |

---

### 3.4. Products, Cart & Inventory (`/api/products`, `/api/inventory`)
| Method | Endpoint | Access | Description | Key Body / Query |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Public | List herbal medicines catalogue | Query: `?category=Bitters` |
| `GET` | `/api/products/:id` | Public | Product detail | Param: `id` |
| `GET` | `/api/inventory` | Staff | Stock quantities, thresholds & low-stock flags | None |
| `POST` | `/api/inventory/restock`| Staff | Add stock units / update min level | `{ item, category, stock, min, unit }` |
| `GET` | `/api/inventory/low-stock`| Staff | List items below safety threshold (`< 35`) | None |

---

### 3.5. Orders, Sales & Payments (`/api/orders`, `/api/payments`)
| Method | Endpoint | Access | Description | Key Body / Query |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/orders/checkout` | Public/Patient | Cart checkout via MoMo / Telecel Cash | `{ items: [{ productId, quantity }], paymentMethod, recipientName, recipientNumber }` |
| `GET` | `/api/orders` | Staff | List orders & item breakdowns | Query: `?page=1&limit=20` |
| `GET` | `/api/sales/metrics` | Staff | Revenue KPIs (today, week, month, best day) | None |
| `GET` | `/api/sales/top-selling` | Staff | Top selling products ranking | None |
| `GET` | `/api/payments` | Staff | Payment transactions & payer details | Query: `?status=Paid` |
| `POST` | `/api/payments` | Public/Staff | Record payment transaction | `{ description, amount, method, recipientName, recipientNumber }` |

---

### 3.6. Call Centre & Telemedicine (`/api/calls`)
| Method | Endpoint | Access | Description | Key Body / Query |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/calls` | Staff | List call logs with call statistics | Query: `?search=...&type=incoming` |
| `POST` | `/api/call` | Staff | Log call / WhatsApp interaction | `{ patientName, phone, mode: "Phone"|"WhatsApp", attemptedAt }` |
| `PUT` | `/api/calls/:id/note` | Staff | Add/update call disposition note | `{ note: "..." }` |
| `PUT` | `/api/calls/:id/toggle-status`| Staff | Toggle `resolved` / `unresolved` | Param: `id` |
| `POST` | `/api/calls/:id/qr-scan` | Staff | Mark WhatsApp QR scanned | `{ patientName, phone }` |

---

### 3.7. EduBot AI Chat & Live Handover (`/api/chat`)
| Method | Endpoint | Access | Description | Key Body / Query |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/chat/auth` | Public | Verify patient name & Ghana phone | `{ name, phone }` |
| `GET` | `/api/chat/messages` | Public | Get patient conversation history | Query: `?phone=+233...` |
| `POST` | `/api/chat/send` | Public | Send message, auto-reply / handover | `{ phone, patientName, text }` |
| `GET` | `/api/chat/admin/conversations`| Staff | List all conversations & handover flags | None |
| `POST` | `/api/chat/admin/reply` | Staff | Staff direct reply to patient | `{ phone, patientName, text }` |
| `PUT` | `/api/chat/admin/handover/close`| Staff | Close human session, resume EduBot | `{ phone }` |
| `DELETE`| `/api/chat/admin/conversation/:phone`| Staff | Delete conversation | Param: `phone` |

---

### 3.8. CMS & Monthly Reports (`/api/content`, `/api/reports`)
| Method | Endpoint | Access | Description | Key Body / Query |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/content/hero-slides` | Public | Get active homepage hero slides | None |
| `PUT` | `/api/content/hero-slides` | Staff | Batch update hero carousel cards | `{ slides: [...] }` |
| `GET` | `/api/content/blog-posts` | Public | Get published clinic blog posts | None |
| `POST` | `/api/content/blog-posts` | Staff | Create new blog post | `{ title, category, date, readTime, excerpt, image }` |
| `PUT` | `/api/content/blog-posts/:id` | Staff | Update existing blog post | `{ title, category, date, readTime, excerpt, image }` |
| `DELETE`| `/api/content/blog-posts/:id` | Staff | Delete blog post | Param: `id` |
| `POST` | `/api/reports/monthly-close` | Staff | Generate month-end sales & stock close | None |
| `GET` | `/api/reports/monthly` | Staff | List monthly close reports history | None |
| `GET` | `/api/reports/monthly/:id/export` | Staff | Export single report as CSV | Param: `id` |
| `GET` | `/api/reports/monthly/export-all` | Staff | Export complete reports history CSV | None |

---

## 4. Security & Middlewares Summary

- **JWT Authentication**: `authenticateToken` middleware validates `Authorization: Bearer <token>` on protected routes.
- **Account Lockout**: 3 failed login attempts trigger `is_locked=true`, requiring email reset.
- **Zod Validation**: Rejects invalid payloads before hitting controllers.
- **Ghana Phone Normalizer**: Auto-converts input (`0241234567`) to E.164 standard (`+233241234567`).
- **CORS & Helmet**: Protects against cross-origin scripting and common web vulnerabilities.
- **Global Error Handler**: Returns structured `{ success: false, error: string, details?: any[] }`.

---

## 5. Render.com Deployment Blueprint

### Environment Variables
```env
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host/edu_herbal_db?sslmode=require
JWT_SECRET=your_production_jwt_secret
CORS_ORIGIN=*
```

### `render.yaml`
```yaml
services:
  - type: web
    name: edu-herbal-backend
    env: node
    plan: starter
    region: oregon
    buildCommand: npm install && npx prisma generate && npm run build
    startCommand: npm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: edu-herbal-postgres
          property: connectionString
      - key: JWT_SECRET
        generateValue: true

databases:
  - name: edu-herbal-postgres
    plan: starter
    region: oregon
    databaseName: edu_herbal_db
    user: edu_herbal_admin
```