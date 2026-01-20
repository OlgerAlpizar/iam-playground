# Pending Frontend Features

> This document tracks backend features that require corresponding frontend implementations.

---

## 🔐 Email Verification

### How It Works

The frontend controls the verification callback URL. When registering or resending verification, the frontend provides the URL where the verification link should redirect.

### Backend Endpoints

#### 1. Register (with verification)

```
POST /api/v1/auth/register
```

**Request:**

```json
{
  "email": "user@example.com",
  "password": "...",
  "verificationCallbackUrl": "http://localhost:3000/verify-email" // Frontend decides
}
```

**Response (development):**

```json
{
  "user": { "id": "...", "email": "...", "isEmailVerified": false },
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 900,
  "debug": {
    "verificationUrl": "http://localhost:3000/verify-email?token=abc123..."
  }
}
```

> Note: `debug` field only appears in non-production environments.

#### 2. Verify Email

```
GET /api/v1/auth/verify-email?token=xxx
```

**Response:**

```json
{
  "message": "Email verified successfully",
  "user": { "id": "...", "email": "...", "isEmailVerified": true }
}
```

#### 3. Resend Verification

```
POST /api/v1/auth/resend-verification
```

**Request:**

```json
{
  "email": "user@example.com",
  "verificationCallbackUrl": "http://localhost:3000/verify-email"
}
```

**Response (development):**

```json
{
  "message": "If the email exists and is not verified, a verification email was sent",
  "debug": {
    "verificationUrl": "http://localhost:3000/verify-email?token=abc123..."
  }
}
```

### Frontend Requirements

1. **Route:** `/verify-email` (or whatever URL you pass as `verificationCallbackUrl`)

2. **Flow:**

   - Extract `token` from URL query params
   - Call backend API: `GET /api/v1/auth/verify-email?token=${token}`
   - Display result based on response

3. **UI States:**

   | State               | Display                                |
   | ------------------- | -------------------------------------- |
   | Loading             | "Verificando tu email..."              |
   | Success             | "✅ Email verificado!" + Link to login |
   | Token Invalid (400) | "❌ Link inválido" + Link to resend    |
   | Token Expired (410) | "❌ Link expirado" + Link to resend    |

### Error Responses

**Token Invalid (400):**

```json
{
  "error": "VERIFICATION_TOKEN_INVALID",
  "message": "Invalid verification token"
}
```

**Token Expired (410):**

```json
{
  "error": "VERIFICATION_TOKEN_EXPIRED",
  "message": "Verification token has expired"
}
```

---

## 📝 Notes

- Frontend controls the callback URL - backend doesn't need to know frontend routes
- `debug.verificationUrl` only appears in development/test environments
- If `verificationCallbackUrl` is not provided, no email is sent (useful for testing)
- Token expires in 24 hours (configurable via `EMAIL_VERIFICATION_TOKEN_EXPIRES_HOURS`)

---

## 🔄 Account Reactivation

When a user's account is deactivated (soft deleted), they have a grace period to reactivate it.

### Flow

1. User tries to login with deactivated account
2. Backend returns `403 ACCOUNT_PENDING_DELETION` with `deletionDate`
3. Frontend shows: "Your account is scheduled for deletion on {date}. Do you want to reactivate it?"
4. User confirms → call reactivation endpoint

### Backend Endpoint

```
POST /api/v1/auth/reactivate
```

**Request:**

```json
{
  "email": "user@example.com",
  "password": "user-password"
}
```

**Response (success):**

```json
{
  "user": { "id": "...", "email": "...", "isActive": true },
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 900
}
```

### Error Response (account pending deletion - during login)

```json
{
  "error": "ACCOUNT_PENDING_DELETION",
  "message": "Account is scheduled for deletion on 2026-02-18T10:30:00.000Z",
  "deletionDate": "2026-02-18T10:30:00.000Z"
}
```

### Configuration

- `INACTIVE_ACCOUNT_RETENTION_DAYS`: Days before permanent deletion (default: 30)

---

## 🔒 Forgot Password / Reset Password

Allows users to reset their password via email.

### Flow

1. User clicks "Forgot Password?" on login page
2. User enters email → call forgot-password endpoint
3. If valid, user receives email with reset link
4. User clicks link → redirected to frontend reset page
5. Frontend extracts token → calls reset-password endpoint

### Backend Endpoints

#### 1. Request Password Reset

```
POST /api/v1/auth/forgot-password
```

**Request:**

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

