export class PasskeyChallengeExpiredError extends Error {
  readonly code = 'PASSKEY_CHALLENGE_EXPIRED';

  constructor() {
    super('Passkey challenge not found or expired');
    this.name = 'PasskeyChallengeExpiredError';
  }
}
