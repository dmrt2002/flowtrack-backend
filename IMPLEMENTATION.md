# NestJS Backend Starter Pack: Technical Implementation Document

This document details the complete technical architecture and implementation plan for a modern, scalable backend application. It is intended for the backend (NestJS) development team.

## 1. Core Architecture & Data Models

### 1.1 Tech Stack Summary

This stack is chosen for type-safety, developer productivity, and scalability.

**Backend**

- Framework: NestJS  
- Language: TypeScript  
- Database ORM: Prisma  
- Job Queue: BullMQ (requires Redis)  
- API: REST (with OpenAPI/Swagger documentation via NestJS)

**Database**

- Primary: PostgreSQL  
- Cache/Queue: Redis (for BullMQ and caching)

**Infrastructure & Services**

- Authentication: Clerk (handles user management, JWTs) or Passport.js (for custom JWT/OAuth)  
- Email: Resend or Postmark (for transactional emails like invites and password resets)  
- Validation: Zod (integrated with NestJS `ValidationPipe`)  
- Containerization: Docker

### 1.2 Database Schemas (Prisma)

This schema represents a robust, generic foundation for a multi-tenant SaaS application.

```prisma
// This schema defines a generic SaaS foundation

// 1. User Model: Managed by Clerk or your auth provider.
// We only store the reference ID.
model User {
  id        String @id @default(cuid())
  // The unique ID from your auth provider (e.g., Clerk)
  authId    String @unique
  email     String @unique
  name      String?
  
  // The user's role in various workspaces
  memberships Membership[]
  
  createdAt DateTime @default(now())
}

// 2. Workspace Model: The top-level "tenant" or "organization"
model Workspace {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique // For URLs
  
  // The users who belong to this workspace
  members   Membership[]
  // The core resources belonging to this workspace
  projects  Project[]
  
  createdAt DateTime @default(now())
}

// 3. Membership Model: The join table between User and Workspace
// This is critical for managing roles and permissions.
model Membership {
  id          String   @id @default(cuid())
  role        String   // e.g., "ADMIN", "MEMBER", "BILLING"
  
  user        User     @relation(fields: [userId], references: [id])
  userId      String
  
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId String
  
  createdAt   DateTime  @default(now())
  
  @@unique([userId, workspaceId]) // A user can only join a workspace once
}

// 4. Project Model: A generic "resource" owned by a workspace.
// This could be "Documents", "Posts", "Products", etc.
model Project {
  id          String   @id @default(cuid())
  name        String
  
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId String
  
  // A project can have sub-resources
  tasks       Task[]
  
  createdAt   DateTime @default(now())
}

// 5. Task Model: A generic "sub-resource"
model Task {
  id          String   @id @default(cuid())
  title       String
  isComplete  Boolean  @default(false)
  
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String
  
  createdAt   DateTime @default(now())
}
```

## 2. Core Backend Modules & Services

This section details the primary NestJS modules that form the application's foundation.

### 2.1 AuthModule (Authentication & Authorization)

**Purpose**  
Secures all protected endpoints and provides user context.

**Components**

- `AuthGuard`: A global or route-level guard. It validates the `Authorization: Bearer <token>` header using the Clerk SDK (or Passport.js). If valid, it attaches the `authId` and user payload to the request object.
- `User` decorator: A custom parameter decorator (`@User() user: UserPayload`) that extracts the user payload from the request for easy use in controllers.

**Core Logic**

1. Frontend sends a JWT in the Authorization header.  
2. The `AuthGuard` intercepts the request.  
3. It validates the JWT. On failure, it returns a `401 Unauthorized`.  
4. On success, it fetches the minimal `User` profile from the database (using the `authId` from the token) and attaches it to `request.user`.

### 2.2 WorkspaceModule (Tenant Management)

**Purpose**  
Handles creation of workspaces and management of user memberships.

**API Endpoints (Example)**

