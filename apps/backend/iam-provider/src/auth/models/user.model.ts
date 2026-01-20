import mongoose, { Document, Model, Schema } from 'mongoose';

import { type OAuthProvider, OAuthProviderType } from '../entities/oauth-provider.entity';
import {
  type PasskeyCredential,
  PasskeyDeviceType,
  PasskeyTransport,
} from '../entities/passkey-credential.entity';
import type { User } from '../entities/user.entity';

const oAuthProviderSchema = new Schema<OAuthProvider>(
  {
    provider: {
      type: String,
      required: [true, 'Provider is required'],
      enum: Object.values(OAuthProviderType),
      maxLength: [100, 'Provider name too long'],
    },
    providerId: {
      type: String,
      required: [true, 'Provider ID is required'],
      match: [/^[a-zA-Z0-9_-]+$/, 'Invalid provider ID format'],
      maxlength: [100, 'Provider ID too long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      maxlength: [254, 'Email cannot exceed 254 characters'],
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    displayName: {
      type: String,
      trim: true,
      required: [true, 'Display name is required'],
      maxlength: [100, 'Display name too long'],
    },
    avatarUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Invalid avatar URL'],
      maxlength: [2048, 'Avatar URL too long'],
      default: null,
    },
  },
  { _id: false },
);

const passkeyCredentialSchema = new Schema<PasskeyCredential>(
  {
    credentialId: {
      type: String,
      required: [true, 'Credential ID is required'],
      match: [/^[A-Za-z0-9_-]+$/, 'Invalid credential ID format'],
      maxlength: [256, 'Credential ID too long'],
    },
    publicKey: {
      type: String,
      required: [true, 'Public key is required'],
      match: [/^[A-Za-z0-9_-]+$/, 'Invalid public key format'],
      maxlength: [2048, 'Public key too long'],
    },
    counter: {
      type: Number,
      required: [true, 'Counter is required'],
      default: 0,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: [100, 'Display name too long'],
    },
    deviceType: {
      type: String,
      required: [true, 'Device type is required'],
      enum: Object.values(PasskeyDeviceType),
    },
    backedUp: {
      type: Boolean,
      default: false,
    },
    transports: {
      type: [String],
      enum: Object.values(PasskeyTransport),
      validate: {
        validator: (v: string[]) => v.length <= 5,
        message: 'Cannot have more than 5 transports',
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastUsedAt: Date,
  },
  { _id: false },
);

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, 'Email cannot exceed 254 characters'],
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    passwordHash: {
      type: String,
      select: false,
      minlength: [60, 'Invalid password hash'],
    },
    isAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters'],
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    avatarUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Avatar URL must be a valid URL'],
      maxlength: [2048, 'Avatar URL too long'],
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    inactiveAt: {
      type: Date,
      default: null,
    },
    deletionDeadline: {
      type: Date,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    verificationDeadline: {
      type: Date,
      default: null,
    },
    oauthProviders: {
      type: [oAuthProviderSchema],
      default: [],
      validate: {
        validator: (v: OAuthProvider[]) => v.length <= 5,
        message: 'Cannot have more than 5 OAuth providers',
      },
    },
    passkeys: {
      type: [passkeyCredentialSchema],
      default: [],
      validate: {
        validator: (v: PasskeyCredential[]) => v.length <= 5,
        message: 'Cannot have more than 5 passkeys',
      },
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: [0, 'Failed login attempts cannot be negative'],
    },
    lockoutUntil: {
      type: Date,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

userSchema.index({ 'oauthProviders.provider': 1, 'oauthProviders.providerId': 1 });
userSchema.index({ 'passkeys.credentialId': 1 });

userSchema.index(
  { email: 'text', displayName: 'text', firstName: 'text', lastName: 'text' },
  { weights: { email: 10, displayName: 5, firstName: 3, lastName: 3 }, name: 'user_text_search' },
);

// TTL index for auto-deleting unverified accounts after verificationDeadline
userSchema.index(
  { verificationDeadline: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { isEmailVerified: false, verificationDeadline: { $ne: null } },
  },
);

// TTL index for auto-deleting inactive (soft-deleted) accounts after deletionDeadline
userSchema.index(
  { deletionDeadline: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { isActive: false, deletionDeadline: { $ne: null } },
  },
);

export interface UserDocument extends Document, Omit<User, 'id'> {
  passwordHash?: string;
}

export const UserModel: Model<UserDocument> = mongoose.model<UserDocument>('User', userSchema);
