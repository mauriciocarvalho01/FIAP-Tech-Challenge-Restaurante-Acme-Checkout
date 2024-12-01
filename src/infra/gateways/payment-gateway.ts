import { Payment } from '@/domain/contracts/repos';

export interface PaymentGateway {
  pixGenerate(
    paymentData: PaymentGateway.PaymentData
  ): Promise<PaymentGateway.PixGenerateResponse>;
}

export namespace PaymentGateway {
  export type PixGenerateResponse = {
    paymentMethod: string;
    pixUrl: string;
    pixCode: string;
    totalValue: number;
    clientId?: string;
    expirationDate: Date;
  } | undefined;

  export type PaymentData<T=any> = T;
}
