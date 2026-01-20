import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

import { appConfig } from '../../config/app.config';
import { getRedisClient } from '../../config/redis.config';
import type { PasskeyCredential } from '../entities/passkey-credential.entity';
import type { User } from '../entities/user.entity';
import { PasskeyChallengeExpiredError } from '../errors/passkey-challenge-expired.error';
import { PasskeyNotFoundError } from '../errors/passkey-not-found.error';
import { PasskeyVerificationFailedError } from '../errors/passkey-verification-failed.error';
import { userRepository } from '../repositories/user.repository';

const CHALLENGE_KEY_PREFIX = 'webauthn:challenge:';

// In-memory fallback store
const memoryStore = new Map<string, { challenge: string; expiresAt: number }>();

const storeChallenge = async (userId: string, challenge: string): Promise<void> => {
  const redis = getRedisClient();
  const ttl = appConfig.webauthn.challengeTtlSeconds;

  if (redis) {
    await redis.setex(`${CHALLENGE_KEY_PREFIX}${userId}`, ttl, challenge);
  } else {
    memoryStore.set(userId, {
      challenge,
      expiresAt: Date.now() + ttl * 1000,
    });
  }
};

const getAndDeleteChallenge = async (userId: string): Promise<string | null> => {
  const redis = getRedisClient();

  if (redis) {
    const key = `${CHALLENGE_KEY_PREFIX}${userId}`;
    const challenge = await redis.get(key);
    if (challenge) {
      await redis.del(key);
    }
    return challenge;
  }

  // Fallback to memory store
  const stored = memoryStore.get(userId);
  if (!stored) {
    return null;
  }

  memoryStore.delete(userId);

  if (Date.now() > stored.expiresAt) {
    return null;
  }

  return stored.challenge;
};

// Clean up expired challenges in memory store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (now > value.expiresAt) {
      memoryStore.delete(key);
    }
  }
}, 60 * 1000); // Every minute

type RegistrationOptions = Awaited<ReturnType<typeof generateRegistrationOptions>>;
type AuthenticationOptions = Awaited<ReturnType<typeof generateAuthenticationOptions>>;

const generateRegistrationOptionsForUser = async (user: User): Promise<RegistrationOptions> => {
  const existingCredentials = user.passkeys.map((passkey) => ({
    id: passkey.credentialId,
    transports: passkey.transports as AuthenticatorTransportFuture[] | undefined,
  }));

  const options = await generateRegistrationOptions({
    rpName: appConfig.webauthn.rpName,
    rpID: appConfig.webauthn.rpId,
    userName: user.email,
    userDisplayName: user.displayName ?? user.email,
    attestationType: 'none',
    excludeCredentials: existingCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  });

  await storeChallenge(user.id, options.challenge);

  return options;
};

const verifyAndSaveRegistration = async (
  user: User,
  response: RegistrationResponseJSON,
  displayName: string,
): Promise<PasskeyCredential> => {
  const expectedChallenge = await getAndDeleteChallenge(user.id);

  if (!expectedChallenge) {
    throw new PasskeyChallengeExpiredError();
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: appConfig.webauthn.origin,
    expectedRPID: appConfig.webauthn.rpId,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new PasskeyVerificationFailedError();
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  const passkey: PasskeyCredential = {
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString('base64url'),
    counter: credential.counter,
    displayName,
    deviceType: credentialDeviceType === 'singleDevice' ? 'singleDevice' : 'multiDevice',
    backedUp: credentialBackedUp,
    transports: response.response.transports as PasskeyCredential['transports'],
    createdAt: new Date(),
  };

  await userRepository.addPasskey(user.id, passkey);

  return passkey;
};

const generateAuthenticationOptionsForUser = async (user: User): Promise<AuthenticationOptions> => {
  const allowCredentials = user.passkeys.map((passkey) => ({
    id: passkey.credentialId,
    transports: passkey.transports as AuthenticatorTransportFuture[] | undefined,
  }));

  const options = await generateAuthenticationOptions({
    rpID: appConfig.webauthn.rpId,
    allowCredentials,
    userVerification: 'preferred',
  });

  await storeChallenge(user.id, options.challenge);

  return options;
};

const verifyAuthentication = async (
  user: User,
  response: AuthenticationResponseJSON,
): Promise<PasskeyCredential> => {
  const expectedChallenge = await getAndDeleteChallenge(user.id);

  if (!expectedChallenge) {
    throw new PasskeyChallengeExpiredError();
  }

  const passkey = user.passkeys.find((p) => p.credentialId === response.id);

  if (!passkey) {
    throw new PasskeyNotFoundError();
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: appConfig.webauthn.origin,
    expectedRPID: appConfig.webauthn.rpId,
    credential: {
      id: passkey.credentialId,
      publicKey: Buffer.from(passkey.publicKey, 'base64url'),
      counter: passkey.counter,
      transports: passkey.transports as AuthenticatorTransportFuture[] | undefined,
    },
  });

  if (!verification.verified) {
    throw new PasskeyVerificationFailedError();
  }

  // Update counter to prevent replay attacks
  await userRepository.updatePasskeyCounter(
    user.id,
    passkey.credentialId,
    verification.authenticationInfo.newCounter,
  );

  return passkey;
};

const getUserPasskeys = (user: User): PasskeyCredential[] => {
  return user.passkeys;
};

const removeUserPasskey = async (user: User, credentialId: string): Promise<void> => {
  const passkey = user.passkeys.find((p) => p.credentialId === credentialId);

  if (!passkey) {
    throw new PasskeyNotFoundError();
  }

  await userRepository.removePasskey(user.id, credentialId);
};

export const passkeyService = {
  generateRegistrationOptions: generateRegistrationOptionsForUser,
  verifyAndSaveRegistration,
  generateAuthenticationOptions: generateAuthenticationOptionsForUser,
  verifyAuthentication,
  getUserPasskeys,
  removeUserPasskey,
};
