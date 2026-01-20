export class OAuthAlreadyLinkedError extends Error {
  readonly code = 'OAUTH_ALREADY_LINKED';

  constructor() {
    super('This OAuth account is already linked to another user');
    this.name = 'OAuthAlreadyLinkedError';
  }
}
