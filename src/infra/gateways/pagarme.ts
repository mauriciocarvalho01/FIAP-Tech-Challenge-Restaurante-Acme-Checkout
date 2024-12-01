import { PaymentGateway } from '@/infra/gateways';

export class Pagarme implements PaymentGateway {
  async pixGenerate(
    paymentData: PaymentGateway.PaymentData
  ): Promise<PaymentGateway.PixGenerateResponse> {
    return await this.createPaymentWithPix(paymentData);
  }

  private createPaymentWithPix(
    paymentData: PaymentGateway.PaymentData
  ): Promise<PaymentGateway.PixGenerateResponse> {
    return new Promise<PaymentGateway.PixGenerateResponse>((resolve) => {
      // Aqui podemos implementat a lógica para gerar o PIX usando a API do Pagarme
      // Por exemplo:
      const pixUrl = 'https://example.com/pix'; // URL gerada para o PIX
      const pixCode = '1234567890'; // Código do PIX gerado
      const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expira em 24 horas
      resolve({
        ...paymentData,
        paymentMethod: 'Pix',
        status: 'Processando',
        pixUrl,
        pixCode,
        expirationDate,
      });
    });
  }
}
