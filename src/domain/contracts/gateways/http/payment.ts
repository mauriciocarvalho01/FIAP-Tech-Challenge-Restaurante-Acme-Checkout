import { PaymentService } from '@/domain/contracts/use-cases';
import { Payment } from '@/domain/contracts/repos';

export namespace PaymentHttp {
  // API types contracts
  export type GenericType<T=any> = T
  // GET /checkout
  export type GetPaymentInput = { paymentId?: string, orderId?: string };

  export type GetPaymentOutput = Payment.FindPaymentOutput;

  // POST /checkout
  export type CreateCheckoutInput = {
    /**
     * paymentMethod aceita somente 'PIX'
     */
    order: Payment.Order;
    paymentMethod: string;
  };

  export type CreateCheckoutOutput = {
    orderId: string;
    paymentId: string;
    status: string;
  };

  export type UpdatePaymentStatusInput = PaymentService.PaymentWebhookInput;

  export type UpdatePaymentStatusOutput =
    | undefined
    | {
        status: string;
        paymentId: string;
      };
}
