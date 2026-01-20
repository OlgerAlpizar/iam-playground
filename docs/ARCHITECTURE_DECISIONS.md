# Architecture Decisions

This document records key architectural decisions made during development, including context and rationale.

---

## ADR-001: Plain Text Emails

**Date:** January 2026

**Status:** Accepted

### Context

The application requires sending transactional emails (e.g., email verification). There are multiple approaches to generate email content:

| Option                         | Complexity | Dependencies            |
| ------------------------------ | ---------- | ----------------------- |
| Plain text (template literals) | Low        | None                    |
| Handlebars (.hbs templates)    | Medium     | `handlebars`            |
| MJML (responsive markup)       | Medium     | `mjml`, `handlebars`    |
| React Email (JSX components)   | High       | `@react-email/*`, React |

### Decision

Use **plain text emails** with JavaScript template literals.

### Rationale

1. **Simplicity** - No additional dependencies required
2. **Universal compatibility** - Plain text works in all email clients
3. **Portfolio focus** - The goal is to demonstrate backend architecture, not email design
4. **Maintainability** - Email content lives directly in the service, easy to modify

### Trade-offs

- ❌ No styled/branded emails
- ❌ No responsive HTML layouts
- ✅ Zero extra dependencies
- ✅ Works everywhere
- ✅ Easy to test and debug

### Future Considerations

For a production application with branding requirements, consider:

- **Handlebars** - Simple templating with `.hbs` files for separation of concerns
- **MJML** - Markup language that compiles to responsive HTML email
- **React Email** - Component-based approach if already using React

These libraries allow creating visually appealing, branded emails with proper responsive design for various email clients.

### References

