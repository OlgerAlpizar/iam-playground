export class PasswordAlreadySetError extends Error {
  readonly code = 'PASSWORD_ALREADY_SET';

  constructor() {
    super('Password is already set. Use change-password endpoint instead.');
    this.name = 'PasswordAlreadySetError';
  }
}
