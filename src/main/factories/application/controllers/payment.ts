import {
  makePaymentRepo,
} from '@/main/factories/infra/repos/mysql';
import {
  makePaymentService,
} from '@/main/factories/domain/use-cases';
import { PaymentController } from '@/application/controllers';
import { makePaymentGateway } from '@/main/factories/infra/gateways';
import { makeMessageBroker } from '@/main/factories/infra/message-broker';
import { makeValidator } from '@/main/factories/application/validation';

export const makePaymentController = (): PaymentController => {
  return new PaymentController(
    makeValidator(),
    makePaymentRepo(),
    makePaymentService(),
    makePaymentGateway(),
    makeMessageBroker()
  );
};