> Note: Response is intentionally vague for security (doesn't reveal if email exists).

**Response (development):**

```json
{
  "message": "If the email exists and has a password, a reset email was sent",
  "debug": {
    "resetUrl": "http://localhost:3000/reset-password?token=abc123..."
  }
}
```

#### 2. Reset Password

```
POST /api/v1/auth/reset-password
```

**Request:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "newPassword": "newSecurePassword123"
}
```

**Response:**

```json
{
  "message": "Password reset successfully",
  "user": { "id": "...", "email": "..." }
}
```

### Frontend Requirements

1. **Routes:**

   - `/forgot-password` - Form to enter email
   - `/reset-password` - Form to enter new password (receives token via query param)

2. **Forgot Password Page:**

   ```jsx
   // Form with email input
   // On submit: POST /api/v1/auth/forgot-password
   // Show: "If the email is registered, you'll receive a reset link"
   ```

3. **Reset Password Page:**

   ```jsx
   // Extract token: const token = new URLSearchParams(location.search).get('token')
   // Form with new password input
   // On submit: POST /api/v1/auth/reset-password { token, newPassword }
   ```

4. **UI States:**

   | State               | Display                                  |
   | ------------------- | ---------------------------------------- |
   | Forgot form         | Email input + Submit                     |
   | Forgot submitted    | "Check your email for reset link"        |
   | Reset form          | Password input + Submit                  |
   | Reset success       | "✅ Password changed!" + Link to login   |
   | Token invalid (401) | "❌ Link inválido" + Link to request new |
   | Token expired (401) | "❌ Link expirado" + Link to request new |

### Error Responses

**Password Not Enabled (400):**

```json
{
  "error": "PASSWORD_NOT_ENABLED",
  "message": "This account does not have password authentication enabled"
}
```

> This error occurs when an OAuth-only user tries to reset password. Frontend should suggest using social login instead.

**Token Invalid (401):**

```json
{
  "error": "TOKEN_INVALID",
  "message": "Invalid token"
}
```

**Token Expired (401):**

```json
{
  "error": "TOKEN_EXPIRED",
  "message": "Token has expired"
}
```

### Configuration

- `PASSWORD_RESET_TOKEN_EXPIRES_HOURS`: Link validity (default: 1 hour)

### Security Notes

- Token is single-use (not enforced by backend, but password change invalidates purpose)
- Short expiration (1 hour by default)
- Backend doesn't reveal if email exists (returns success message)
- OAuth-only users get explicit error `PASSWORD_NOT_ENABLED`

---

## 🔑 Passkeys (WebAuthn)

Passwordless authentication using device biometrics or security keys.

### Backend Endpoints

#### 1. Get Registration Options (authenticated)

```
POST /api/v1/passkeys/register/options
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "challenge": "random-base64-string",
  "rp": { "name": "IAM Provider", "id": "localhost" },
  "user": { "id": "...", "name": "user@example.com", "displayName": "User" },
  "pubKeyCredParams": [...],
  "timeout": 60000,
  "attestation": "none",
  "authenticatorSelection": {
    "residentKey": "preferred",
    "userVerification": "preferred"
  }
}
```

#### 2. Verify Registration (authenticated)

```
POST /api/v1/passkeys/register/verify
```

**Request:**

```json
{
  "response": {
    /* WebAuthn credential response from navigator.credentials.create() */
  },
  "displayName": "My MacBook Pro"
}
```

**Response:**

```json
{
  "message": "Passkey registered successfully",
  "passkey": {
    "credentialId": "...",
    "displayName": "My MacBook Pro",
    "deviceType": "multiDevice",
    "backedUp": true,
    "createdAt": "2026-01-19T..."
  }
}
```

#### 3. Get Authentication Options (public)

```
POST /api/v1/passkeys/login/options
```

**Request:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "challenge": "random-base64-string",
  "rpId": "localhost",
  "allowCredentials": [
    { "id": "credential-id-1", "type": "public-key", "transports": ["internal"] }
  ],
  "timeout": 60000,
  "userVerification": "preferred"
}
```

#### 4. Verify Authentication (public)

```
POST /api/v1/passkeys/login/verify
```

**Request:**

```json
{
  "email": "user@example.com",
  "response": {
    /* WebAuthn assertion response from navigator.credentials.get() */
  }
}
```

**Response:**

```json
{
  "user": { "id": "...", "email": "..." },
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 900
}
```

#### 5. List Passkeys (authenticated)

```
GET /api/v1/passkeys
```

**Response:**

```json
{
  "passkeys": [
    {
      "credentialId": "...",
      "displayName": "My MacBook Pro",
      "deviceType": "multiDevice",
      "backedUp": true,
      "createdAt": "2026-01-19T...",
      "lastUsedAt": "2026-01-19T..."
    }
  ]
}
```

#### 6. Delete Passkey (authenticated)

```
DELETE /api/v1/passkeys/:credentialId
```

**Response:** `204 No Content`

### Frontend Requirements

