export class UserNotFoundError extends Error {
  readonly code = 'USER_NOT_FOUND';

  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
    this.name = 'UserNotFoundError';
  }
}
