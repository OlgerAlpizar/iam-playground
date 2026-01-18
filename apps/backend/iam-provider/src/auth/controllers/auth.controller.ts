import { generateDeviceFingerprint } from '@authentication/backend-express/utils';
import type { NextFunction, Request, Response } from 'express';

import type { LoginRequest } from '../dtos/requests/login.request.dto';
import type { RefreshTokenRequest } from '../dtos/requests/refresh-token.request.dto';
import type { RegisterRequest } from '../dtos/requests/register.request.dto';
import { authService } from '../services/auth.service';

const getTokenContext = (req: Request) => ({
  deviceFingerprint: generateDeviceFingerprint(req),
  userAgent: req.headers['user-agent'],
  ipAddress: req.ip,
});

const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dto = req.body as RegisterRequest;
    const context = getTokenContext(req);
    const result = await authService.register(dto, context);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dto = req.body as LoginRequest;
    const context = getTokenContext(req);
    const result = await authService.login(dto, context);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = req.body as RefreshTokenRequest;
    const context = getTokenContext(req);
    const result = await authService.refreshTokens(token, context);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = req.body as RefreshTokenRequest;
    await authService.logout(token);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const logoutAllDevices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const revokedCount = await authService.logoutAllDevices(userId);
    res.json({ revokedSessions: revokedCount });
  } catch (error) {
    next(error);
  }
};

export const authController = {
  register,
  login,
  refreshToken,
  logout,
  logoutAllDevices,
};