- `GET /api/workspace`: Get all workspaces the current user is a member of.  
- `POST /api/workspace`: Create a new workspace.  
- `POST /api/workspace/{id}/invite`: Invite a new user to the workspace.  
- `GET /api/workspace/{id}/members`: Get all members of a specific workspace.

**Core Logic (`POST /api/workspace`)**

1. Uses `@UseGuards(AuthGuard)`.  
2. Receives `{ name: "New Workspace" }` in the body.  
3. `WorkspaceService` creates two records in a Prisma transaction:  
   - A new `Workspace` (e.g., name: "New Workspace", slug: "new-workspace").  
   - A new `Membership` linking the current `request.user.id` to the new `workspace.id` with the role `ADMIN`.  
4. Returns the new workspace object.

### 2.3 ProjectModule (Core Business Logic - Example)

**Purpose**  
Handles the primary CRUD (Create, Read, Update, Delete) operations for the app's main resource.

**API Endpoints (Example)**

- `GET /api/project?workspaceId={id}`: Get all projects for a given workspace.  
- `POST /api/project`: Create a new project.  
- `GET /api/project/{id}`: Get a single project.  
- `PUT /api/project/{id}`: Update a project.

**Core Logic (Permission Check)**

Every service method must check permissions.

Example `getProjectById(userId: string, projectId: string)`:

1. Find the project: `prisma.project.findUnique({ where: { id: projectId } })`.  
2. If not found, throw `NotFoundException`.  
3. Check permission: `prisma.membership.findUnique({ where: { userId_workspaceId: { userId, workspaceId: project.workspaceId } } })`.  
4. If no membership is found, throw `ForbiddenException` (the user is not part of the workspace that owns this project).  
5. If found, return the project.

### 2.4 JobQueueModule (Async Operations)

**Purpose**  
Offloads slow or external-facing tasks (like sending emails) from the main API thread to keep responses fast.

**Components (using BullMQ)**

- `JobProducerService`: An injectable service used by other modules (like `WorkspaceModule`) to add jobs to the queue.  
- `EmailConsumer`: A worker process (defined as a NestJS `Processor`) that listens for jobs on the email queue.

**Example Flow (`POST /api/workspace/{id}/invite`)**

1. The `WorkspaceController` receives the invite request `{ email: "new@user.com" }`.  
2. It calls the `WorkspaceService` to create a `Membership` record with a `pending` status.  
3. It then calls `jobProducerService.addEmailJob('send-invite', { email: "new@user.com", workspaceName: "..." })`.  
4. The API returns `201 Created` immediately.  
5. Separately, the `EmailConsumer` (worker) picks up the job, connects to Resend, and sends the actual invitation email.

**Why**  
This makes the API resilient. If the Resend API is down, the job can be retried automatically without the user's API request failing.

## 3. Key Technology Choices & Libraries (Detailed)

- **Framework: NestJS**  
  Provides a robust, modular architecture out of the box. Its DI system and TypeScript-first approach make code highly testable and maintainable.

- **Database & ORM: PostgreSQL & Prisma**  
  Prisma provides unparalleled type-safety between the database and NestJS services. Its migration system (`prisma migrate`) is simple and powerful. PostgreSQL is a reliable open-source relational database.

- **Authentication: Clerk**  
  Fastest way to get a secure, production-ready auth system. Handles sign-up, sign-in, MFA, social logins, and JWT management. The `clerk-sdk-node` integrates easily into a NestJS `AuthGuard`.

- **Job Queue: BullMQ (on Redis)**  
  The engine for all asynchronous tasks, ensuring the API stays fast. BullMQ is the modern standard built on Redis.

- **Validation: Zod**  
  Provides human-readable, type-safe validation. Use `zod-nestjs` or a custom `ValidationPipe` to automatically validate all incoming DTOs at the controller level, rejecting bad requests before they hit service logic.

- **Containerization: Docker**  
  Ensures a consistent environment from local development to production. `docker-compose.yml` spins up the entire stack (Postgres, Redis, and the NestJS app) with a single command.





