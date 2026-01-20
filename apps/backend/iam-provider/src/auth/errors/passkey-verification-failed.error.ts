export class PasskeyVerificationFailedError extends Error {
  readonly code = 'PASSKEY_VERIFICATION_FAILED';

  constructor() {
    super('Passkey verification failed');
    this.name = 'PasskeyVerificationFailedError';
  }
}