- [Nodemailer Documentation](https://nodemailer.com/)
- [MJML Framework](https://mjml.io/)
- [React Email](https://react.email/)

---

## ADR-002: Redis for WebAuthn Challenge Store

**Date:** January 2026

**Status:** Accepted

### Context

WebAuthn (Passkeys) requires storing temporary challenges during the authentication flow:

1. Server generates a random challenge
2. Client signs the challenge with the passkey
3. Server verifies the signature against the stored challenge

Challenges must be:

- Short-lived (5 minutes TTL)
- Accessible across multiple server instances
- Deleted after use (one-time)

| Option        | Scalability        | Complexity | Persistence        |
| ------------- | ------------------ | ---------- | ------------------ |
| In-memory Map | ❌ Single instance | Low        | ❌ Lost on restart |
| Redis         | ✅ Multi-instance  | Medium     | ✅ Optional        |
| MongoDB       | ✅ Multi-instance  | Medium     | ✅ Yes             |

### Decision

Use **Redis** as the primary challenge store with **in-memory fallback** for development.

### Rationale

1. **Scalability** - Redis is shared across all server instances
2. **Native TTL** - `SETEX` automatically expires keys
3. **Performance** - In-memory, sub-millisecond latency
4. **Graceful degradation** - Falls back to memory if Redis unavailable
5. **Docker simplicity** - Easy to run locally with `docker-compose`

### Implementation

```typescript
const storeChallenge = async (userId: string, challenge: string): Promise<void> => {
  const redis = getRedisClient();

  if (redis) {
    await redis.setex(`webauthn:challenge:${userId}`, 300, challenge);
  } else {
    // Fallback to in-memory Map
    memoryStore.set(userId, { challenge, expiresAt: Date.now() + 300000 });
  }
};
```

### Trade-offs

- ✅ Works in multi-instance deployments
- ✅ Automatic expiration with TTL
- ✅ Graceful fallback for development
- ❌ Additional infrastructure (Redis server)
- ❌ Network latency (minimal, ~1ms)

### Configuration

```bash
# Optional - falls back to memory if not set
REDIS_URL=redis://localhost:6379
```

### References

- [ioredis Documentation](https://github.com/redis/ioredis)
- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [SimpleWebAuthn](https://simplewebauthn.dev/)

---

## ADR-003: No 2FA TOTP Implementation

**Date:** January 2026

**Status:** Accepted (Deferred)

### Context

Two-Factor Authentication (2FA) using Time-based One-Time Passwords (TOTP) is a common security feature compatible with apps like Google Authenticator, Authy, and Microsoft Authenticator.

The question arose whether to implement TOTP alongside existing authentication methods.

### Current Authentication Methods

| Method                | Second Factor Built-in            | Status         |
| --------------------- | --------------------------------- | -------------- |
| Email + Password      | ❌ No                             | ✅ Implemented |
| OAuth (Google/GitHub) | ✅ Provider handles it            | ✅ Implemented |
| Passkeys (WebAuthn)   | ✅ Inherent (biometrics + device) | ✅ Implemented |

### Decision

**Do not implement TOTP 2FA** at this time. Passkeys provide superior security and modern 2FA capabilities.

### Rationale

1. **Passkeys are superior**

   - TOTP: Something you know (password) + something you have (phone)
   - Passkeys: Something you have (device) + something you are (biometrics)
   - Passkeys are phishing-resistant; TOTP is not

2. **Industry direction**

   - TOTP was introduced ~2011
   - Passkeys (WebAuthn) standardized 2019, actively promoted by Apple/Google/Microsoft
   - Major platforms are deprecating passwords in favor of passkeys

3. **Complexity vs. value**

   - TOTP requires: secret storage, QR generation, recovery codes, UI for setup
   - Passkeys already implemented with same security benefit
   - Additional complexity doesn't add proportional security value

4. **OAuth providers handle their own 2FA**
   - Google/GitHub users already have 2FA options on those platforms
   - Redundant to add another layer

### Trade-offs

- ❌ Users without biometric devices can't use Passkeys
- ❌ Some users may prefer familiar TOTP flow
- ✅ Simpler implementation and maintenance
- ✅ Modern, phishing-resistant authentication
- ✅ Better UX (no manual code entry)

### Future Considerations

If TOTP is needed in the future:

```bash
# Recommended library
pnpm add otplib  # ~15KB, zero dependencies
```

Implementation would require:

- `totpSecret` and `totpEnabled` fields in User model
- `recoveryCodes` array for account recovery
- Endpoints: `/2fa/setup`, `/2fa/verify`, `/2fa/disable`
- Frontend: QR code display, code input, recovery code management

### References

- [TOTP RFC 6238](https://datatracker.ietf.org/doc/html/rfc6238)
- [WebAuthn vs TOTP Comparison](https://webauthn.guide/)
- [FIDO Alliance - Passkeys](https://fidoalliance.org/passkeys/)
- [otplib Library](https://github.com/yeojz/otplib)

---

## ADR-004: Rate Limiting Strategy

**Date:** January 2026

**Status:** Accepted

### Context

Rate limiting protects the API from abuse, brute force attacks, and denial of service. Different endpoints have different risk profiles and require different limits.

### Decision

Implement **two-tier rate limiting**:

1. **Global API Limiter** - All endpoints (100 requests / 10 minutes)
2. **Auth Limiter** - Sensitive endpoints (10 attempts / 10 minutes, skip successful)

### Endpoint Classification

| Endpoint                         | Limiter | Rationale                              |
| -------------------------------- | ------- | -------------------------------------- |
| `POST /auth/register`            | Auth    | Prevent mass account creation spam     |
| `POST /auth/login`               | Auth    | Prevent brute force password attacks   |
| `POST /auth/forgot-password`     | Auth    | Prevent email bombing and enumeration  |
| `POST /auth/reset-password`      | Auth    | Token guessing protection              |
| `POST /auth/reactivate`          | Auth    | Requires credentials, same as login    |
| `POST /auth/resend-verification` | Auth    | Prevent email spam                     |
| `POST /passkeys/login/options`   | Auth    | Public endpoint, user enumeration risk |
| `POST /passkeys/login/verify`    | Auth    | Authentication attempt                 |

### Endpoints WITHOUT Auth Limiter

| Endpoint                     | Rationale                                           |
| ---------------------------- | --------------------------------------------------- |
| `POST /auth/refresh`         | Requires valid refresh token                        |
| `POST /auth/logout`          | Not security sensitive                              |
| `GET /auth/verify-email`     | Token is unique, one-time use                       |
| `POST /auth/set-password`    | Requires valid JWT (authenticated)                  |
| `POST /auth/change-password` | Requires valid JWT (authenticated)                  |
| `POST /auth/introspect`      | Third-party validation, global limit sufficient     |
| `POST /passkeys/register/*`  | Requires valid JWT (authenticated)                  |
| `GET /passkeys`              | Requires valid JWT (authenticated)                  |
| `DELETE /passkeys/:id`       | Requires valid JWT (authenticated)                  |
| OAuth routes                 | Redirects through provider, global limit sufficient |

### Key Generator Strategy

The auth limiter identifies requesters by (in order of priority):

1. **User ID** - If authenticated
2. **Email/Username** - From request body (prevents distributed attacks on single account)
3. **Device Fingerprint** - Fallback for anonymous requests

```typescript
const generateRateLimitKey = (req, prefix, identifier) => {
  if (req.user?.id) return `${prefix}:user:${user.id}`;
  if (identifier) return `${prefix}:identifier:${identifier}`;
  return `${prefix}:device:${generateDeviceFingerprint(req)}`;
};
```

### Skip Successful Requests

Auth limiter uses `skipSuccessfulRequests: true`:

- Failed attempts count against the limit
- Successful logins don't consume quota
- Prevents lockout of legitimate users who occasionally mistype passwords

### Trade-offs

- ✅ Protects against brute force and enumeration
- ✅ Legitimate users rarely hit limits
- ✅ Different limits for different risk levels
- ❌ Sophisticated attackers can rotate IPs (mitigated by email-based key)
- ❌ Shared IPs (corporate NAT) may hit limits faster

### Configuration

Limits are multiplied by 10x in development for easier testing:

```typescript
max = DEFAULT_AUTH_MAX_ATTEMPTS * (environment.isProduction() ? 1 : 10);
```

### Future Considerations

- **Redis store** for rate limiting in multi-instance deployments
- **Progressive delays** (exponential backoff) instead of hard blocks
- **CAPTCHA integration** after N failed attempts
- **IP reputation** services for known bad actors

### References

- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)

---

## ADR-005: Structured Logging Instead of Audit Log Collection

**Date:** January 2026

**Status:** Accepted

### Context

Security audit logs track important events like logins, password changes, and account modifications. There are two common approaches:

| Approach                   | Storage      | Queryability   | Complexity |
| -------------------------- | ------------ | -------------- | ---------- |
| Dedicated audit collection | MongoDB      | Easy (indexed) | High       |
| Structured logging         | Files/stdout | grep/tools     | Low        |

### Decision

Use **structured logging with Winston** instead of a dedicated audit log collection.

### Rationale

1. **Already implemented** - Winston logger is configured and used throughout the application
2. **Sufficient for portfolio** - Reviewers won't query audit logs; they'll read code
3. **No UI to consume it** - A dedicated collection without a UI adds complexity with no visible benefit
4. **Industry standard** - Production systems often ship logs to ELK/Datadog/Splunk rather than query MongoDB
5. **YAGNI** - Audit log querying is rarely needed; when it is, log files suffice

### Events Already Logged

The following security events are captured via Winston:

| Event                  | Log Level | Location               |
| ---------------------- | --------- | ---------------------- |
| Login success          | info      | auth.service           |
| Login failure          | warn      | auth.service           |
| Registration           | info      | auth.service           |
| Password change        | info      | auth.service           |
| Password reset request | info      | password-reset.service |
| Account lockout        | warn      | auth.service           |
| Rate limit exceeded    | warn      | rate-limit middleware  |
| Email sent             | info      | email.service          |

### Log Format

Winston outputs structured JSON logs:

```json
{
  "level": "info",
  "message": "User logged in",
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "ip": "192.168.1.1",
  "timestamp": "2026-01-19T10:30:00.000Z"
}
```

### Trade-offs

- ✅ Zero additional complexity
- ✅ Already working
- ✅ Easy to ship to external services later
- ❌ No indexed queries on audit events
- ❌ Log rotation may lose old events

### Future Considerations

For a production system requiring audit compliance:

1. **Ship logs to ELK Stack** (Elasticsearch, Logstash, Kibana)
2. **Use a dedicated audit service** with retention policies
3. **Add MongoDB collection** with TTL index for retention

### References

- [Winston Logger](https://github.com/winstonjs/winston)
- [12 Factor App - Logs](https://12factor.net/logs)

---

## ADR-006: No Email Change Functionality

**Date:** January 2026

**Status:** Accepted

### Context

Users may want to change their email address. A typical email change flow involves:

1. User requests email change with new email
2. System sends verification to new email
3. User confirms → email is updated
4. Optionally notify old email of the change

### Decision

**Do not implement email change functionality.** Users who want a different email should deactivate their account and create a new one.

### Rationale

1. **Email is the primary identifier** - Changing it has cascading implications for:

   - OAuth provider linking (email-based auto-link)
   - Account recovery flows
   - Session invalidation decisions

2. **Security complexity** - Email change is a high-risk operation:

   - Requires verification of both old and new emails
   - Must handle edge cases (what if old email is compromised?)
   - Account takeover vector if not implemented carefully

3. **Rare use case** - Email changes are infrequent; the deactivate/recreate path handles it

4. **Simpler codebase** - Less code to maintain and audit

### Alternative Path

Users who need a different email:

1. `POST /auth/deactivate` - Soft delete current account
2. Wait for reactivation window to pass (or let it expire)
3. `POST /auth/register` - Create new account with new email

### Trade-offs

- ❌ Less convenient for users who want to keep their account history
- ❌ OAuth links and passkeys are lost
- ✅ Simpler and more secure implementation
- ✅ Email remains a stable identifier
- ✅ No risk of email change attacks

### Future Considerations

If email change becomes a requirement:

- Implement with dual verification (old + new email)
- Add cooldown period after email change
- Log and notify both addresses
- Consider impact on OAuth auto-linking logic

---

## ADR-007: No New Device Login Notifications

**Date:** January 2026

**Status:** Accepted (Deferred)

### Context

Many services notify users when a login occurs from a new device or location. This helps users detect unauthorized access early.

A typical implementation requires:

1. **Device tracking** - Store known devices per user
2. **Device fingerprinting** - Identify returning vs new devices
3. **IP geolocation** - Determine location (requires external service)
4. **Notification logic** - Send email when device/location is "new"

### Decision

**Do not implement new device login notifications.** The complexity outweighs the benefit for this portfolio project.

### Rationale

1. **Device fingerprinting is unreliable**

   - Browser updates change fingerprints
   - Incognito mode creates "new" devices
   - High false positive rate frustrates users

2. **Requires external services**

   - IP geolocation needs MaxMind, ipinfo.io, or similar
   - Additional cost and dependency

3. **Storage overhead**

   - Must store device history per user
   - Need cleanup strategy for old devices

4. **Existing mitigations**
   - Session management allows users to see/revoke active sessions
   - Account lockout protects against brute force
   - Password change notifications alert on credential compromise

### What IS Implemented

| Feature                                          | Purpose                                 |
| ------------------------------------------------ | --------------------------------------- |
| Session list (`GET /auth/sessions`)              | User can see all active sessions        |
| Session revocation (`DELETE /auth/sessions/:id`) | User can revoke suspicious sessions     |
| Logout all devices (`POST /auth/logout-all`)     | Nuclear option for compromised accounts |
| Password changed notification                    | Alerts if credentials were changed      |

### Trade-offs

- ❌ Users won't be proactively notified of new logins
- ❌ Delayed detection of unauthorized access
- ✅ No false positive notifications
- ✅ No external service dependencies
- ✅ Simpler implementation

### Future Considerations

If implementing in the future:

1. **Use trusted device concept** - User explicitly marks devices as trusted
2. **Simple approach first** - Track device fingerprint hash, notify on mismatch
3. **Batched notifications** - Don't send for every login, aggregate
4. **User preference** - Allow users to enable/disable notifications

### References

- [Device Fingerprinting Challenges](https://fingerprintjs.com/)
- [MaxMind GeoIP](https://www.maxmind.com/)

---

## ADR-008: No API Keys for Service-to-Service Auth

**Date:** January 2026

**Status:** Accepted (Deferred)

### Context

API Keys are long-lived credentials used for programmatic (machine-to-machine) access, as opposed to JWTs which are short-lived tokens for human users.

| Aspect      | JWT (users)             | API Key (services)        |
| ----------- | ----------------------- | ------------------------- |
| Consumer    | Humans via browser      | Servers/scripts           |
| Expiration  | Short (15 min)          | Long or never             |
| Refresh     | Yes, with refresh token | Not needed                |
| Permissions | User's permissions      | Service/application scope |
| Revocation  | Logout                  | Admin revokes manually    |

Typical use cases:

- Cron jobs syncing user data
- Microservices validating tokens
- CI/CD pipelines creating test users
- Third-party integrations (Zapier, webhooks)

### Decision

**Do not implement API Keys.** The existing token introspection endpoint is sufficient for third-party integrations in this portfolio project.

### Rationale

1. **Token introspection already exists**

   - `POST /auth/introspect` allows third parties to validate JWTs
   - Sufficient for most integration scenarios

2. **Significant implementation overhead**

   - New MongoDB collection for API keys
   - Key generation and hashing logic
   - Middleware to validate API keys (separate from JWT)
   - Scopes/permissions system per key
   - Admin UI or CLI for key management
   - Rate limiting per API key

3. **Security considerations**

   - API keys are high-value targets (long-lived)
   - Need secure storage, rotation policies
   - Audit logging for key usage

4. **Portfolio scope**
   - No actual microservices consuming the IAM
   - Demonstrating the pattern adds complexity without visible benefit

### What IS Implemented

| Feature                 | Use Case                                      |
| ----------------------- | --------------------------------------------- |
| `POST /auth/introspect` | Third parties validate user JWTs              |
| OAuth flows             | Apps act on behalf of users                   |
| Admin endpoints         | Programmatic user management (with admin JWT) |

### Trade-offs

- ❌ No dedicated service-to-service authentication
- ❌ Third parties must use user JWTs or OAuth
- ✅ Simpler implementation
- ✅ Fewer security concerns (no long-lived secrets)
- ✅ No additional infrastructure

### Future Considerations

If API Keys become necessary:

```typescript
// api-key.model.ts
interface ApiKey {
  id: string;
  name: string;
  keyHash: string; // Never store plain key
  prefix: string; // "sk_live_abc..." for identification
  scopes: string[]; // ['users:read', 'users:write']
  createdBy: string; // Admin user ID
  lastUsedAt?: Date;
  expiresAt?: Date;
  isRevoked: boolean;
}
```

Implementation would require:

- Key generation: `sk_live_` + random bytes
- One-time display of full key (hash stored)
- Middleware checking `Authorization: Bearer sk_live_...`
- Scope validation per endpoint
- Usage tracking and rate limiting
