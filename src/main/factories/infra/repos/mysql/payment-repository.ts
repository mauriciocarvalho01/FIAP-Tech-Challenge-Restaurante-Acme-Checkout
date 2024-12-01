import { PaymentRepository } from '@/infra/repos/mysql';
import { PaymentEntity } from '@/infra/repos/mysql/entities';

export const makePaymentRepo = (): PaymentRepository => {
  return new PaymentRepository(PaymentEntity);
};
