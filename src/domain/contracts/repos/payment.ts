export interface Payment {
  savePayment: (
    input: Payment.InsertPaymentInput
  ) => Promise<Payment.InsertPaymentOutput>;
  updatePaymentStatus: (
    paymentData: Payment.UpdatePaymentStatusInput
  ) => Promise<Payment.UpdatePaymentStatusOutput>;
  findPayment: ({
    paymentId,
  }: Payment.FindPaymentInput) => Promise<Payment.FindPaymentOutput>;
}

export namespace Payment {

  export enum PaymentStatus {
    PENDENTE = 'Pendente',
    PROCESSANDO = 'Processando',
    CONCLUIDO = 'Concluido',
    CANCELADO = 'Cancelado',
  }

  export type saveOptions =
    | undefined
    | {
        update?: boolean;
        insert?: boolean;
      };

  export type GenericType<T = any> = T;

  // Payment properties
  export type FindPaymentInput = { paymentId?: string, orderId?: string };

  export type InsertPaymentInput = {
    paymentId: string;
    totalValue: number;
    paymentMethod: string;
    status: string;
    orderId: string;
  };

  export type FindPaymentOutput =
    | undefined
    | {
        id: number;
        paymentId: string;
        totalValue: number;
        paymentMethod: string;
        status: string;
        pixUrl: string;
        pixCode: string;
        expirationDate: Date;
        clientId?: string;
        orderId: string;
      };

  export type InsertPaymentOutput =
    | undefined
    | {
        id: number;
        status: string;
        paymentId: string;
        totalValue: number;
      };

  export type CreatePaymentInput = {
    orderId: string;
    paymentMethod: string;
  };

  export type UpdatePaymentStatusInput = {
    orderId: string;
    status: string;
  };

  export type UpdatePaymentStatusOutput =
    | undefined
    | {
        status: string;
        paymentId: string;
      };

  // Order
  export type Order = {
    orderId: string;
    status: string;
    clientId?: string;
    totalValue: number;
  };
}
