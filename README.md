# Edu-Herbal Clinic Backend API

Production REST API and real-time backend service for Edu-Herbal Clinic.

## Tech Stack
- **Runtime**: Node.js 20+ LTS
- **Framework**: Express.js
- **Language**: TypeScript
- **Database & ORM**: PostgreSQL 15+ & Prisma ORM
- **Authentication**: JWT & Bcrypt
- **Real-Time**: Socket.io
- **Hosting**: Render.com

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and configure:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL="your-postgresql-connection-string"
JWT_SECRET="your-jwt-secret"
CORS_ORIGIN="*"
```

### 3. Generate Prisma Client & Seed Database
```bash
npx prisma generate
npx prisma db push
npm run prisma:seed
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Run Automated Test Suite
```bash
npm run test:api
```

## Postman Collection
Import `postman/Edu-Herbal-API.postman_collection.json` into Postman to test all endpoints.
