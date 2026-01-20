import type { NextFunction, Request, Response } from 'express';

import type { PasskeyLoginOptionsRequest } from '../dtos/requests/passkey-login-options.request.dto';
import type { PasskeyLoginVerifyRequest } from '../dtos/requests/passkey-login-verify.request.dto';
import type { PasskeyRegisterVerifyRequest } from '../dtos/requests/passkey-register-verify.request.dto';
import { UserNotFoundError } from '../errors/user-not-found.error';
import { userRepository } from '../repositories/user.repository';
import { authService } from '../services/auth.service';
import { passkeyService } from '../services/passkey.service';
import { getTokenContext } from '../utils/token.utils';

// Registration endpoints (require authenticated user)

const getRegistrationOptions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await userRepository.getUserById(userId);
    const options = await passkeyService.generateRegistrationOptions(user);

    res.json(options);
  } catch (error) {
    next(error);
  }
};

const verifyRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { response, displayName } = req.body as PasskeyRegisterVerifyRequest;
    const user = await userRepository.getUserById(userId);
    const passkey = await passkeyService.verifyAndSaveRegistration(user, response, displayName);

    res.status(201).json({
      message: 'Passkey registered successfully',
      passkey: {
        credentialId: passkey.credentialId,
        displayName: passkey.displayName,
        deviceType: passkey.deviceType,
        backedUp: passkey.backedUp,
        createdAt: passkey.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Authentication endpoints (public)

const getAuthenticationOptions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body as PasskeyLoginOptionsRequest;
    const user = await userRepository.findUserByEmail(email);

    if (!user || user.passkeys.length === 0) {
      throw new UserNotFoundError(email);
    }

    const options = await passkeyService.generateAuthenticationOptions(user);

    res.json(options);
  } catch (error) {
    next(error);
  }
};

const verifyAuthentication = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, response } = req.body as PasskeyLoginVerifyRequest;
    const context = getTokenContext(req);

    const user = await userRepository.findUserByEmail(email);

    if (!user) {
      throw new UserNotFoundError(email);
    }

    await passkeyService.verifyAuthentication(user, response);

    // Generate tokens (same as regular login)
    const result = await authService.loginWithPasskey(user, context);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Management endpoints (require authenticated user)

const listPasskeys = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await userRepository.getUserById(userId);
    const passkeys = passkeyService.getUserPasskeys(user);

    res.json({
      passkeys: passkeys.map((p) => ({
        credentialId: p.credentialId,
        displayName: p.displayName,
        deviceType: p.deviceType,
        backedUp: p.backedUp,
        createdAt: p.createdAt,
        lastUsedAt: p.lastUsedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const deletePasskey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { credentialId } = req.params;
    const user = await userRepository.getUserById(userId);

    await passkeyService.removeUserPasskey(user, credentialId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const passkeyController = {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  listPasskeys,
  deletePasskey,
};
