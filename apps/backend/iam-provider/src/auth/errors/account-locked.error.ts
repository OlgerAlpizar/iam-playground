export class AccountLockedError extends Error {
  readonly code = 'ACCOUNT_LOCKED';
  readonly lockoutUntil: Date;

  constructor(lockoutUntil: Date) {
    super(`Account is locked until ${lockoutUntil.toISOString()}`);
    this.name = 'AccountLockedError';
    this.lockoutUntil = lockoutUntil;
  }
}
