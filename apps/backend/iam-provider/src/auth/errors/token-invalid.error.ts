export class TokenInvalidError extends Error {
  readonly code = 'TOKEN_INVALID';

  constructor(reason?: string) {
    super(reason ?? 'Invalid token');
    this.name = 'TokenInvalidError';
  }
}
