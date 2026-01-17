import type { NextFunction, Request, Response } from 'express';

import type { CreateUserRequest } from '../dtos/requests/create-user.request.dto';
import type { UpdateUserRequest } from '../dtos/requests/update-user.request.dto';
import { userToResponse } from '../mappers/user.mapper';
import * as userService from '../services/user.service';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dto = req.body as CreateUserRequest;
    const user = await userService.createUser(dto);
    res.status(201).json(userToResponse(user));
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    res.json(userToResponse(user));
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const dto = req.body as UpdateUserRequest;
    const user = await userService.updateUser(id, dto);
    res.json(userToResponse(user));
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await userService.verifyUserEmail(id);
    res.json(userToResponse(user));
  } catch (error) {
    next(error);
  }
};

export const deactivate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await userService.deactivateUser(id);
    res.json(userToResponse(user));
  } catch (error) {
    next(error);
  }
};

export const reactivate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await userService.reactivateUser(id);
    res.json(userToResponse(user));
  } catch (error) {
    next(error);
  }
};
