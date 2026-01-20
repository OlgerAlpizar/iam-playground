# IAM Provider - Use Cases

This document describes all authentication and authorization use cases implemented in this service.

---

## Table of Contents

1. [Registration](#1-registration)
2. [Email Verification](#2-email-verification)
3. [Login](#3-login)
4. [Account Linking](#4-account-linking)
5. [Passkeys (WebAuthn)](#5-passkeys-webauthn)
6. [Password Management](#6-password-management)
7. [Token Management](#7-token-management)
8. [Account Lifecycle](#8-account-lifecycle)
9. [Third-Party Integration](#9-third-party-integration)
10. [Rate Limiting](#10-rate-limiting)
11. [Authentication Requirements](#authentication-requirements)

---

## 1. Registration

### 1.1 Email + Password Registration

Users can register with email and password.

```
POST /api/v1/auth/register
```

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "John Doe",
  "verificationCallbackUrl": "http://localhost:3000/verify-email"
}
```

**Behavior:**

- Creates user with `isEmailVerified: false`
- Sets `verificationDeadline` based on `EMAIL_VERIFICATION_TOKEN_EXPIRES_HOURS`
- Sends verification email if `verificationCallbackUrl` is provided
- Returns JWT tokens immediately (but login will be blocked until verified)

### 1.2 OAuth Registration (PassportJS)

Users can register via social providers (Google, GitHub).

```
GET /api/v1/oauth/google
GET /api/v1/oauth/github
```

**Behavior:**

- Redirects to provider's OAuth flow
- On callback, creates user if not exists
- OAuth users have `isEmailVerified: true` (provider verified)
- Returns JWT tokens

---

## 2. Email Verification

### 2.1 Verification Flow

1. User registers → receives email with verification link
2. User clicks link → frontend extracts token
3. Frontend calls verification endpoint
4. Account is marked as verified

```
GET /api/v1/auth/verify-email?token=<jwt_token>
```

**Response:**

```json
{
  "message": "Email verified successfully",
  "user": { "id": "...", "email": "...", "isEmailVerified": true }
}
```

### 2.2 Resend Verification

```
POST /api/v1/auth/resend-verification
```

```json
{
  "email": "user@example.com",
  "verificationCallbackUrl": "http://localhost:3000/verify-email"
}
```

### 2.3 Unverified Account Auto-Deletion

- Unverified accounts have a `verificationDeadline`
- MongoDB TTL index automatically deletes accounts after deadline
- Configurable via `EMAIL_VERIFICATION_TOKEN_EXPIRES_HOURS` (default: 24h)

---

## 3. Login

### 3.1 Email + Password Login

```
POST /api/v1/auth/login
```

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Validations (in order):**

1. User exists and has password
2. Account not pending deletion
3. Account not locked
4. Password is valid
5. **Email is verified** ← Blocks login if not verified

**Response:**

```json
{
  "user": { ... },
  "accessToken": "eyJ...",
  "refreshToken": "...",
  "expiresIn": 900
}
```

### 3.2 OAuth Login

Same as OAuth registration - if user exists, just logs in.

### 3.3 Passkey Login

```
POST /api/v1/passkeys/login/options
POST /api/v1/passkeys/login/verify
```

### 3.4 Login Errors

| Error                      | Status | Cause                    |
| -------------------------- | ------ | ------------------------ |
| `INVALID_CREDENTIALS`      | 401    | Wrong email/password     |
| `ACCOUNT_LOCKED`           | 423    | Too many failed attempts |
| `ACCOUNT_PENDING_DELETION` | 403    | Account is deactivated   |
| `EMAIL_NOT_VERIFIED`       | 403    | Email not verified       |

### 3.5 Account Lockout

- After `MAX_FAILED_LOGIN_ATTEMPTS` (default: 5) failed attempts
- Account is locked for `LOCKOUT_DURATION_MINUTES` (default: 15)
- Successful login resets counter

---

## 4. Account Linking

### 4.1 Auto-Link on OAuth

When a user logs in via OAuth and an account with the same email exists:

- OAuth provider is automatically linked to existing account
- User can now login with either method

### 4.2 Add Password to OAuth Account

OAuth-only users can add a password:

```
POST /api/v1/auth/set-password
Authorization: Bearer <token>
```

```json
{
  "password": "newPassword123"
}
```

**Error:** `PASSWORD_ALREADY_SET` (409) if user already has password.

### 4.3 Link Additional OAuth Providers

> **Note:** Manual linking of additional OAuth providers requires frontend implementation that stores the JWT and passes it through the OAuth flow. The auto-link on login (4.1) handles most use cases.

### 4.4 Unlink OAuth Provider

```
DELETE /api/v1/oauth/:provider/:providerId
```

**Restriction:** Cannot unlink if it's the only auth method.

---

## 5. Passkeys (WebAuthn)

### 5.1 Register Passkey

```
POST /api/v1/passkeys/register/options   ← Get challenge
POST /api/v1/passkeys/register/verify    ← Submit credential
```

**Requires:** Authenticated user

### 5.2 Login with Passkey

```
POST /api/v1/passkeys/login/options      ← Get challenge (by email)
POST /api/v1/passkeys/login/verify       ← Submit assertion
```

**Requires:** No auth (public endpoints)

### 5.3 Manage Passkeys

```
GET /api/v1/passkeys                     ← List user's passkeys
DELETE /api/v1/passkeys/:credentialId    ← Remove passkey
```

### 5.4 Challenge Storage

- Challenges stored in **Redis** (production) with 5min TTL
- Falls back to **in-memory** if Redis unavailable
- Configurable via `REDIS_URL`

---

## 6. Password Management

### Password Requirements

All new passwords must meet the following complexity requirements:

| Requirement        | Description                                     |
| ------------------ | ----------------------------------------------- |
| Minimum length     | 8 characters                                    |
| Maximum length     | 128 characters                                  |
| Uppercase          | At least one uppercase letter (A-Z)             |
| Lowercase          | At least one lowercase letter (a-z)             |
| Numbers            | At least one digit (0-9)                        |
| Special characters | At least one special character (!@#$%^&\* etc.) |

**Example valid password:** `MyP@ssw0rd!`

**Validation errors:**

```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": [
    { "path": "password", "message": "Password must contain at least one uppercase letter" }
  ]
}
```

> **Note:** For login and reactivation, existing passwords are not re-validated against complexity rules (legacy support).

### 6.1 Set Password (OAuth users)

Add password to OAuth-only account.

```
POST /api/v1/auth/set-password
Authorization: Bearer <token>
```

```json
{
  "password": "newPassword123"
}
```

### 6.2 Change Password

Change existing password (requires current password).

```
POST /api/v1/auth/change-password
Authorization: Bearer <token>
```

```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

### 6.3 Forgot Password

Users who forgot their password can request a reset email.

#### Step 1: Request Reset Email

```
POST /api/v1/auth/forgot-password
```

```json
{
  "email": "user@example.com",
  "resetCallbackUrl": "http://localhost:3000/reset-password"
}
```

**Response:**

```json
{
  "message": "If the email exists and has a password, a reset email was sent"
}
```

**Behavior:**

- Does NOT reveal if email exists (security)
- Throws `PASSWORD_NOT_ENABLED` (400) if user is OAuth-only
- Only sends email if account is active
- Token expires based on `PASSWORD_RESET_TOKEN_EXPIRES_HOURS` (default: 1h)

#### Step 2: Reset Password

```
POST /api/v1/auth/reset-password
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "newPassword": "newSecurePassword456"
}
```

**Response:**

```json
{
  "message": "Password reset successfully",
  "user": { "id": "...", "email": "..." }
}
```

**Behavior:**

- Validates token (signature, expiration, purpose)
- Updates password hash
- Resets failed login attempts and lockout

**Errors:**

- `PASSWORD_NOT_ENABLED` (400) - OAuth-only account (no password to reset)
- `TOKEN_EXPIRED` (401) - Reset link expired
- `TOKEN_INVALID` (401) - Invalid or tampered token
- `USER_NOT_FOUND` (404) - User no longer exists

---

## 7. Token Management

### 7.1 Token Types

| Token              | Lifetime | Storage          |
| ------------------ | -------- | ---------------- |
| Access Token (JWT) | 15 min   | Client only      |
| Refresh Token      | 7 days   | MongoDB + Client |

### 7.2 Session Limit

The system enforces a **single active session per user**. When a user logs in:

1. System checks count of active sessions
2. If user already has an active session, it is revoked
3. New session is created

**Behavior:**

- Login from a new device → previous session invalidated
- Token refresh → same session continues (no invalidation)
- Applies to all login methods (email/password, OAuth, passkeys)

This ensures:

- ✅ Only one device can be logged in at a time
- ✅ Automatic logout of previous sessions on new login
- ✅ Protection against credential sharing

### 7.3 Refresh Tokens

```
POST /api/v1/auth/refresh
```

```json
{
  "refreshToken": "..."
}
```

**Features:**

- Token rotation (old token invalidated on use)
- Token family tracking (detects reuse attacks)
- Device fingerprinting

### 7.5 Logout

```
POST /api/v1/auth/logout
```

```json
{
  "refreshToken": "..."
}
```

### 7.6 Logout All Devices

```
POST /api/v1/auth/logout-all
Authorization: Bearer <token>
```

**Response:**

```json
{
  "revokedSessions": 5
}
```

Revokes all refresh tokens for the user.

### 7.7 Session Management

Users can view and revoke their active sessions.

#### List Active Sessions

```
GET /api/v1/auth/sessions
Authorization: Bearer <token>
```

**Response:**

```json
{
  "sessions": [
    {
      "id": "507f1f77bcf86cd799439011",
      "deviceFingerprint": "abc123...",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
      "ipAddress": "192.168.1.1",
      "createdAt": "2026-01-19T10:00:00.000Z",
      "expiresAt": "2026-01-26T10:00:00.000Z",
      "isCurrent": false
    }
  ],
  "total": 1
}
```

#### Revoke Specific Session

```
DELETE /api/v1/auth/sessions/:sessionId
Authorization: Bearer <token>
```

**Response:** `204 No Content`

**Use cases:**

- User sees unknown device → revoke that session
- User lost a device → revoke session remotely
- Security audit → review active sessions

### 7.8 Token Introspection

For third-party tenants to validate tokens:

```
POST /api/v1/auth/introspect
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (valid):**

```json
{
  "active": true,
  "sub": "user-id",
  "email": "user@example.com",
  "exp": 1737312000,
  "iat": 1737311100
}
```

**Response (invalid):**

```json
{
  "active": false
}
```

---

## 8. Account Lifecycle

### 8.1 Account States

```
┌──────────────┐     verify      ┌──────────────┐
│   Pending    │ ──────────────► │    Active    │
│ (unverified) │                 │  (verified)  │
└──────────────┘                 └──────────────┘
       │                                │
       │ TTL expires                    │ deactivate
       ▼                                ▼
┌──────────────┐                 ┌──────────────┐
│   DELETED    │ ◄────────────── │   Inactive   │
│  (hard)      │   TTL expires   │ (soft delete)│
└──────────────┘                 └──────────────┘
                                        │
                                        │ reactivate
                                        ▼
                                 ┌──────────────┐
                                 │    Active    │
                                 └──────────────┘
```

### 8.2 Soft Delete (Deactivation)

Users can deactivate their own account:

```
POST /api/v1/auth/deactivate
Authorization: Bearer <token>
```

**Response:**

```json
{
  "message": "Account deactivated successfully",
  "user": { "id": "...", "email": "...", "isActive": false },
  "deletionDeadline": "2026-02-18T10:30:00.000Z"
}
```

**Behavior:**

- `isActive` set to `false`
- `deletionDeadline` set based on `INACTIVE_ACCOUNT_RETENTION_DAYS`
- All sessions are revoked
- User cannot login but account exists

### 8.3 Reactivation

Inactive accounts can be reactivated before `deletionDeadline`:

```
POST /api/v1/auth/reactivate
```

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 8.4 Hard Delete

- MongoDB TTL index deletes accounts after `deletionDeadline`
- Automatic, no application code needed

### 8.5 Inactive Account Login Attempt

If user tries to login with inactive account:

```json
{
  "error": "ACCOUNT_PENDING_DELETION",
  "message": "Account is scheduled for deletion on 2026-02-18T10:30:00.000Z",
  "deletionDate": "2026-02-18T10:30:00.000Z"
}
```

---

## 9. Third-Party Integration

### 9.1 Token Validation for Tenants

Third-party applications can validate user tokens:

```
POST /api/v1/auth/introspect
```

This allows tenants to:

- Verify user is authenticated
- Get user identity (sub, email)
- Check token expiration

### 9.2 Logout Propagation

When user logs out from IAM:

- All refresh tokens are revoked
- Access tokens remain valid until expiration (15 min max)
- Tenants should implement short token validation intervals

---

## User Profile

### Get Current User

Authenticated users can retrieve their own profile information.

```
GET /api/v1/auth/me
Authorization: Bearer <token>
```

**Response:**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "isAdmin": false,
  "isEmailVerified": true,
  "displayName": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "avatarUrl": "https://example.com/avatar.jpg",
  "isActive": true,
  "createdAt": "2026-01-19T10:00:00.000Z",
  "updatedAt": "2026-01-19T10:00:00.000Z"
}
```

---

## Security Notifications

The system sends automatic email notifications for security-sensitive events:

### Password Changed Notification

Sent when a user changes their password (via change-password or reset-password).

**Triggers:**

- `POST /auth/change-password` - User changes password with current password
- `POST /auth/reset-password` - User resets password via email link

**Email content:**

- Confirms password was changed
- Warns user to take action if they didn't make the change
- Suggests resetting password and reviewing account activity

### Account Deactivated Notification

Sent when a user deactivates their own account.

**Trigger:**

- `POST /auth/deactivate` - User soft-deletes their account

**Email content:**

- Confirms account deactivation
- Shows the permanent deletion deadline
- Explains how to reactivate before deadline

### Implementation Notes

- Notifications are sent asynchronously (non-blocking)
- Failures are logged but don't affect the main operation
- In development without SMTP, emails are logged to console

---

## Admin Access

### Admin Flag

Users have an `isAdmin` boolean field that defaults to `false`. Admin users can access the user management endpoints.

### Admin Assignment

Admin status must be assigned manually via database:

```javascript
db.users.updateOne({ email: 'admin@example.com' }, { $set: { isAdmin: true } });
```

### JWT Token Payload

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "isAdmin": false,
  "iat": 1737311100,
  "exp": 1737312000
}
```

---

## Error Reference

| Code                         | Status | Description                           |
| ---------------------------- | ------ | ------------------------------------- |
| `USER_NOT_FOUND`             | 404    | User does not exist                   |
| `DUPLICATE_EMAIL`            | 409    | Email already registered              |
| `INVALID_CREDENTIALS`        | 401    | Wrong email/password                  |
| `ACCOUNT_LOCKED`             | 423    | Too many failed login attempts        |
| `ACCOUNT_PENDING_DELETION`   | 403    | Account is deactivated                |
| `EMAIL_NOT_VERIFIED`         | 403    | Email not verified                    |
| `TOKEN_EXPIRED`              | 401    | JWT/refresh token expired             |
| `TOKEN_INVALID`              | 401    | Invalid token                         |
| `VERIFICATION_TOKEN_EXPIRED` | 410    | Email verification link expired       |
| `VERIFICATION_TOKEN_INVALID` | 400    | Invalid verification token            |
| `PASSWORD_ALREADY_SET`       | 409    | User already has password             |
| `PASSWORD_NOT_ENABLED`       | 400    | OAuth-only account (no password)      |
| `RATE_LIMIT_EXCEEDED`        | 429    | Too many requests                     |
| `FORBIDDEN`                  | 403    | Insufficient permissions (role-based) |

---

## 10. Rate Limiting

### 10.1 Global API Limit

All API endpoints are subject to a global rate limit:

- **100 requests** per **10 minutes** per device/IP
- Higher limits in development (10x)

### 10.2 Authentication Rate Limit

Sensitive authentication endpoints have stricter limits:

- **10 attempts** per **10 minutes** per email/device
- Successful requests don't count against the limit
- Applies to: login, register, forgot-password, reset-password, reactivate

**Rate-limited endpoints:**

| Endpoint                         | Limiter         |
| -------------------------------- | --------------- |
| `POST /auth/register`            | Auth (10/10min) |
| `POST /auth/login`               | Auth (10/10min) |
| `POST /auth/forgot-password`     | Auth (10/10min) |
| `POST /auth/reset-password`      | Auth (10/10min) |
| `POST /auth/reactivate`          | Auth (10/10min) |
| `POST /auth/resend-verification` | Auth (10/10min) |
| `POST /passkeys/login/options`   | Auth (10/10min) |
| `POST /passkeys/login/verify`    | Auth (10/10min) |
| All other endpoints              | API (100/10min) |

### 10.3 Rate Limit Response

When rate limit is exceeded:

```json
{
  "error": "Too many authentication attempts, please try again later.",
  "retryAfter": 342
}
```

**HTTP Status:** `429 Too Many Requests`

**Headers:**

- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining
- `RateLimit-Reset`: Unix timestamp when limit resets

---

## Authentication Requirements

### Admin Endpoints (require JWT + Admin Role)

| Endpoint                  | Method | Description                                     |
| ------------------------- | ------ | ----------------------------------------------- |
| `/users`                  | GET    | Search/list users (with filters and pagination) |
| `/users`                  | POST   | Create user                                     |
| `/users/:id`              | GET    | Get user by ID                                  |
| `/users/:id`              | PATCH  | Update user                                     |
| `/users/:id`              | DELETE | Delete user                                     |
| `/users/:id/verify-email` | POST   | Manually verify user email                      |
| `/users/:id/deactivate`   | POST   | Deactivate user account                         |
| `/users/:id/reactivate`   | POST   | Reactivate user account                         |

### Protected Endpoints (require JWT)

| Endpoint                     | Method | Description                      |
| ---------------------------- | ------ | -------------------------------- |
| `/auth/me`                   | GET    | Get current user profile         |
| `/auth/set-password`         | POST   | Add password to OAuth account    |
| `/auth/change-password`      | POST   | Change existing password         |
| `/auth/logout-all`           | POST   | Logout from all devices          |
| `/auth/deactivate`           | POST   | Deactivate own account           |
| `/auth/sessions`             | GET    | List active sessions             |
| `/auth/sessions/:id`         | DELETE | Revoke specific session          |
| `/passkeys/register/options` | POST   | Get passkey registration options |
| `/passkeys/register/verify`  | POST   | Verify passkey registration      |
| `/passkeys`                  | GET    | List user's passkeys             |
| `/passkeys/:id`              | DELETE | Remove passkey                   |
| `/oauth/:provider/:id`       | DELETE | Unlink OAuth provider            |

### Public Endpoints

| Endpoint                    | Method | Rate Limited       |
| --------------------------- | ------ | ------------------ |
| `/auth/register`            | POST   | ✅ Auth (10/10min) |
| `/auth/login`               | POST   | ✅ Auth (10/10min) |
| `/auth/refresh`             | POST   | ❌                 |
| `/auth/logout`              | POST   | ❌                 |
| `/auth/verify-email`        | GET    | ❌                 |
| `/auth/resend-verification` | POST   | ✅ Auth (10/10min) |
| `/auth/reactivate`          | POST   | ✅ Auth (10/10min) |
| `/auth/forgot-password`     | POST   | ✅ Auth (10/10min) |
| `/auth/reset-password`      | POST   | ✅ Auth (10/10min) |
| `/auth/introspect`          | POST   | ❌                 |
| `/passkeys/login/options`   | POST   | ✅ Auth (10/10min) |
| `/passkeys/login/verify`    | POST   | ✅ Auth (10/10min) |
| `/oauth/google`             | GET    | ❌                 |
| `/oauth/github`             | GET    | ❌                 |

---

## Configuration Reference

| Variable                                 | Default               | Description                            |
| ---------------------------------------- | --------------------- | -------------------------------------- |
| `JWT_SECRET`                             | -                     | Secret for signing JWTs (required)     |
| `JWT_ACCESS_TOKEN_EXPIRES_IN_SECONDS`    | 900                   | Access token lifetime                  |
| `JWT_REFRESH_TOKEN_EXPIRES_IN_SECONDS`   | 604800                | Refresh token lifetime                 |
| `EMAIL_VERIFICATION_TOKEN_EXPIRES_HOURS` | 24                    | Verification email validity            |
| `PASSWORD_RESET_TOKEN_EXPIRES_HOURS`     | 1                     | Password reset link validity           |
| `INACTIVE_ACCOUNT_RETENTION_DAYS`        | 30                    | Days before deleting inactive accounts |
| `MAX_FAILED_LOGIN_ATTEMPTS`              | 5                     | Attempts before lockout                |
| `LOCKOUT_DURATION_MINUTES`               | 15                    | Lockout duration                       |
| `REDIS_URL`                              | -                     | Redis for challenge storage (optional) |
| `WEBAUTHN_RP_ID`                         | localhost             | WebAuthn relying party ID              |
| `WEBAUTHN_ORIGIN`                        | http://localhost:3000 | WebAuthn origin                        |

---

_Last updated: January 2026_
