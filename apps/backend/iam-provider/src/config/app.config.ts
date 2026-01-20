import { z } from 'zod';

const VALID_ENVIRONMENTS = ['development', 'production', 'test'] as const;
type Environment = (typeof VALID_ENVIRONMENTS)[number];

const mongoConnectionStringSchema = z
  .string()
  .min(1, 'MONGO_CONN_STRING is required')
  .refine(
    (val) => {
      try {
        const url = new URL(val);
        return url.protocol === 'mongodb:' || url.protocol === 'mongodb+srv:';
      } catch {
        return false;
      }
    },
    {
      message: 'MONGO_CONN_STRING must be a valid MongoDB URL (mongodb:// or mongodb+srv://)',
    },
  );

const appConfigSchema = z.object({
  environment: z.enum(VALID_ENVIRONMENTS),
  server: z.object({
    port: z.number().int().positive().default(3010),
  }),
  cors: z.object({
    whiteListUrls: z.array(z.string().url()).min(1, 'At least one whitelist URL is required'),
  }),
  database: z.object({
    mongo: z.object({
      connString: mongoConnectionStringSchema,
    }),
    redis: z
      .object({
        url: z.string().url(),
      })
      .optional(),
  }),
  jwt: z.object({
    secret: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    accessTokenExpiresIn: z.number().int().positive().default(900), // 15 minutes
    refreshTokenExpiresIn: z.number().int().positive().default(604800), // 7 days
  }),
  security: z.object({
    maxFailedLoginAttempts: z.number().int().positive().default(5),
    lockoutDurationMinutes: z.number().int().positive().default(15),
    bcryptRounds: z.number().int().min(10).max(14).default(12),
    inactiveAccountRetentionDays: z.number().int().positive().default(30),
  }),
  oauth: z.object({
    google: z
      .object({
        clientId: z.string().min(1),
        clientSecret: z.string().min(1),
        callbackUrl: z.string().url(),
      })
      .optional(),
    github: z
      .object({
        clientId: z.string().min(1),
        clientSecret: z.string().min(1),
        callbackUrl: z.string().url(),
      })
      .optional(),
  }),
  email: z.object({
    smtp: z
      .object({
        host: z.string().min(1),
        port: z.number().int().positive(),
        secure: z.boolean().default(false),
        user: z.string().optional(),
        pass: z.string().optional(),
      })
      .optional(),
    from: z.string().min(1).default('noreply@localhost.local'),
    verificationTokenExpiresHours: z.number().int().positive().default(24),
    passwordResetTokenExpiresHours: z.number().int().positive().default(1),
  }),
  session: z.object({
    maxActiveSessions: z.number().int().positive().default(1),
  }),
  webauthn: z.object({
    rpName: z.string().min(1).default('IAM Provider'),
    rpId: z.string().min(1).default('localhost'),
    origin: z.string().url().default('http://localhost:3000'),
    challengeTtlSeconds: z.number().int().positive().default(300), // 5 minutes
  }),
});

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
};

const parseEnvironment = (env: string): Environment => {
  if (!VALID_ENVIRONMENTS.includes(env as Environment)) {
    throw new Error(`NODE_ENV must be one of: ${VALID_ENVIRONMENTS.join(', ')}`);
  }
  return env as Environment;
};

const parseWhitelistUrls = (urlsString: string): string[] => {
  return urlsString
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
};

