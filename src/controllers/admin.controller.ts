import type { Request, Response } from 'express';

import * as adminService from '../services/admin.service';
import { sendSuccess } from '../utils/response';
import type { CreateUserBody } from '../validators/admin.validators';

export async function createUser(req: Request, res: Response): Promise<void> {
  const user = await adminService.createUserByAdmin(req.body as CreateUserBody);
  sendSuccess(res, { user }, 201);
}
