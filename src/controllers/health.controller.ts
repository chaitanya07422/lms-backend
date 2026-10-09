import type { Request, Response } from 'express';

import { sendSuccess } from '../utils/response';

export function getHealth(_req: Request, res: Response): void {
  sendSuccess(res, {
    status: 'ok',
    uptime: process.uptime(),
  });
}