1. **WebAuthn API:** Use `navigator.credentials.create()` and `navigator.credentials.get()`

2. **Registration Flow:**

   ```javascript
   // 1. Get options from backend
   const options = await fetch('/api/v1/passkeys/register/options', {
     method: 'POST',
     headers: { Authorization: `Bearer ${token}` },
   }).then((r) => r.json());

   // 2. Create credential with browser API
   const credential = await navigator.credentials.create({ publicKey: options });

   // 3. Send to backend for verification
   await fetch('/api/v1/passkeys/register/verify', {
     method: 'POST',
     headers: { Authorization: `Bearer ${token}` },
     body: JSON.stringify({ response: credential, displayName: 'My Device' }),
   });
   ```

3. **Authentication Flow:**

   ```javascript
   // 1. Get options
   const options = await fetch('/api/v1/passkeys/login/options', {
     method: 'POST',
     body: JSON.stringify({ email }),
   }).then((r) => r.json());

   // 2. Get credential
   const credential = await navigator.credentials.get({ publicKey: options });

   // 3. Verify and login
   const result = await fetch('/api/v1/passkeys/login/verify', {
     method: 'POST',
     body: JSON.stringify({ email, response: credential }),
   }).then((r) => r.json());
   ```

4. **UI States:**

   | State                | Display                          |
   | -------------------- | -------------------------------- |
   | No passkeys          | "Add a passkey for faster login" |
   | Has passkeys         | Show list with delete option     |
   | Registration success | "✅ Passkey added!"              |
   | Auth success         | Redirect to dashboard            |
   | Error                | Show error message               |

### Error Responses

**User not found or no passkeys (404):**

```json
{
  "error": "USER_NOT_FOUND",
  "message": "User not found"
}
```

**Challenge expired (400):**

```json
{
  "error": "BAD_REQUEST",
  "message": "Challenge not found or expired"
}
```

**Verification failed (400):**

```json
{
  "error": "BAD_REQUEST",
  "message": "Registration verification failed"
}
```

### Configuration

- `WEBAUTHN_RP_ID`: Domain for passkey binding (default: `localhost`)
- `WEBAUTHN_ORIGIN`: Full origin URL (default: `http://localhost:3000`)

### Browser Support

| Browser | Support |
| ------- | ------- |
| Chrome  | ✅      |
| Safari  | ✅      |
| Firefox | ✅      |
| Edge    | ✅      |

> **Note:** WebAuthn requires HTTPS in production. localhost is allowed for development.

---

## ⚠️ Account Deactivation

Allow users to deactivate (soft delete) their own account.

### Backend Endpoint

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

### Frontend Requirements

1. **Location:** Settings > Account > Danger Zone

2. **UI Flow:**

   - Show warning about account deletion
   - Display `deletionDeadline` (when account will be permanently deleted)
   - Require confirmation (e.g., type email to confirm)
   - Call endpoint on confirm
   - Logout user after deactivation

3. **Confirmation Modal:**

   ```
   ⚠️ Deactivate Account

   Your account will be scheduled for permanent deletion on [date].
   You can reactivate your account before this date by logging in.

   Type your email to confirm: [____________]

   [Cancel] [Deactivate]
   ```

---

## 🖥️ Session Management

Allow users to view and revoke their active sessions.

### Backend Endpoints

#### 1. List Active Sessions

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

#### 2. Revoke Session

```
DELETE /api/v1/auth/sessions/:sessionId
Authorization: Bearer <token>
```

**Response:** `204 No Content`

### Frontend Requirements

1. **Route:** `/settings/sessions` or `/account/security`

2. **UI Components:**

   - Session list with device info
   - "Revoke" button per session
   - "Revoke all other sessions" button

3. **Display per session:**

   - Device/Browser (parse userAgent)
   - IP Address
   - Login date
   - "Current session" badge if applicable

4. **UI States:**

   | State    | Display                                    |
   | -------- | ------------------------------------------ |
   | Loading  | Skeleton list                              |
   | Empty    | "No active sessions"                       |
   | List     | Session cards with revoke buttons          |
   | Revoking | Loading spinner on button                  |
   | Revoked  | Remove from list + toast "Session revoked" |

### Error Responses

**Session not found (401):**

```json
{
  "error": "TOKEN_INVALID",
  "message": "Session not found"
}
```

### User Agent Parsing

Consider using a library like `ua-parser-js` to display friendly device names:

```javascript
import UAParser from 'ua-parser-js';

const parser = new UAParser(session.userAgent);
const browser = parser.getBrowser(); // { name: "Chrome", version: "120" }
const os = parser.getOS(); // { name: "macOS", version: "14.0" }
const device = parser.getDevice(); // { type: "desktop" }
```

---

_Last updated: January 2026_
