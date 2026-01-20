export class VerificationTokenInvalidError extends Error {
  readonly code = 'VERIFICATION_TOKEN_INVALID';

  constructor() {
    super('Invalid verification token');
    this.name = 'VerificationTokenInvalidError';
  }
}
