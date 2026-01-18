export class DuplicateEmailError extends Error {
  readonly code = 'DUPLICATE_EMAIL';

  constructor(email: string) {
    super(`Email already registered: ${email}`);
    this.name = 'DuplicateEmailError';
  }
}
