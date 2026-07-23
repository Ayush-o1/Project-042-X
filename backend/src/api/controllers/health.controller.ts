import { Request, Response } from 'express';

export class HealthController {
  public static check(_req: Request, res: Response) {
    res.status(200).json({
      success: true,
      data: {
        status: 'UP',
        timestamp: new Date().toISOString(),
      }
    });
  }
}
