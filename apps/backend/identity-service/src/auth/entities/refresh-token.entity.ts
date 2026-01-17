export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  deviceFingerprint?: string;
  userAgent?: string;
  ipAddress?: string;
  family: string;
  isUsed: boolean;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
