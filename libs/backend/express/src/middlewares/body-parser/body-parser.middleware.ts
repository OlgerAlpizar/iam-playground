import express, { RequestHandler } from 'express';
import { IncomingMessage } from 'http';

const DEFAULT_JSON_LIMIT = '10mb';
const DEFAULT_URLENCODED_LIMIT = '10mb';
const DEFAULT_RAW_LIMIT = '10mb';
const DEFAULT_TEXT_LIMIT = '10mb';

type BodyParserOptions = {
  jsonLimit?: string;
  urlencodedLimit?: string;
  rawLimit?: string;
  textLimit?: string;
  extended?: boolean;
  enableJson?: boolean;
  enableUrlencoded?: boolean;
  enableRaw?: boolean;
  enableText?: boolean;
  inflate?: boolean;
  strict?: boolean;
};

const normalizeOptions = (options: BodyParserOptions): Required<BodyParserOptions> => {
  return {
    jsonLimit: options.jsonLimit ?? DEFAULT_JSON_LIMIT,
    urlencodedLimit: options.urlencodedLimit ?? DEFAULT_URLENCODED_LIMIT,
    rawLimit: options.rawLimit ?? DEFAULT_RAW_LIMIT,
    textLimit: options.textLimit ?? DEFAULT_TEXT_LIMIT,
    extended: options.extended ?? true,
    enableJson: options.enableJson ?? true,
    enableUrlencoded: options.enableUrlencoded ?? true,
    enableRaw: options.enableRaw ?? false,
    enableText: options.enableText ?? false,
    inflate: options.inflate ?? true,
    strict: options.strict ?? true,
  };
};

const isValidSizeLimit = (limit: string): boolean => {
  const limitRegex = /^(\d+)(b|kb|mb|gb)$/i;
  return limitRegex.test(limit);
};

const createValidationError = (field: string, value: string): string => {
  return `Invalid ${field}: ${value}. Must be in format like '10mb', '5kb', etc.`;
};

const createJsonParser = (config: Required<BodyParserOptions>): RequestHandler | null => {
  if (!config.enableJson) {
    return null;
  }

  return express.json({
    limit: config.jsonLimit,
    inflate: config.inflate,
    strict: config.strict,
  });
};

const createUrlencodedParser = (config: Required<BodyParserOptions>): RequestHandler | null => {
  if (!config.enableUrlencoded) {
    return null;
  }

  return express.urlencoded({
    limit: config.urlencodedLimit,
    extended: config.extended,
    inflate: config.inflate,
  });
};

const isRawContentType = (contentType: string): boolean => {
  return (
    !contentType.includes('application/json') &&
    !contentType.includes('application/x-www-form-urlencoded') &&
    !contentType.includes('text/')
  );
};

const createRawParser = (config: Required<BodyParserOptions>): RequestHandler | null => {
  if (!config.enableRaw) {
    return null;
  }

  return express.raw({
    limit: config.rawLimit,
    inflate: config.inflate,
    type: (req: IncomingMessage) => isRawContentType(req.headers['content-type'] ?? ''),
  });
};

const createTextParser = (config: Required<BodyParserOptions>): RequestHandler | null => {
  if (!config.enableText) {
    return null;
  }

  return express.text({
    limit: config.textLimit,
    inflate: config.inflate,
  });
};

const validateOptions = (options: Required<BodyParserOptions>): void => {
  if (options.enableJson && !isValidSizeLimit(options.jsonLimit)) {
    throw new Error(createValidationError('jsonLimit', options.jsonLimit));
  }
  if (options.enableUrlencoded && !isValidSizeLimit(options.urlencodedLimit)) {
    throw new Error(createValidationError('urlencodedLimit', options.urlencodedLimit));
  }
  if (options.enableRaw && !isValidSizeLimit(options.rawLimit)) {
    throw new Error(createValidationError('rawLimit', options.rawLimit));
  }
  if (options.enableText && !isValidSizeLimit(options.textLimit)) {
    throw new Error(createValidationError('textLimit', options.textLimit));
  }
};

/**
 * Creates an array of body parsing middlewares
 * @param options - Configuration options for body parsers
 * @property {string} [jsonLimit='10mb'] - Maximum size for JSON payloads
 * @property {string} [urlencodedLimit='10mb'] - Maximum size for URL-encoded payloads
 * @property {string} [rawLimit='10mb'] - Maximum size for raw payloads
 * @property {string} [textLimit='10mb'] - Maximum size for text payloads
 * @property {boolean} [extended=true] - Whether to use extended syntax for URL-encoded data
 * @property {boolean} [enableJson=true] - Whether to enable JSON parsing
 * @property {boolean} [enableUrlencoded=true] - Whether to enable URL-encoded parsing
 * @property {boolean} [enableRaw=false] - Whether to enable raw body parsing
 * @property {boolean} [enableText=false] - Whether to enable text body parsing
 * @property {boolean} [inflate=true] - Whether to inflate/deflate compressed bodies
 * @property {boolean} [strict=true] - Whether to enable strict JSON parsing
 * @returns Array of middlewares
 */
const createBodyParsers = (options: BodyParserOptions = {}): ReturnType<typeof express.json>[] => {
  const config = normalizeOptions(options);
  validateOptions(config);

  const parsers = [
    createJsonParser(config),
    createUrlencodedParser(config),
    createRawParser(config),
    createTextParser(config),
  ].filter((parser): parser is ReturnType<typeof express.json> => parser !== null);

  return parsers;
};

export const bodyParser = {
  createBodyParsers,
} as const;
