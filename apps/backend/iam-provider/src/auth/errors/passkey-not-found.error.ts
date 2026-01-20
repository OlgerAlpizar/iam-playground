export class PasskeyNotFoundError extends Error {
  readonly code = 'PASSKEY_NOT_FOUND';

  constructor() {
    super('Passkey not found');
    this.name = 'PasskeyNotFoundError';
  }
}
