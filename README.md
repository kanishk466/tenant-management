# Tenant Management

## Project overview

Tenant Management is an Express.js application built with Prisma and PostgreSQL. It provides tenant administration features for:
- user authentication with JWT access/refresh tokens
- hospital management
- system components and package management
- package assignment of components and limits

The app uses a modular folder structure: each domain has its own routes, controllers, and services.

## Folder structure

- `app.js` - application entry point
- `package.json` - npm scripts and dependencies
- `prisma/`
  - `schema.prisma` - Prisma schema defines database models and enums
  - `seed.js` - initial seed script for admin user and components
  - `migrations/` - Prisma migration history
- `src/config/`
  - `prisma.js` - exports Prisma client
  - `env.js` - placeholder config file currently not implemented
- `src/middleware/`
  - `auth.middleware.js` - JWT bearer authentication middleware
  - `error.middleware.js` - placeholder error middleware currently not implemented
- `src/modules/` - feature modules
  - `auth/` - authentication routes and services
  - `hospitals/` - hospital CRUD and status management
  - `components/` - system component CRUD and tree retrieval
  - `packages/` - package CRUD, component assignment, and limit management
- `src/routes/` - top-level route registration
- `src/utils/` - helpers for JWT and other utilities

## Core workflow

1. Start the app with environment variables configured.
2. Use the authentication API to log in and receive an access token and refresh token.
3. Provide the access token in `Authorization: Bearer <token>` for protected routes.
4. Manage hospitals, system components, and packages through modular endpoints.
5. Assign components and limits to packages as needed.
6. The database is managed with Prisma and PostgreSQL.

## Required environment variables

Create a `.env` file in the project root with values like:

```env
PORT=5000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d
```

### Notes
- `DATABASE_URL` must point to a PostgreSQL database.
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be strong secret values.
- `ACCESS_TOKEN_EXPIRES` and `REFRESH_TOKEN_EXPIRES` control JWT expiration.

## Setup steps

1. Install dependencies:

```bash
npm install
```

2. Create `.env` in the project root and set all required variables.

3. Generate Prisma client:

```bash
npx prisma generate
```

4. Apply Prisma schema to the database:

```bash
npx prisma migrate dev --name init
```

If you prefer to push the schema without migration history, use:

```bash
npx prisma db push
```

5. Seed initial data:

```bash
npm run seed
```

6. Start the development server:

```bash
npm run dev
```

Or start normally:

```bash
npm start
```

## Prisma workflow

- Update database models in `prisma/schema.prisma`.
- Run `npx prisma generate` after schema changes to refresh the client.
- Use `npx prisma migrate dev --name <description>` for schema migrations.
- Use `npm run seed` to insert seed data after migration.

## Available endpoints

### Health check
- `GET /health`

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Protected module routes (require `Authorization: Bearer <token>`)

#### Hospitals
- `POST /api/hospitals`
- `GET /api/hospitals`
- `GET /api/hospitals/:id`
- `PATCH /api/hospitals/:id`
- `PATCH /api/hospitals/:id/status`

#### Components
- `POST /api/components`
- `GET /api/components`
- `GET /api/components/tree`
- `GET /api/components/:id`
- `PATCH /api/components/:id`

#### Packages
- `POST /api/packages`
- `GET /api/packages`
- `GET /api/packages/:id`
- `PATCH /api/packages/:id`
- `PATCH /api/packages/:id/status`
- `POST /api/packages/:id/components`
- `GET /api/packages/:id/components`
- `POST /api/packages/:id/limits`
- `GET /api/packages/:id/limits`

## Authentication flow

1. Log in using `POST /api/auth/login` with email and password.
2. Receive `accessToken` and `refreshToken`.
3. Send the access token in the request header for protected routes:

```http
Authorization: Bearer <accessToken>
```

4. Refresh access tokens with `POST /api/auth/refresh`.
5. Log out with `POST /api/auth/logout`.

## Prisma schema highlights

The Prisma schema defines models for:
- `PlatformUser` and `RefreshToken`
- `Hospital`
- `SystemComponent`
- `Package`, `PackageComponent`, `PackageLimit`
- `AssignedPackage`

This schema supports package-based access control, component assignment, package limits, and hospital package assignments.

## Seed data

The seed script creates:
- a super admin user: `admin@his.com` / `Admin@123`
- a set of default system components such as `PATIENTS`, `APPOINTMENTS`, `DOCTORS`, `BILLING`, `LAB`, `INVENTORY`, and `REPORTS`

## Notes for future development

- `src/config/env.js` is currently a placeholder and not implemented.
- `src/middleware/error.middleware.js` is currently a placeholder and not attached in `app.js`.
- Error handling is currently delegated to Express default behavior, so adding a global error handler would improve API response consistency.

## Useful commands

```bash
npm install
npm run dev
npm start
npm run seed
npx prisma generate
npx prisma migrate dev --name init
npx prisma db push
```

## Quick start summary

1. `npm install`
2. Create `.env`
3. `npx prisma generate`
4. `npx prisma migrate dev --name init`
5. `npm run seed`
6. `npm run dev`

---

Built for tenant-management by the development team.
