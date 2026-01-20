export interface SessionResponse {
  id: string;
  deviceFingerprint?: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

export interface SessionsListResponse {
  sessions: SessionResponse[];
  total: number;
}
