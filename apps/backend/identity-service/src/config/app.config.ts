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
} as const;
