# Authentication System Cleanup - Summary

**Date:** 2025-11-22
**Version:** 2.0

## Overview

Complete refactoring of the authentication system to use a single unified guard with cookie-based JWT authentication and comprehensive logging.

---

## Issues Fixed

### 1. **Email Service SMTP Configuration**
- **Problem:** SSL version mismatch error - using wrong TLS config for port 587
- **Solution:** Auto-detect SSL vs STARTTLS based on port number
  - Port 587 → `secure: false` (STARTTLS)
  - Port 465 → `secure: true` (SSL/TLS)

### 2. **Too Many Guards**
- **Problem:** 4 different guards (Local, JWT, Hybrid, Clerk) causing confusion
- **Solution:** Single `UnifiedAuthGuard` that handles:
  1. Cookie-based JWT authentication (primary)
  2. Clerk OAuth authentication (fallback)
  3. Public route detection

### 3. **Bearer Token Confusion**
- **Problem:** Guards looking for Authorization header when app uses httpOnly cookies
- **Solution:** UnifiedAuthGuard only reads from `req.cookies.accessToken`

### 4. **Missing Debug Logs**
- **Problem:** No visibility into cookie setting/reading
- **Solution:** Added comprehensive logging:
  - 🍪 Cookie set/clear operations
  - 📧 Email service initialization
  - 🔐 JWT validation
  - ✅ Auth success/failure
  - ❌ Error details

### 5. **/auth/me Infinite Loops**
- **Problem:** Auth failures causing page refresh loops
- **Solution:** Proper 401 handling with clear error messages

---

## Changes Made

### Files Deleted
```
✗ src/auth/guards/local-auth.guard.ts
✗ src/auth/guards/jwt-auth.guard.ts
✗ src/auth/guards/hybrid-auth.guard.ts
✗ src/auth/strategies/local.strategy.ts
```

### Files Created
```
✓ src/auth/guards/unified-auth.guard.ts (186 lines)
✓ docs/authentication/AUTH_CLEANUP_SUMMARY.md (this file)
```

### Files Modified
```
✓ src/auth/services/email.service.ts
  - Fixed SMTP config for port 587 (STARTTLS)
  - Added emoji logs

✓ src/auth/auth.controller.ts
  - Removed LocalAuthGuard, JwtAuthGuard references
  - Added UnifiedAuthGuard
  - Added cookie setting/reading logs
  - Inline credential validation in /login (no more LocalAuthGuard)
  - Enhanced /auth/me with debug logs

✓ src/auth/auth.module.ts
  - Removed LocalStrategy, JwtStrategy, LocalAuthGuard, JwtAuthGuard
  - Registered UnifiedAuthGuard as APP_GUARD
  - Removed PassportModule (no longer needed)
  - Changed JWT expiry to 6h (matches cookie maxAge)

✓ src/auth/guards/index.ts
  - Removed old guard exports
  - Export only UnifiedAuthGuard and ClerkAuthGuard

✓ src/auth/strategies/index.ts
  - Removed LocalStrategy export

✓ src/modules/onboarding/onboarding.controller.ts
  - Changed HybridAuthGuard → UnifiedAuthGuard
```

---

