import { logger } from '@/infra/helpers';

export class PaymentServiceError extends Error {
  constructor(error: Error) {
    super(error.message);
    this.name = 'ServerError';
    this.stack = error?.stack;
    logger.error(`[${this.name}] ${error?.message}`);
  }
}
