# FlowTrack Authentication System

**Version:** 1.1
**Last Updated:** 2025-11-22

## Overview

FlowTrack implements a **dual authentication system** supporting both:

1. **Clerk OAuth** - Social login (Google, GitHub, etc.) via Clerk
2. **Native Email/Password** - Traditional authentication with email verification

Both authentication methods can coexist, allowing users to choose their preferred login method.

## Table of Contents

- [Architecture](#architecture)
- [Authentication Flows](#authentication-flows)
- [Clerk OAuth Integration](#clerk-oauth-integration)
- [Native Auth API Endpoints](#native-auth-api-endpoints)
- [Security Features](#security-features)
- [Configuration](#configuration)
- [Implementation Details](#implementation-details)
- [Frontend Integration Guide](#frontend-integration-guide)
- [Testing](#testing)

---

## Architecture

### Tech Stack

- **Password Hashing:** Argon2id (memory: 64MB, time: 3, parallelism: 4)
- **JWT Tokens:** @nestjs/jwt with 15-minute access tokens
- **Refresh Tokens:** 7-day tokens with rotation and SHA-256 hashing
- **Email:** SMTP (configurable provider)
- **Validation:** Zod schemas (per .cursorrules)
- **Guards:** Passport.js strategies (Local, JWT, Clerk, Hybrid)

### Services

| Service | Purpose |
|---------|---------|
| `AuthService` | Core authentication logic |
| `PasswordService` | Argon2id password hashing/verification |
| `TokenService` | JWT and refresh token management |
| `EmailService` | Verification and password reset emails |
| `RateLimitService` | Login attempt tracking and rate limiting |

### Guards

| Guard | Use Case |
|-------|----------|
| `LocalAuthGuard` | Email/password login endpoint |
| `JwtAuthGuard` | Protected endpoints (native auth only) |
| `ClerkAuthGuard` | Clerk OAuth authentication |
| `HybridAuthGuard` | Accepts both Clerk and native JWT |

---

## Authentication Flows

### 1. Native Registration Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant DB
    participant Email

    User->>API: POST /auth/register (email, password)
    API->>API: Validate with Zod schema
    API->>API: Hash password (Argon2id)
    API->>API: Generate verification token
    API->>DB: Create user (emailVerifiedAt = null)
    API->>Email: Send verification email
    API-->>User: 201 Created (check your email)

    User->>Email: Click verification link
    User->>API: GET /auth/verify-email?token=xxx
    API->>DB: Update emailVerifiedAt
    API->>Email: Send welcome email
    API-->>User: 200 OK (email verified)
```

### 2. Native Login Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant DB

    User->>API: POST /auth/login (email, password)
    API->>DB: Check rate limiting (5 attempts/15min)
    API->>DB: Find user by email
    API->>API: Verify password (Argon2)
    API->>DB: Check email verification
    API->>DB: Record successful login
    API->>API: Generate access token (15min JWT)
    API->>API: Generate refresh token (7 days)
    API->>DB: Store hashed refresh token
    API-->>User: 200 OK (tokens + user data)
```

### 3. Token Refresh Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB

    Client->>API: POST /auth/refresh (refreshToken)
    API->>API: Hash incoming token (SHA-256)
    API->>DB: Find token in database
    API->>DB: Check expiry & revocation
    API->>DB: Revoke old token
    API->>API: Generate new refresh token
    API->>DB: Store new hashed token
    API->>API: Generate new access token
    API-->>Client: 200 OK (new tokens)
```

### 4. Password Reset Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant DB
    participant Email

    User->>API: POST /auth/forgot-password (email)
    API->>DB: Find user
    API->>API: Generate reset token
    API->>DB: Store token (1 hour expiry)
    API->>Email: Send reset email
    API-->>User: 200 OK (check your email)

    User->>Email: Click reset link
    User->>API: POST /auth/reset-password (token, newPassword)
    API->>DB: Verify token & expiry
    API->>API: Hash new password (Argon2id)
    API->>DB: Update password
    API->>DB: Mark token as used
    API->>DB: Revoke all refresh tokens
    API-->>User: 200 OK (login with new password)
```

---

## Clerk OAuth Integration

### Overview

Clerk handles the entire OAuth flow on the frontend. The backend only needs to:
1. Verify Clerk JWT tokens
2. Create/sync users in the database
3. Return user data

### How Clerk Works

1. **Frontend:** User clicks "Sign in with Google/GitHub"
2. **Clerk:** Handles OAuth flow and returns a session token
3. **Frontend:** Sends Clerk token to backend API
4. **Backend:** Verifies token with Clerk, creates/syncs user
5. **Backend:** Returns user data to frontend

### Clerk Backend Endpoints

All protected endpoints automatically accept Clerk tokens via `ClerkAuthGuard` (global guard).

#### Authentication Flow

```typescript
// Frontend sends Clerk token in Authorization header
Authorization: Bearer <clerk_session_token>

// Backend automatically:
// 1. Verifies token with Clerk
// 2. Extracts userId from token
// 3. Creates/syncs user in database
// 4. Attaches user to request
```

#### GET /api/user (or any protected endpoint)
When using Clerk authentication, the first API call with a Clerk token will:
- Verify the token with Clerk
- Fetch user data from Clerk
- Create user in database if doesn't exist
- Sync user data if exists
- Return user data

**Headers:**
```
Authorization: Bearer <clerk_session_token>
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "clerkUserId": "user_2abc123xyz",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "avatarUrl": "https://img.clerk.com/...",
  "authProvider": "clerk",
  "emailVerifiedAt": "2025-11-22T10:30:00Z",
  "createdAt": "2025-11-22T10:30:00Z"
}
```

### Clerk Frontend Setup

#### 1. Install Clerk SDK

```bash
npm install @clerk/clerk-react
# or
npm install @clerk/nextjs  # for Next.js
```

#### 2. Environment Variables

```env
# Frontend .env
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
# or
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
```

#### 3. Provider Setup (React)

```tsx
// App.tsx
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';

function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <SignedOut>
        <SignInPage />
      </SignedOut>
      <SignedIn>
        <Dashboard />
      </SignedIn>
    </ClerkProvider>
  );
}
```

#### 4. Sign In Component

```tsx
// SignInPage.tsx
import { SignIn } from '@clerk/clerk-react';

export function SignInPage() {
  return (
    <div>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
      />
    </div>
  );
}
```

#### 5. Making API Calls with Clerk Token

```tsx
import { useAuth } from '@clerk/clerk-react';

function Dashboard() {
  const { getToken } = useAuth();

  async function fetchUserData() {
    const token = await getToken();

    const response = await fetch('http://localhost:3000/api/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const user = await response.json();
    console.log(user);
  }

  return <button onClick={fetchUserData}>Load Profile</button>;
}
```

### Clerk Webhooks (Optional)

For real-time user sync, configure Clerk webhooks:

**Webhook URL:** `https://your-domain.com/api/webhooks/clerk`

**Events to subscribe:**
- `user.created`
- `user.updated`
- `user.deleted`

**Backend Handler:**
```typescript
// webhooks/clerk.controller.ts
@Post('webhooks/clerk')
async handleClerkWebhook(@Body() payload: any, @Headers('svix-signature') signature: string) {
  // Verify webhook signature
  // Call authService.syncUserFromClerk(userId)
}
```

### Public Routes with Clerk

Use the `@Public()` decorator to bypass Clerk authentication:

```typescript
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Get('health')
async health() {
  return { status: 'ok' };
}
```

---

## Native Auth API Endpoints

### Public Endpoints

#### POST /auth/register
Register a new user with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",      // optional
  "lastName": "Doe"         // optional
}
```

**Validation:**
- Email: Valid format, lowercase, trimmed
- Password: 8-128 chars, must contain uppercase, lowercase, and number
- Names: 1-50 chars, trimmed

**Response (201 Created):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "authProvider": "local",
    "createdAt": "2025-11-22T10:30:00Z"
  },
  "message": "Registration successful. Please check your email to verify your account."
}
```

**Errors:**
- `409 Conflict`: Email already registered
- `400 Bad Request`: Validation failed

---

#### POST /auth/login
Login with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "avatarUrl": null,
    "authProvider": "local"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "expiresAt": "2025-11-22T11:30:00Z"
}
```

**Errors:**
- `401 Unauthorized`: Invalid credentials or email not verified
- `429 Too Many Requests`: Rate limit exceeded (5 attempts/15min)

---

#### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "x9y8z7w6v5u4...",
  "expiresAt": "2025-11-29T10:30:00Z"
}
```

**Errors:**
- `401 Unauthorized`: Invalid, expired, or revoked token

---

#### POST /auth/forgot-password
Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If the email exists, a password reset link has been sent."
}
```

**Note:** Always returns 200 OK to prevent email enumeration attacks.

---

#### POST /auth/reset-password
Reset password using token from email.

**Request:**
```json
{
  "token": "a1b2c3d4e5f6...",
  "password": "NewSecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successful. Please login with your new password."
}
```

**Side Effects:**
- All refresh tokens are revoked (forces re-login on all devices)

**Errors:**
- `401 Unauthorized`: Invalid, expired, or used token
- `400 Bad Request`: Password validation failed

---

#### GET /auth/verify-email?token=xxx
Verify email address.

**Query Parameters:**
- `token` (required): Verification token from email

**Response (200 OK):**
```json
{
  "message": "Email verified successfully. You can now login."
}
```

**Side Effects:**
- Welcome email is sent

**Errors:**
- `400 Bad Request`: Invalid or expired token

---

#### POST /auth/resend-verification
Resend verification email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If the email exists, a verification link has been sent."
}
```

**Errors:**
- `400 Bad Request`: Email already verified

---

### Protected Endpoints

#### GET /auth/me
Get current user info.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "avatarUrl": null,
  "authProvider": "local",
  "emailVerifiedAt": "2025-11-22T10:30:00Z",
  "createdAt": "2025-11-22T10:00:00Z"
}
```

**Errors:**
- `401 Unauthorized`: Invalid or expired access token

---

#### POST /auth/logout
Logout user (revoke refresh token).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

#### POST /auth/logout-all
Logout from all devices.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "message": "Logged out from all devices successfully"
}
```

**Side Effects:**
- All user's refresh tokens are revoked

---

## Security Features

### 1. Password Security

- **Algorithm:** Argon2id (winner of Password Hashing Competition)
- **Configuration:**
  - Memory Cost: 65536 KB (64 MB)
  - Time Cost: 3 iterations
  - Parallelism: 4 threads
- **Validation:**
  - Minimum 8 characters
  - Maximum 128 characters
  - Must contain uppercase, lowercase, and number

### 2. Token Security

#### Access Tokens (JWT)
- **Expiry:** 15 minutes
- **Algorithm:** HS256
- **Claims:** `userId`, `email`
- **Storage:** Client-side (memory/localStorage)

#### Refresh Tokens
- **Expiry:** 7 days
- **Storage:** Database (SHA-256 hashed)
- **Rotation:** New token issued on each refresh
- **Metadata:** IP address, user agent tracked
- **Revocation:** Single token or all user tokens

### 3. Rate Limiting

- **Failed Login Attempts:** 5 attempts per 15 minutes
- **Tracking:** By email + IP address
- **Storage:** `login_attempts` table
- **Response:** Returns remaining attempts and reset time

### 4. Email Verification

- **Required:** Users cannot login without verified email
- **Token Expiry:** 24 hours
- **Token Format:** 32-byte cryptographically random hex string
- **Resend:** Available if initial email not received

### 5. Password Reset

- **Token Expiry:** 1 hour
- **Single Use:** Token marked as used after reset
- **Side Effect:** All refresh tokens revoked (forces re-login)

### 6. Security Best Practices

- ✅ No email enumeration (forgot password always returns 200)
- ✅ Login attempt tracking with timestamps
- ✅ Refresh token rotation (prevents reuse attacks)
- ✅ Password changed timestamp tracking
- ✅ IP address and user agent logging
- ✅ SHA-256 hashing for refresh tokens in database
- ✅ Zod validation for all inputs

---

## Configuration

### Environment Variables

```bash
# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# SMTP Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM_EMAIL="noreply@flowtrack.app"
SMTP_FROM_NAME="FlowTrack"

# Application URLs
APP_URL="http://localhost:3001"

# Clerk (for OAuth)
CLERK_SECRET_KEY="sk_test_..."
CLERK_PUBLISHABLE_KEY="pk_test_..."
```

### SMTP Providers

#### Gmail
```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="app-password"  # Generate at myaccount.google.com/apppasswords
```

#### SendGrid
```bash
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
```

#### AWS SES
```bash
SMTP_HOST="email-smtp.us-east-1.amazonaws.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-ses-smtp-username"
SMTP_PASS="your-ses-smtp-password"
```

---

## Implementation Details

### Database Models

#### User Model Extensions
```prisma
model User {
  // Native auth fields
  authProvider           AuthProvider @default(local)
  passwordHash           String?      // For local auth
  passwordChangedAt      DateTime?
  emailVerificationToken String?
  emailVerificationExpiry DateTime?

  // Clerk fields (optional for dual auth)
  clerkUserId            String?      @unique

  // Relations
  refreshTokens          RefreshToken[]
  passwordResetTokens    PasswordResetToken[]
}

enum AuthProvider {
  clerk
  local
}
```

#### PasswordResetToken
```prisma
model PasswordResetToken {
  id        String    @id @default(uuid())
  userId    String
  token     String    @unique
  expiresAt DateTime
  isUsed    Boolean   @default(false)
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### RefreshToken
```prisma
model RefreshToken {
  id        String    @id @default(uuid())
  userId    String
  token     String    @unique  // SHA-256 hash
  expiresAt DateTime
  isRevoked Boolean   @default(false)
  revokedAt DateTime?
  userAgent String?
  ipAddress String?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### LoginAttempt
```prisma
model LoginAttempt {
  id            String   @id @default(uuid())
  email         String   @db.Citext
  ipAddress     String
  userAgent     String?
  wasSuccessful Boolean  @default(false)
  failureReason String?
  createdAt     DateTime @default(now())

  @@index([email, createdAt(sort: Desc)])
  @@index([ipAddress, createdAt(sort: Desc)])
}
```

### Passport Strategies

#### LocalStrategy
```typescript
// Used by LocalAuthGuard for email/password login
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  validate(req, email, password) {
    // Calls AuthService.validateLocalUser()
    // Checks rate limiting, verifies password, checks email verification
  }
}
```

#### JwtStrategy
```typescript
// Used by JwtAuthGuard for protected endpoints
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  validate(payload: JwtPayload) {
    // Verifies JWT signature and expiry
    // Loads user from database
    // Checks email verification for local auth users
  }
}
```

### Zod Validation Schemas

```typescript
// Register
export const registerSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string()
    .min(8)
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  firstName: z.string().min(1).max(50).trim().optional(),
  lastName: z.string().min(1).max(50).trim().optional(),
});

// Login
export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});
```

---

## Testing

### Manual Testing with cURL

#### Register
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

#### Refresh Token
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token-here"
  }'
```

#### Get Current User
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer your-access-token-here"
```

### Test Scenarios

1. **Registration**
   - ✅ Valid registration creates user
   - ✅ Duplicate email returns 409
   - ✅ Weak password returns 400
   - ✅ Verification email is sent

2. **Login**
   - ✅ Valid credentials return tokens
   - ✅ Unverified email returns 401
   - ✅ Invalid password returns 401
   - ✅ Rate limiting after 5 failed attempts

3. **Token Refresh**
   - ✅ Valid refresh token returns new tokens
   - ✅ Old refresh token is revoked
   - ✅ Expired token returns 401
   - ✅ Revoked token returns 401

4. **Password Reset**
   - ✅ Valid email sends reset link
   - ✅ Invalid token returns 401
   - ✅ Expired token returns 401
   - ✅ Used token returns 401
   - ✅ All refresh tokens revoked after reset

---

## Frontend Integration Guide

### Complete React Integration Example

#### 1. Project Setup

```bash
# Create React app (or use existing)
npm create vite@latest flowtrack-frontend -- --template react-ts

# Install dependencies
cd flowtrack-frontend
npm install @clerk/clerk-react axios react-router-dom
```

#### 2. Environment Configuration

```env
# .env
VITE_API_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

#### 3. API Client Setup

```typescript
// src/lib/api.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor (for native auth)
api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);

          // Retry original request
          error.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return axios(error.config);
        } catch (refreshError) {
          // Refresh failed, logout
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
```

#### 4. Authentication Context (Native Auth)

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  authProvider: 'local' | 'clerk';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  }

  async function register(email: string, password: string, firstName?: string, lastName?: string) {
    const { data } = await api.post('/auth/register', {
      email,
      password,
      firstName,
      lastName,
    });
    // Don't auto-login, user needs to verify email first
    return data;
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
    localStorage.clear();
    setUser(null);
  }

  async function refreshUser() {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      localStorage.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

#### 5. Dual Auth Provider (Clerk + Native)

```typescript
// src/App.tsx
import { ClerkProvider, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { AuthProvider } from './contexts/AuthContext';
import { Router } from './Router';

function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </ClerkProvider>
  );
}

export default App;
```

#### 6. Login Page (Dual Auth)

```tsx
// src/pages/LoginPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignIn } from '@clerk/clerk-react';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const [mode, setMode] = useState<'clerk' | 'native'>('clerk');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleNativeLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Sign in to FlowTrack</h2>
        </div>

        {/* Toggle between Clerk and Native */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setMode('clerk')}
            className={`flex-1 py-2 rounded ${mode === 'clerk' ? 'bg-white shadow' : ''}`}
          >
            Social Login
          </button>
          <button
            onClick={() => setMode('native')}
            className={`flex-1 py-2 rounded ${mode === 'native' ? 'bg-white shadow' : ''}`}
          >
            Email/Password
          </button>
        </div>

        {mode === 'clerk' ? (
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/register"
            afterSignInUrl="/dashboard"
          />
        ) : (
          <form onSubmit={handleNativeLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Sign In
            </button>

            <div className="text-center text-sm">
              <a href="/forgot-password" className="text-blue-600 hover:underline">
                Forgot password?
              </a>
            </div>
          </form>
        )}

        <div className="text-center text-sm">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
}
```

#### 7. Register Page

```tsx
// src/pages/RegisterPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      await register(email, password, firstName, lastName);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow text-center">
          <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
          <p className="text-gray-600">
            We've sent a verification link to <strong>{email}</strong>.
            Please verify your email before logging in.
          </p>
          <a href="/login" className="mt-4 inline-block text-blue-600 hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center mb-8">Create Account</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              minLength={8}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 8 characters with uppercase, lowercase, and number
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Account
          </button>
        </form>

        <div className="text-center text-sm mt-4">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
```

#### 8. Protected Route Component

```tsx
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { isSignedIn, isLoaded } = useClerkAuth();

  if (!isLoaded || isLoading) {
    return <div>Loading...</div>;
  }

  // Allow access if either native auth or Clerk auth is active
  if (!user && !isSignedIn) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}
```

#### 9. Hybrid API Hook (Works with Both Auth Methods)

```tsx
// src/hooks/useHybridApi.ts
import { useAuth } from '../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import axios from 'axios';

export function useHybridApi() {
  const { user: nativeUser } = useAuth();
  const { getToken } = useClerkAuth();

  async function makeRequest(endpoint: string, options: any = {}) {
    const API_URL = import.meta.env.VITE_API_URL;

    let token: string | null = null;

    if (nativeUser) {
      // Use native auth token
      token = localStorage.getItem('accessToken');
    } else {
      // Use Clerk token
      token = await getToken();
    }

    return axios({
      url: `${API_URL}${endpoint}`,
      ...options,
      headers: {
        ...options.headers,
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
  }

  return { makeRequest };
}
```

#### 10. Usage Example

```tsx
// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { useHybridApi } from '../hooks/useHybridApi';

export function Dashboard() {
  const { makeRequest } = useHybridApi();
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    async function loadWorkspaces() {
      const { data } = await makeRequest('/workspaces', { method: 'GET' });
      setWorkspaces(data);
    }
    loadWorkspaces();
  }, []);

  return (
    <div>
      <h1>My Workspaces</h1>
      {workspaces.map((workspace: any) => (
        <div key={workspace.id}>{workspace.name}</div>
      ))}
    </div>
  );
}
```

### Authentication State Management Summary

| Method | Token Storage | Auto-Refresh | Best For |
|--------|---------------|--------------|----------|
| **Clerk** | Managed by Clerk SDK | Yes (automatic) | Quick setup, OAuth providers |
| **Native** | localStorage | Yes (axios interceptor) | Full control, custom UI |
| **Hybrid** | Both | Yes (both methods) | Maximum flexibility |

### Security Best Practices (Frontend)

1. **Never store sensitive data in localStorage** (only tokens)
2. **Use HTTPS in production** to prevent token interception
3. **Implement token refresh** before access token expires
4. **Clear tokens on logout** and redirect to login
5. **Validate user input** before sending to API
6. **Handle 401 errors** gracefully (auto-logout)
7. **Use environment variables** for API URLs and keys

---

## Troubleshooting

### Email Not Sending

**Issue:** Verification/reset emails not received

**Solutions:**
1. Check SMTP credentials in `.env`
2. For Gmail, generate app password at `myaccount.google.com/apppasswords`
3. Check spam folder
4. Verify `APP_URL` is correct (used in email links)
5. Check server logs for email errors

### Rate Limiting Too Strict

**Issue:** Getting rate limited during development

**Solution:**
```typescript
// src/auth/services/rate-limit.service.ts
private readonly MAX_ATTEMPTS = 10;      // Increase for dev
private readonly WINDOW_MINUTES = 30;    // Increase for dev
```

### JWT Secret Not Set

**Issue:** `JWT_SECRET is not configured`

**Solution:**
```bash
# Add to .env
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
```

### Database Connection Issues

**Issue:** `Can't reach database server`

**Solution:**
```bash
docker-compose up -d postgres
```

---

## Future Enhancements

- [ ] Two-factor authentication (TOTP)
- [ ] Social login (Google, GitHub) via Passport
- [ ] Magic link authentication (passwordless)
- [ ] Session management UI (view/revoke active sessions)
- [ ] Password strength meter on frontend
- [ ] Account deletion with data export
- [ ] Audit log for security events

---

## License

Copyright © 2025 FlowTrack. All rights reserved.
