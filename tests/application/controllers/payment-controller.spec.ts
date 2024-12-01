import { MessageBroker } from './../../../src/domain/contracts/message-broker/index';
import { PaymentController } from '@/application/controllers/payment-controller'; // Ajuste o caminho conforme necessário
import { PaymentRepository } from '@/infra/repos/mysql';
import { Validator } from '@/application/validation';
import { PaymentService } from '@/domain/contracts/use-cases';
import { PaymentGateway } from '@/infra/gateways';
import { EntityError } from '@/infra/errors';

import {
  ok,
  notFound,
  serverError,
  created,
  badRequest,
} from '@/application/helpers';

import { PaymentEntity } from '@/infra/repos/mysql/entities';

import { mock, MockProxy } from 'jest-mock-extended';

describe('sut', () => {
  let sut: PaymentController;
  let mockPaymentRepo: MockProxy<PaymentRepository>;
  let mockValidator: MockProxy<Validator>;
  let mockPaymentService: MockProxy<PaymentService>;
  let mockPaymentGateway: MockProxy<PaymentGateway>;
  let mockMessageBroker: MockProxy<MessageBroker>;

  beforeEach(() => {
    mockPaymentRepo = mock();
    mockValidator = mock();
    mockPaymentService = mock();
    mockPaymentGateway = mock();
    mockMessageBroker = mock();

    sut = new PaymentController(
      mockValidator,
      mockPaymentRepo,
      mockPaymentService,
      mockPaymentGateway,
      mockMessageBroker
    );
  });

  describe('handleGetCheckout', () => {
    it('should return payment details successfully', async () => {
      const paymentDetails = {
        id: 1, // Adicionei o ID
        paymentId: '123',
        totalValue: 200,
        paymentMethod: 'credit_card',
        status: 'approved',
        pixUrl: 'some-url',
        pixCode: 'some-code',
        expirationDate: new Date(),
        orderId: '1', // Adicionei a propriedade `order` (pode ser um objeto vazio se não for relevante no teste)
      };

      // Mockando a dependência para retornar os detalhes do pagamento
      mockPaymentRepo.findPayment.mockResolvedValue(paymentDetails);

      // Executando o método handleGetCheckout
      const response = await sut.handleGetCheckout({
        paymentId: paymentDetails.paymentId,
        orderId: paymentDetails.orderId,
      });

      // Verificando se a resposta está correta
      expect(response).toEqual(ok(paymentDetails));
    });

    it('should return notFound if the payment does not exist', async () => {
      const paymentId = ''; // Um paymentId que não existe
      const orderId = ''; // Um orderId que não existe
      // Mockando a dependência para retornar undefined, simulando pagamento não encontrado
      mockPaymentRepo.findPayment.mockResolvedValue(undefined);

      // Executando o método handleGetCheckout
      const response = await sut.handleGetCheckout({ paymentId, orderId });

      // Verificando se a resposta é "notFound"
      expect(response).toEqual(notFound());
    });

    it('should return bad request if error on payment save', async () => {
      const paymentId = '123';

      // Mockando um erro durante a busca do pagamento
      mockPaymentRepo.findPayment.mockRejectedValue(
        new EntityError('Find payment failed')
      );

      // Executando o método handleGetCheckout
      const response = await sut.handleGetCheckout({ paymentId });

      // Verificando se a resposta é "serverError"
      expect(response).toEqual(badRequest(new Error('Find payment failed')));
    });

    it('return server error if error on payment savel', async () => {
      const paymentId = '123';

      // Mockando um erro durante a busca do pagamento
      mockPaymentRepo.findPayment.mockRejectedValue(
        new Error('Find payment failed')
      );

      // Executando o método handleGetCheckout
      const response = await sut.handleGetCheckout({ paymentId });

      // Verificando se a resposta é "serverError"
      expect(response).toEqual(serverError(new Error('Find payment failed')));
    });
  });

  describe('handleCreateCheckout', () => {
    it('should return bad request if paymentMethod is missing', async () => {
      const invalidPaymentData = {
        paymentMethod: '',
        order: {
          orderId: '1',
          status: 'Pendente',
          clientId: '1',
          totalValue: 100,
        },
      }; // Simulando ausência de paymentMethod

      const response = await sut.handleCreateCheckout(invalidPaymentData);

      expect(response).toEqual(
        badRequest(
          new Error(
            `Cant not create payment with paymentMethod ${invalidPaymentData.paymentMethod}`
          )
        )
      );
    });

    it('should return bad request if payment status rule validation fails', async () => {
      const invalidPaymentData = {
        paymentMethod: 'Pix',
        order: {
          orderId: '1',
          status: 'teste',
          clientId: '1',
          totalValue: 100,
        },
      }; // Simulando ausência de paymentMethod

      mockPaymentService.validatePaymentMethodRule.mockReturnValue(true);
      mockPaymentService.validatePaymentStatusRule.mockReturnValue(false);

      const response = await sut.handleCreateCheckout(invalidPaymentData);

      expect(response).toEqual(
        badRequest(
          new Error(
            `Cant not create payment with order status ${invalidPaymentData.order.status}`
          )
        )
      );
    });

    it('should return bad request if payment not perform successfull transaction', async () => {
      const validPaymentData = {
        paymentMethod: '',
        order: {
          orderId: '1',
          status: 'Recebido',
          clientId: '1',
          totalValue: 100,
        },
      }; // Simulando ausência de paymentMethod

      mockPaymentService.validatePaymentMethodRule.mockReturnValue(true);
      mockPaymentService.validatePaymentStatusRule.mockReturnValue(true);
      mockPaymentRepo.getPaymentEntity.mockReturnValue(new PaymentEntity());
      mockPaymentService.savePayment.mockRejectedValue(undefined);
      mockPaymentGateway.pixGenerate.mockResolvedValue(undefined);

      const response = await sut.handleCreateCheckout(validPaymentData);

      expect(response).toEqual(
        badRequest(
          new Error(
            `Payment with order ID ${validPaymentData.order.orderId} not perform successfull transaction`
          )
        )
      );
      expect(mockPaymentRepo.rollback).toHaveBeenCalled();
    });

    it('should return created response if payment is successful', async () => {
      const validPaymentData = {
        paymentMethod: '',
        order: {
          orderId: '1',
          status: 'Recebido',
          clientId: '1',
          totalValue: 100,
        },
      }; // Simulando ausência de paymentMethod

      const paymentEntity = {
        id: 1,
        paymentId: 'abc123',
        totalValue: 100,
        status: 'Processando',
        pixUrl: 'url',
        pixCode: 'code',
        expirationDate: new Date(),
      };

      const pixResponse = {
        ...validPaymentData,
        pixUrl: 'url',
        pixCode: 'code',
        expirationDate: new Date(),
        paymentMethod: validPaymentData.paymentMethod, // Adicionando a propriedade paymentMethod
        totalValue: 100,
      };

      mockPaymentService.savePayment.mockResolvedValue(paymentEntity);
      mockPaymentGateway.pixGenerate.mockResolvedValue(pixResponse);
      mockPaymentService.validatePaymentMethodRule.mockReturnValue(true);
      mockPaymentService.validatePaymentStatusRule.mockReturnValue(true);
      mockPaymentRepo.getPaymentEntity.mockReturnValue(new PaymentEntity());

      const response = await sut.handleCreateCheckout(validPaymentData);

      expect(response).toEqual(
        created({
          orderId: validPaymentData.order.orderId,
          status: paymentEntity.status,
          paymentId: paymentEntity.paymentId,
        })
      );
      expect(mockPaymentRepo.commit).toHaveBeenCalled();
    });

    it('should rollback transaction and return bad request on TransactionError', async () => {
      const validPaymentData = {
        paymentMethod: '',
        order: {
          orderId: '1',
          status: 'Recebido',
          clientId: '1',
          totalValue: 100,
        },
      }; // Simulando ausência de paymentMethod

      const pixResponse = {
        ...validPaymentData,
        pixUrl: 'url',
        pixCode: 'code',
        expirationDate: new Date(),
        paymentMethod: validPaymentData.paymentMethod, // Adicionando a propriedade paymentMethod
        totalValue: 100,
      };

      mockPaymentService.savePayment.mockResolvedValue(undefined);
      mockPaymentGateway.pixGenerate.mockResolvedValue(pixResponse);
      mockPaymentService.validatePaymentMethodRule.mockReturnValue(true);
      mockPaymentService.validatePaymentStatusRule.mockReturnValue(true);
      mockPaymentRepo.getPaymentEntity.mockReturnValue(new PaymentEntity());

      const response = await sut.handleCreateCheckout(validPaymentData);

      expect(response).toEqual(
        badRequest(
          new Error(
            `Payment with order ID ${validPaymentData.order.orderId} not perform successfull transaction`
          )
        )
      );
      expect(mockPaymentRepo.rollback).toHaveBeenCalled();
    });

    it('should handle unexpected server errors', async () => {
      const validPaymentData = {
        paymentMethod: '',
        order: {
          orderId: '1',
          status: 'Recebido',
          clientId: '1',
          totalValue: 100,
        },
      }; // Simulando ausência de paymentMethod

      const pixResponse = {
        ...validPaymentData,
        pixUrl: 'url',
        pixCode: 'code',
        expirationDate: new Date(),
        paymentMethod: validPaymentData.paymentMethod, // Adicionando a propriedade paymentMethod
        totalValue: 100,
      };

      mockPaymentGateway.pixGenerate.mockResolvedValue(pixResponse);
      mockPaymentService.validatePaymentMethodRule.mockReturnValue(true);
      mockPaymentService.validatePaymentStatusRule.mockReturnValue(true);
      mockPaymentRepo.getPaymentEntity.mockReturnValue(new PaymentEntity());

      mockPaymentGateway.pixGenerate.mockRejectedValue(
        new Error('Unexpected error')
      );

      const response = await sut.handleCreateCheckout(validPaymentData);

      expect(response).toEqual(serverError(new Error('Unexpected error')));
    });
  });

  describe('handleUpdatePaymentStatus', () => {
    it('should return bad request if orderId is missing', async () => {
      const webhookData = {
        id: 'webhook_12345',
        type: 'invoice.payment_failed',
        created_at: '2024-11-30T12:34:56Z',
        data: {
          id: '2dc9728b-448c-4b7c-a8de-94a072e1cb4d',
          code: 'cd224f07-140c-406a-8d83-4b53b130148f',
          amount: 1500,
          currency: 'BRL',
        },
      }; // Simulando orderId ausente

      mockPaymentService.processPaymentWebhook.mockReturnValue(webhookData);

      const response = await sut.handleUpdatePaymentStatus(webhookData);

      expect(response).toEqual(
        badRequest(new Error('Cannot update payment status: orderId not found'))
      );
    });

    it('should return bad request if status is missing', async () => {
      const webhookData = {
        id: 'webhook_12345',
        type: 'invoice.payment_failed',
        created_at: '2024-11-30T12:34:56Z',
        data: {
          id: '2dc9728b-448c-4b7c-a8de-94a072e1cb4d',
          code: 'cd224f07-140c-406a-8d83-4b53b130148f',
          amount: 1500,
          currency: 'BRL',
        },
      };

      mockPaymentService.processPaymentWebhook.mockReturnValue({
        orderId: webhookData.data.code,
        ...webhookData,
      });

      const response = await sut.handleUpdatePaymentStatus(webhookData);

      expect(response).toEqual(
        badRequest(new Error('Cannot update payment status: status not found'))
      );
    });

    it('should throw EntityError if checkout is not found', async () => {
      const webhookData = {
        id: 'webhook_12345',
        type: 'invoice.payment_failed',
        created_at: '2024-11-30T12:34:56Z',
        data: {
          id: '2dc9728b-448c-4b7c-a8de-94a072e1cb4d',
          code: 'cd224f07-140c-406a-8d83-4b53b130148f',
          amount: 1500,
          currency: 'BRL',
        },
      };
      mockPaymentService.processPaymentWebhook.mockReturnValue({
        status: 'Processando',
        orderId: webhookData.data.code,
        ...webhookData,
      });
      mockPaymentRepo.findPayment.mockResolvedValue(undefined);

      const response = await sut.handleUpdatePaymentStatus(webhookData);

      expect(response).toEqual(
        badRequest(
          new Error(`Payment with orderId ${webhookData.data.code} not found`)
        )
      );
    });

    it('should successfully update payment status and send message to the queue', async () => {
      const updatedPayment = {
        paymentId: 'abc123',
        status: 'approved',
      };

      const webhookData = {
        id: 'webhook_12345',
        type: 'invoice.payment_failed',
        created_at: '2024-11-30T12:34:56Z',
        data: {
          id: '2dc9728b-448c-4b7c-a8de-94a072e1cb4d',
          code: 'cd224f07-140c-406a-8d83-4b53b130148f',
          amount: 1500,
          currency: 'BRL',
        },
      };

      const paymentEntity = {
        id: 1,
        paymentId: '1',
        totalValue: 100,
        paymentMethod: 'Pix',
        status: 'Cancelado',
        pixUrl: 'https://pix.teste.com/code',
        pixCode: '123',
        expirationDate: '2024-12-01T00:00:00',
        clientId: '1',
        orderId: '1',
      };

      mockPaymentService.processPaymentWebhook.mockReturnValue({
        status: 'Processando',
        orderId: webhookData.data.code,
        ...webhookData,
      });
      mockPaymentRepo.updatePaymentStatus.mockResolvedValue(updatedPayment);
      mockMessageBroker.getChannel.mockReturnValue('kitchen');

      sut.handleGetCheckout = jest.fn().mockResolvedValue({
        statusCode: 200,
        data: paymentEntity,
      });

      const response = await sut.handleUpdatePaymentStatus(webhookData);

      expect(mockMessageBroker.sendToQueue).toHaveBeenCalledWith(
        mockMessageBroker.getChannel('kitchen'),
        {
          queueName: 'kitchen',
          message: updatedPayment,
        }
      );
      expect(response).toEqual(created(updatedPayment));
    });

    it('should handle transaction errors and rollback if an error occurs', async () => {
      const webhookData = {
        id: 'webhook_12345',
        type: 'invoice.payment_failed',
        created_at: '2024-11-30T12:34:56Z',
        data: {
          id: '2dc9728b-448c-4b7c-a8de-94a072e1cb4d',
          code: 'cd224f07-140c-406a-8d83-4b53b130148f',
          amount: 1500,
          currency: 'BRL',
        },
      };

      const paymentEntity = {
        id: 1,
        paymentId: '1',
        totalValue: 100,
        paymentMethod: 'Pix',
        status: 'Cancelado',
        pixUrl: 'https://pix.teste.com/code',
        pixCode: '123',
        expirationDate: '2024-12-01T00:00:00',
        clientId: '1',
        orderId: '1',
      };

      sut.handleGetCheckout = jest.fn().mockResolvedValue({
        statusCode: 200,
        data: paymentEntity,
      });

      mockPaymentService.processPaymentWebhook.mockReturnValue({
        status: 'Processando',
        orderId: webhookData.data.code,
        ...webhookData,
      });
      mockPaymentRepo.updatePaymentStatus.mockRejectedValue(
        new Error('Transaction failed')
      );

      const response = await sut.handleUpdatePaymentStatus(webhookData);

      expect(mockPaymentRepo.rollback).toHaveBeenCalled();
      expect(response).toEqual(badRequest(new Error('Transaction failed')));
    });

    it('should return serverError for unexpected errors', async () => {
      const webhookData = {
        id: 'webhook_12345',
        type: 'invoice.payment_failed',
        created_at: '2024-11-30T12:34:56Z',
        data: {
          id: '2dc9728b-448c-4b7c-a8de-94a072e1cb4d',
          code: 'cd224f07-140c-406a-8d83-4b53b130148f',
          amount: 1500,
          currency: 'BRL',
        },
      };

      mockPaymentService.processPaymentWebhook.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await sut.handleUpdatePaymentStatus(webhookData);

      expect(response).toEqual(serverError(new Error('Unexpected error')));
    });
  });
});