const parseConfig = (): z.infer<typeof appConfigSchema> => {
  const config = {
    environment: parseEnvironment(getRequiredEnv('NODE_ENV')),
    server: {
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3010,
    },
    cors: {
      whiteListUrls: parseWhitelistUrls(getRequiredEnv('WHITE_LIST_URLS')),
    },
    database: {
      mongo: {
        connString: getRequiredEnv('MONGO_CONN_STRING'),
      },
      redis: process.env.REDIS_URL
        ? {
            url: process.env.REDIS_URL,
          }
        : undefined,
    },
    jwt: {
      secret: getRequiredEnv('JWT_SECRET'),
      accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN_SECONDS
        ? parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN_SECONDS, 10)
        : 900,
      refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN_SECONDS
        ? parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRES_IN_SECONDS, 10)
        : 604800,
    },
    security: {
      maxFailedLoginAttempts: process.env.MAX_FAILED_LOGIN_ATTEMPTS
        ? parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS, 10)
        : 5,
      lockoutDurationMinutes: process.env.LOCKOUT_DURATION_MINUTES
        ? parseInt(process.env.LOCKOUT_DURATION_MINUTES, 10)
        : 15,
      bcryptRounds: process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS, 10) : 12,
      inactiveAccountRetentionDays: process.env.INACTIVE_ACCOUNT_RETENTION_DAYS
        ? parseInt(process.env.INACTIVE_ACCOUNT_RETENTION_DAYS, 10)
        : 30,
    },
    oauth: {
      google:
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
          ? {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              callbackUrl:
                process.env.GOOGLE_CALLBACK_URL ??
                'http://localhost:3010/api/v1/oauth/google/callback',
            }
          : undefined,
      github:
        process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
          ? {
              clientId: process.env.GITHUB_CLIENT_ID,
              clientSecret: process.env.GITHUB_CLIENT_SECRET,
              callbackUrl:
                process.env.GITHUB_CALLBACK_URL ??
                'http://localhost:3010/api/v1/oauth/github/callback',
            }
          : undefined,
    },
    email: {
      smtp:
        process.env.SMTP_HOST && process.env.SMTP_PORT
          ? {
              host: process.env.SMTP_HOST,
              port: parseInt(process.env.SMTP_PORT, 10),
              secure: process.env.SMTP_SECURE === 'true',
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
      from: process.env.SMTP_FROM ?? 'noreply@localhost.local',
      verificationTokenExpiresHours: process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_HOURS
        ? parseInt(process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_HOURS, 10)
        : 24,
      passwordResetTokenExpiresHours: process.env.PASSWORD_RESET_TOKEN_EXPIRES_HOURS
        ? parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES_HOURS, 10)
        : 1,
    },
    session: {
      maxActiveSessions: process.env.MAX_ACTIVE_SESSIONS
        ? parseInt(process.env.MAX_ACTIVE_SESSIONS, 10)
        : 1,
    },
    webauthn: {
      rpName: process.env.WEBAUTHN_RELYING_PARTY_NAME ?? 'IAM Provider',
      rpId: process.env.WEBAUTHN_RELYING_PARTY_ID ?? 'localhost',
      origin: process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000',
      challengeTtlSeconds: process.env.WEBAUTHN_CHALLENGE_TTL_SECONDS
        ? parseInt(process.env.WEBAUTHN_CHALLENGE_TTL_SECONDS, 10)
        : 300,
    },
  };

  return appConfigSchema.parse(config);
};

const parsedConfig = parseConfig();

export const appConfig = {
  environment: parsedConfig.environment,
  port: parsedConfig.server.port,
  whiteListUrls: parsedConfig.cors.whiteListUrls,
  mongoConnString: parsedConfig.database.mongo.connString,
  redisUrl: parsedConfig.database.redis?.url,
  jwt: {
    secret: parsedConfig.jwt.secret,
    accessTokenExpiresIn: parsedConfig.jwt.accessTokenExpiresIn,
    refreshTokenExpiresIn: parsedConfig.jwt.refreshTokenExpiresIn,
  },
  security: {
    maxFailedLoginAttempts: parsedConfig.security.maxFailedLoginAttempts,
    lockoutDurationMinutes: parsedConfig.security.lockoutDurationMinutes,
    bcryptRounds: parsedConfig.security.bcryptRounds,
    inactiveAccountRetentionDays: parsedConfig.security.inactiveAccountRetentionDays,
  },
  oauth: {
    google: parsedConfig.oauth.google,
    github: parsedConfig.oauth.github,
  },
  email: {
    smtp: parsedConfig.email.smtp,
    from: parsedConfig.email.from,
    verificationTokenExpiresHours: parsedConfig.email.verificationTokenExpiresHours,
    passwordResetTokenExpiresHours: parsedConfig.email.passwordResetTokenExpiresHours,
  },
  session: {
    maxActiveSessions: parsedConfig.session.maxActiveSessions,
  },
  webauthn: {
    rpName: parsedConfig.webauthn.rpName,
    rpId: parsedConfig.webauthn.rpId,
    origin: parsedConfig.webauthn.origin,
    challengeTtlSeconds: parsedConfig.webauthn.challengeTtlSeconds,
  },
};
