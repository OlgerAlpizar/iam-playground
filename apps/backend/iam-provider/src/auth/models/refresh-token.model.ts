import mongoose, { Document, Model, Schema, Types } from 'mongoose';

const refreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      unique: true,
      match: [/^[a-f0-9]{64}$/, 'Invalid token hash format'],
    },
    deviceFingerprint: {
      type: String,
      index: true,
      match: [/^[a-f0-9]{64}$/, 'Invalid device fingerprint format'],
      default: null,
    },
    userAgent: {
      type: String,
      maxlength: [512, 'User agent too long'],
      default: null,
    },
    ipAddress: {
      type: String,
      match: [
        /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([a-fA-F0-9:]+)$/,
        'Invalid IP address format',
      ],
      default: null,
    },
    family: {
      type: String,
      required: [true, 'Token family is required'],
      index: true,
      match: [/^[a-f0-9-]{36}$/, 'Invalid family ID format'],
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.tokenHash;
        return ret;
      },
    },
  },
);

refreshTokenSchema.index({ userId: 1, family: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export interface RefreshTokenDocument extends Document {
  userId: Types.ObjectId;
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

export const RefreshTokenModel: Model<RefreshTokenDocument> = mongoose.model<RefreshTokenDocument>(
  'RefreshToken',
  refreshTokenSchema,
);
