export class PasswordNotEnabledError extends Error {
  constructor() {
    super(
      'This account does not have password authentication enabled. Use your social login instead.',
    );
    this.name = 'PasswordNotEnabledError';
  }
}
