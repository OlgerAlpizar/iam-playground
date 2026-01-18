export const OAuthProviderType = {
  Google: 'google',
  Github: 'github',
} as const;

export type OAuthProviderType = (typeof OAuthProviderType)[keyof typeof OAuthProviderType];

export interface OAuthProvider {
  provider: OAuthProviderType;
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}
