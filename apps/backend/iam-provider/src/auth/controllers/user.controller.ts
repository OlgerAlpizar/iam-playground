import type { NextFunction, Request, Response } from 'express';

import type { CreateUserRequest } from '../dtos/requests/create-user.request.dto';
import type { SearchUsersRequest } from '../dtos/requests/search-users.request.dto';
import type { UpdateUserRequest } from '../dtos/requests/update-user.request.dto';
import type { SearchUsersResponse } from '../dtos/responses/search-users.response.dto';
import { userToResponse } from '../mappers/user.mapper';
import { userService } from '../services/user.service';

const search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const params = req.query as unknown as SearchUsersRequest;
    const result = await userService.searchUsers(params);
    const response: SearchUsersResponse = {
      users: result.users.map(userToResponse),
      total: result.total,
      limit: result.limit,
      skip: result.skip,
      hasMore: result.hasMore,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dto = req.body as CreateUserRequest;
    const user = await userService.createUser(dto);
    res.status(201).json(userToResponse(user));
  } catch (error) {
    next(error);
  }
};

const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    res.json(userToResponse(user));
  } catch (error) {
    next(error);
  }
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const dto = req.body as UpdateUserRequest;
    const user = await userService.updateUser(id, dto);
    res.json(userToResponse(user));
  } catch (error) {
    next(error);
  }
};

const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await userService.verifyUserEmail(id);
    res.json(userToResponse(user));
  } catch (error) {
    next(error);
  }
};

const deactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await userService.deactivateUser(id);
    res.json(userToResponse(user));
  } catch (error) {
    next(error);
  }
};

const reactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await userService.reactivateUser(id);
    res.json(userToResponse(user));
  } catch (error) {
    next(error);
  }
};

export const userController = {
  search,
  create,
  getById,
  update,
  remove,
  verifyEmail,
  deactivate,
  reactivate,
};