## UnifiedAuthGuard Logic

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  // 1. Check @Public() decorator
  if (isPublic) return true;

  // 2. Try cookie-based JWT (PRIMARY)
  const cookieToken = req.cookies?.accessToken;
  if (cookieToken) {
    // Verify JWT signature
    // Fetch user from database
    // Check email verification (for local auth)
    // Attach user to req.user
    return true;
  }

  // 3. Try Clerk (FALLBACK)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Verify with Clerk
    // Get or create user in database
    // Attach user to req.user
    return true;
  }

  // 4. Both failed
  throw UnauthorizedException('Authentication required');
}
```

---

## Authentication Flow

### Native Auth (Cookie-Based)

1. **Register/Login**
   ```
   POST /auth/register or /auth/login
   → Validate credentials
   → Generate JWT (6 hours)
   → Set httpOnly cookie
   → Return user + tokens
   ```

2. **Authenticated Requests**
   ```
   GET /auth/me (or any protected route)
   → UnifiedAuthGuard reads cookie
   → Verifies JWT
   → Fetches user from DB
   → Attaches to req.user
   → Controller returns user
   ```

3. **Logout**
   ```
   POST /auth/logout
   → Clear cookie
   → Return success
   ```

### Clerk Auth (Fallback)

1. **Client Flow**
   ```
   Frontend → Clerk OAuth → Get Clerk token
   Frontend → Send to API with Authorization: Bearer <token>
   ```

2. **Backend Flow**
   ```
   UnifiedAuthGuard → Verify with Clerk
   → Auto-create user if doesn't exist
   → Attach to req.user
   ```

---

## Logging Output Examples

### Cookie Set (Register/Login)
```
[AuthController] 🍪 Setting accessToken cookie for user: user@example.com
[AuthController] 🍪 Cookie set successfully with maxAge: 6 hours
```

### Cookie Read (/auth/me)
```
[AuthController] 📥 /auth/me called - Cookie present: true
[UnifiedAuthGuard] 🍪 Found accessToken cookie, validating JWT...
[UnifiedAuthGuard] 🔐 JWT valid for user: uuid-here
[UnifiedAuthGuard] ✅ Native auth successful for: user@example.com
[AuthController] ✅ /auth/me success for user: user@example.com
```

### Auth Failure
```
[UnifiedAuthGuard] 🍪 No accessToken cookie found
[UnifiedAuthGuard] 🔍 Attempting Clerk authentication...
[UnifiedAuthGuard] ❌ Clerk authentication failed: No authorization header
[UnifiedAuthGuard] ❌ Authentication failed - no valid cookie or Clerk token
```

### Email Service
```
[EmailService] 📧 Email service initialized with SMTP: smtp.mailtrap.io:587 (STARTTLS)
[EmailService] Password reset email sent to: user@example.com
[EmailService] 🔗 Reset URL: http://localhost:3001/reset-password?token=abc123
```

---

## Configuration

### Required Environment Variables
```env
# JWT (for native auth)
JWT_SECRET="your-secret-key"

# SMTP (for emails)
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=587               # Uses STARTTLS
SMTP_USER="your-user"
SMTP_PASS="your-pass"

# Clerk (for OAuth)
CLERK_SECRET_KEY="sk_test_..."  # Optional if only using native auth

# URLs
APP_URL="http://localhost:3001"
```

---

## Testing

### 1. Test Native Registration
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test"
  }' \
  -c cookies.txt
```

### 2. Test /auth/me with Cookie
```bash
curl -X GET http://localhost:3000/auth/me \
  -b cookies.txt
```

### 3. Test Logout
```bash
curl -X POST http://localhost:3000/auth/logout \
  -b cookies.txt
```

---

## Migration Guide (for existing code)

If you have controllers using old guards:

### Before
```typescript
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { HybridAuthGuard } from '../../auth/guards/hybrid-auth.guard';

@UseGuards(JwtAuthGuard)  // or HybridAuthGuard
export class MyController {}
```

### After
```typescript
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';

@UseGuards(UnifiedAuthGuard)
export class MyController {}
```

**Note:** Since UnifiedAuthGuard is registered as APP_GUARD, you actually don't need `@UseGuards()` on most controllers - it's applied globally. Only use `@Public()` decorator for public routes.

---

## Benefits

1. **Simplified Architecture**
   - 1 guard instead of 4
   - Clear, linear authentication flow
   - Easy to understand and maintain

2. **Better Debugging**
   - Comprehensive logs at every step
   - Easy to trace auth issues
   - Clear error messages

3. **Improved Security**
   - httpOnly cookies (XSS protection)
   - No token exposure in JavaScript
   - Proper error handling (no infinite loops)

4. **Better Performance**
   - Single guard execution
   - No unnecessary strategy overhead
   - Efficient cookie-based auth

---

## Troubleshooting

### Issue: /auth/me returns 401

**Check logs for:**
```
[AuthController] 📥 /auth/me called - Cookie present: false
```

**Solution:** Cookie not being set or sent. Check:
1. Cookie is set on register/login (look for 🍪 logs)
2. Browser is sending cookies (check Network tab)
3. CORS/SameSite configuration

### Issue: Email not sending

**Check logs for:**
```
[EmailService] ⚠️  SMTP configuration incomplete
```

**Solution:** Configure SMTP environment variables

### Issue: Infinite refresh loop

**Check logs for:**
```
[UnifiedAuthGuard] ❌ Authentication failed
```

**Solution:** UnifiedAuthGuard now throws proper 401 - frontend should redirect to /login, not refresh

---

## Next Steps

1. **Frontend Integration**
   - Update to handle httpOnly cookies
   - Remove Bearer token logic
   - Handle 401 by redirecting to /login

2. **Testing**
   - Test all auth flows (register, login, /me, logout)
   - Verify email sending works
   - Test Clerk OAuth flow

3. **Monitoring**
   - Watch logs for auth patterns
   - Monitor cookie setting/reading
   - Check for 401 errors

---

## Support

For issues or questions:
- Check logs (they're very detailed now!)
- Review this document
- Check docs/authentication/AUTHENTICATION.md
