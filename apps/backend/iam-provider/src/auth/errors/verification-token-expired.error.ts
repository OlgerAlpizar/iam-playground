export class VerificationTokenExpiredError extends Error {
  readonly code = 'VERIFICATION_TOKEN_EXPIRED';

  constructor() {
    super('Verification token has expired');
    this.name = 'VerificationTokenExpiredError';
  }
}
