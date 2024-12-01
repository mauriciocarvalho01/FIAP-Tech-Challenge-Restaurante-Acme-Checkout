import { Payment } from '../repos';

export interface PaymentService {
  processPaymentWebhook: (
    webhook: PaymentService.PaymentWebhookInput
  ) => PaymentService.GenericType;
  validatePaymentMethodRule: (paymentMethod: string) => boolean;
  validatePaymentStatusRule: (order: Payment.Order) => boolean
  savePayment: (
    paymentData: Payment.InsertPaymentInput
  ) => Promise<Payment.InsertPaymentOutput>
}

export namespace PaymentService {
  export type GenericType<T = any> = T;

  export type PaymentWebhookInput = {
    /**
     * Weebhook recebido do gateway de pagamento
     */
    id: string;
    type: string;
    created_at: string;
    data: {
      id: string;
      code: string;
      amount: number;
      currency: string;
    };
  };
}
