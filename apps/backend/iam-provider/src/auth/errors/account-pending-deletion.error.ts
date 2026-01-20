export class AccountPendingDeletionError extends Error {
  readonly code = 'ACCOUNT_PENDING_DELETION';
  readonly deletionDate: Date;

  constructor(deletionDate: Date) {
    super(`Account is scheduled for deletion on ${deletionDate.toISOString()}`);
    this.name = 'AccountPendingDeletionError';
    this.deletionDate = deletionDate;
  }
}
