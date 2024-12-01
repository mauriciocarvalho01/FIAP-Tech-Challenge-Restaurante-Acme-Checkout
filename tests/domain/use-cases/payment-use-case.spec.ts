import { TokenHandler } from '@/application/helpers';
import { PaymentManager } from '@/domain/use-cases';
import { PaymentRepository } from '@/infra/repos/mysql';
import { mock, MockProxy } from 'jest-mock-extended';
import { PaymentService } from '@/domain/contracts/use-cases';
import { Payment } from '@/domain/contracts/repos';

describe('PaymentManager', () => {
  let sut: PaymentManager;
  let mockPaymentRepo: MockProxy<PaymentRepository>;
  let mockTokenHandler: MockProxy<TokenHandler>;

  beforeEach(() => {
    mockPaymentRepo = mock<PaymentRepository>();
    mockTokenHandler = mock<TokenHandler>();
    sut = new PaymentManager(mockPaymentRepo, mockTokenHandler);
  });

  describe('processPaymentWebhook', () => {
    it('should process a payment webhook with created action', () => {
      const webhook: PaymentService.PaymentWebhookInput = {
        "id": "webhook_12345",
        "type": "invoice.paid",
        "created_at": "2024-11-30T12:34:56Z",
        "data": {
          "id": "2dc9728b-448c-4b7c-a8de-94a072e1cb4d",
          "code": "cd224f07-140c-406a-8d83-4b53b130148f",
          "amount": 1500,
          "currency": "BRL"
        }
      }

      const result = sut.processPaymentWebhook(webhook);
      expect(result.orderId).toBe(webhook.data.code);
      expect(result.status).toBe('Concluido');
    });

    it('should process a payment webhook with canceled action', () => {
      const webhook: PaymentService.PaymentWebhookInput = {
        "id": "webhook_12345",
        "type": "invoice.payment_failed",
        "created_at": "2024-11-30T12:34:56Z",
        "data": {
          "id": "2dc9728b-448c-4b7c-a8de-94a072e1cb4d",
          "code": "cd224f07-140c-406a-8d83-4b53b130148f",
          "amount": 1500,
          "currency": "BRL"
        }
      }

      const result = sut.processPaymentWebhook(webhook);
      expect(result.orderId).toBe(webhook.data.code);
      expect(result.status).toBe('Cancelado');
    });
  });

  describe('validatePaymentMethodRule', () => {
    it('should return true for valid payment method', () => {
      const result = sut.validatePaymentMethodRule('pix');
      expect(result).toBe(true);
    });

    it('should return true for valid payment method in uppercase', () => {
      const result = sut.validatePaymentMethodRule('PIX');
      expect(result).toBe(true);
    });

    it('should return false for invalid payment method', () => {
      const result = sut.validatePaymentMethodRule('credit card');
      expect(result).toBe(false);
    });

    it('should return false for an empty payment method', () => {
      const result = sut.validatePaymentMethodRule('');
      expect(result).toBe(false);
    });
  });

  describe('savePayment', () => {
    it('should save the payment and return the result', async () => {
      const paymentData: Payment.InsertPaymentInput = {
        paymentMethod: 'pix', // Adicionando paymentMethod
        orderId: '1',
        totalValue: 100, // Exemplo de valor, ajuste conforme necessário
        status: 'pending', // Exemplo de status, ajuste conforme necessário
        paymentId: '' // Adicionando paymentId
      };

      const savedPayment: Payment.InsertPaymentOutput = {
        id: 1, // Adicionando id
        paymentId: 'payment_123',
        totalValue: 100, // Adicionando as propriedades necessárias
        status: 'pending' // Adicionando as propriedades necessárias
      };

      mockTokenHandler.generateUuid.mockReturnValue('payment_123');
      mockPaymentRepo.savePayment.mockResolvedValue(savedPayment as any);

      const result = await sut.savePayment(paymentData);
      expect(result).toBe(savedPayment);
      expect(mockTokenHandler.generateUuid).toHaveBeenCalled();
    });

    it('should generate a paymentId if not provided', async () => {
      const paymentData: Payment.InsertPaymentInput = {
        paymentId: '',
        paymentMethod: 'pix', // Adicionando paymentMethod
        orderId: '1',
        totalValue: 100, // Exemplo de valor, ajuste conforme necessário
        status: 'pending' // Exemplo de status, ajuste conforme necessário
      };

      mockTokenHandler.generateUuid.mockReturnValue('payment_123');
      mockPaymentRepo.savePayment.mockResolvedValue({
        id: 1, // Adicionando id
        paymentId: 'payment_123',
        totalValue: 100, // Adicionando as propriedades necessárias
        status: 'pending' // Adicionando as propriedades necessárias
      } as any);

      const result = await sut.savePayment(paymentData);
      expect(result).toBeDefined();
      expect(result?.paymentId).toBe('payment_123'); // Verifica se o paymentId foi gerado
    });

    it('should throw an error if the payment is not saved', async () => {
      const paymentData: Payment.InsertPaymentInput = {
        paymentMethod: 'pix', // Adicionando paymentMethod
        orderId: '1',
        totalValue: 100, // Exemplo de valor, ajuste conforme necessário
        status: 'pending', // Exemplo de status, ajuste conforme necessário
        paymentId: 'payment_123' // Adicionando paymentId
      };

      mockPaymentRepo.savePayment.mockResolvedValue(undefined);

      await expect(sut.savePayment(paymentData)).rejects.toThrow(
        new Error('Cant insert payment')
      );
    });
  });
});
