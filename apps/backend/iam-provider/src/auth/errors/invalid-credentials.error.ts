export class InvalidCredentialsError extends Error {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}
