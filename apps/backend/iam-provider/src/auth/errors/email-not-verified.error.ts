export class EmailNotVerifiedError extends Error {
  readonly code = 'EMAIL_NOT_VERIFIED';

  constructor(email: string) {
    super(`Email ${email} is not verified`);
    this.name = 'EmailNotVerifiedError';
  }
}
