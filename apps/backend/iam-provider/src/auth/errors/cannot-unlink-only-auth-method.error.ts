export class CannotUnlinkOnlyAuthMethodError extends Error {
  readonly code = 'CANNOT_UNLINK_ONLY_AUTH_METHOD';

  constructor() {
    super('Cannot unlink the only authentication method');
    this.name = 'CannotUnlinkOnlyAuthMethodError';
  }
}
