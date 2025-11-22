# FlowTrack Backend API

Multi-tenant SaaS backend application built with NestJS, Prisma, and PostgreSQL.

## Features

- **Multi-tenant Architecture**: Workspace-based isolation with role-based access control
- **Authentication**: Clerk integration for secure JWT-based authentication
- **Type Safety**: Full TypeScript with Prisma ORM
- **API Documentation**: Auto-generated Swagger/OpenAPI docs
- **Database**: PostgreSQL with Prisma migrations
- **Job Queue**: BullMQ with Redis for async operations (ready for implementation)
- **Validation**: Class-validator with DTOs
- **Health Checks**: Built-in health monitoring endpoints

## Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma 7
- **Authentication**: Clerk
- **Job Queue**: BullMQ + Redis (infrastructure ready)
- **Validation**: class-validator + class-transformer
- **API Docs**: Swagger/OpenAPI
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Node.js 20+
- npm or yarn
- Docker & Docker Compose (for database)
- Clerk account (for authentication)

## Getting Started

### 1. Clone and Install

```bash
cd backend
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/flowtrack?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Clerk Authentication
CLERK_SECRET_KEY="your_clerk_secret_key"
CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"

# Email Service (for future implementation)
RESEND_API_KEY="your_resend_api_key"

# Application URLs
API_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:3001"

# Node Environment
NODE_ENV="development"
PORT=3000
```

### 3. Start Infrastructure

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379

### 4. Database Setup

Run Prisma migrations to create database tables:

```bash
npx prisma migrate dev --name init
```

Generate Prisma Client:

```bash
npx prisma generate
```

### 5. Start the Application

Development mode with hot reload:

```bash
npm run start:dev
```

The API will be available at:
- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/health

## Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── decorators/         # @User(), @Public()
│   ├── guards/             # ClerkAuthGuard
│   └── auth.service.ts     # User sync with Clerk
├── workspace/              # Workspace/tenant management
│   ├── dto/               # Data transfer objects
│   ├── workspace.service.ts
│   └── workspace.controller.ts
├── project/               # Project management
│   ├── dto/
│   ├── project.service.ts
│   └── project.controller.ts
├── task/                  # Task management
│   ├── dto/
│   ├── task.service.ts
│   └── task.controller.ts
├── prisma/               # Database module
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── common/               # Shared utilities
│   └── utils/
├── app.module.ts        # Root module
└── main.ts             # Application bootstrap
```

## API Endpoints

### Health & Status

- `GET /` - Root endpoint
- `GET /health` - Health check with database status

### Workspaces

- `GET /api/workspace` - List user's workspaces
- `POST /api/workspace` - Create new workspace
- `GET /api/workspace/:id` - Get workspace details
- `GET /api/workspace/:id/members` - List workspace members
- `POST /api/workspace/:id/invite` - Invite user to workspace

### Projects

- `GET /api/project?workspaceId=xxx` - List workspace projects
- `POST /api/project` - Create project
- `GET /api/project/:id` - Get project details
- `PUT /api/project/:id` - Update project
- `DELETE /api/project/:id` - Delete project (Admin only)

### Tasks

- `GET /api/task?projectId=xxx` - List project tasks
- `POST /api/task` - Create task
- `PUT /api/task/:id` - Update task
- `DELETE /api/task/:id` - Delete task

## Authentication

All endpoints (except health checks) require a Clerk JWT token in the Authorization header:

```
Authorization: Bearer <clerk_jwt_token>
```

### Protected Routes

By default, all routes are protected by the `ClerkAuthGuard`. To make a route public, use the `@Public()` decorator:

```typescript
@Public()
@Get('some-public-endpoint')
async publicEndpoint() {
  // ...
}
```

### Getting User Context

In protected routes, access the current user with the `@User()` decorator:

```typescript
@Get()
async getMyData(@User() user: UserPayload) {
  // user.authId contains the Clerk user ID
}
```

## Database Management

### Migrations

Create a new migration after schema changes:

```bash
npx prisma migrate dev --name description_of_changes
```

Apply migrations to production:

```bash
npx prisma migrate deploy
```

### Prisma Studio

Open Prisma Studio to view/edit data:

```bash
npx prisma studio
```

## Permission System

The application uses a workspace-based permission system:

- **ADMIN**: Full access, can invite users, delete projects
- **MEMBER**: Can create/edit resources within workspace
- **BILLING**: Limited access (placeholder for future billing features)

### Permission Checks

All operations automatically check workspace membership. Example flow:

1. User requests resource (e.g., project)
2. System finds which workspace owns the resource
3. System checks if user is a member of that workspace
4. If not a member → `403 Forbidden`
5. If member → operation proceeds

## Development

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Linting & Formatting

```bash
# Lint
npm run lint

# Format
npm run format
```

### Building for Production

```bash
npm run build
```

The compiled output will be in the `dist/` directory.

### Docker Production Build

Build the Docker image:

```bash
docker build -t flowtrack-backend .
```

Run with Docker Compose (production mode):

```bash
docker-compose -f docker-compose.yml up -d
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `CLERK_SECRET_KEY` | Clerk API secret key | - |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key | - |
| `RESEND_API_KEY` | Resend email API key | - |
| `API_URL` | Backend API URL | `http://localhost:3000` |
| `FRONTEND_URL` | Frontend app URL (for CORS) | `http://localhost:3001` |
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |

## Future Implementation

The following features are ready for implementation:

### Job Queue (BullMQ)

Infrastructure is set up. To implement:

1. Create `src/job-queue/` module
2. Configure BullMQ with Redis
3. Implement email worker for invitations
4. Add job producers in services

### Email System

1. Integrate Resend API
2. Create email templates
3. Queue email jobs via BullMQ
4. Handle email status callbacks

## Troubleshooting

### Database Connection Issues

Ensure PostgreSQL is running:

```bash
docker-compose ps
```

Test connection:

```bash
npx prisma db pull
```

### Prisma Client Issues

Regenerate the client:

```bash
npx prisma generate
```

### Port Already in Use

Change the port in `.env`:

```env
PORT=3001
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

Private - All rights reserved

## Support

For issues or questions, please contact the development team.
