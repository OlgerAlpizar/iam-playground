export class TokenExpiredError extends Error {
  readonly code = 'TOKEN_EXPIRED';

  constructor() {
    super('Token has expired');
    this.name = 'TokenExpiredError';
  }
}
