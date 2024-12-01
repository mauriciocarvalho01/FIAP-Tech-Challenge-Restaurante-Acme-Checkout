import { Repository } from 'typeorm';
import { PaymentRepository } from '@/infra/repos/mysql';
import { mock, MockProxy } from 'jest-mock-extended';
import { EntityError } from '@/infra/errors';
import { PaymentEntity } from '@/infra/repos/mysql/entities';

describe('PaymentRepository', () => {
  let mockRepository: MockProxy<Repository<any>>;
  let sut: PaymentRepository;

  beforeEach(() => {
    // Mock do repositório
    mockRepository = mock<Repository<any>>();

    // Criar instância do PaymentRepository
    sut = new PaymentRepository(PaymentEntity);

    // Mock para getRepository retornar o mockRepository
    jest.spyOn(sut, 'getRepository').mockReturnValue(mockRepository);
  });

  describe('PaymentRepository Entity Getters', () => {
    it('should return a new PaymentEntity instance', () => {
      const paymentEntity = sut.getPaymentEntity();
      expect(paymentEntity).toBeInstanceOf(PaymentEntity);
    });
  });

  describe('savePayment', () => {
    it('should save the payment successfully', async () => {
      const paymentData = {
        orderId: 'ORDER123',
        paymentId: 'PAY123',
        status: 'PAID',
        totalValue: 200.0,
        paymentMethod: 'CREDIT_CARD',
      };

      const saveResult = {
        id: 1,
      };

      mockRepository.save.mockResolvedValue(saveResult);

      const result = await sut.savePayment(paymentData);

      expect(mockRepository.save).toHaveBeenCalledWith(paymentData);
      expect(result).toEqual({
        id: saveResult.id,
        status: paymentData.status,
        paymentId: paymentData.paymentId,
        totalValue: paymentData.totalValue,
      });
    });

    it('should throw an EntityError if saving the payment fails', async () => {
      const paymentData = {
        paymentId: 'PAY123',
        status: 'PAID',
        totalValue: 200.0,
        orderId: 'ORDER123',
        paymentMethod: 'CREDIT_CARD',
      };

      const errorMessage = 'Database error';

      mockRepository.save.mockRejectedValue(new Error(errorMessage));

      await expect(sut.savePayment(paymentData)).rejects.toThrow(EntityError);
      await expect(sut.savePayment(paymentData)).rejects.toThrow(errorMessage);
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update the payment status successfully', async () => {
      const paymentData = {
        orderId: 'ORDER123',
        status: 'PAID',
      };

      const mockPayment = {
        id: 1,
        orderId: 'ORDER123',
        paymentId: 'PAY123',
        status: 'PENDING',
        totalValue: 200.0,
        paymentMethod: 'CREDIT_CARD',
      };

      const updatedPayment = {
        ...mockPayment,
        status: 'PAID',
      };

      // Mock do repositório
      mockRepository.findOne.mockResolvedValue(mockPayment);
      mockRepository.save.mockResolvedValue(updatedPayment);

      const result = await sut.updatePaymentStatus(paymentData);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { orderId: paymentData.orderId },
      });
      expect(mockRepository.save).toHaveBeenCalledWith(updatedPayment);
      expect(result).toEqual({
        paymentId: updatedPayment.paymentId,
        status: updatedPayment.status,
      });
    });

    it('should throw an EntityError if the payment is not found', async () => {
      const paymentData = {
        orderId: 'ORDER123',
        status: 'PAID',
      };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(sut.updatePaymentStatus(paymentData)).rejects.toThrow(
        EntityError
      );
      await expect(sut.updatePaymentStatus(paymentData)).rejects.toThrow(
        'Payment not found'
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { orderId: paymentData.orderId },
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw an EntityError if there is an error updating the payment', async () => {
      const paymentData = {
        orderId: 'ORDER123',
        status: 'PAID',
      };

      const mockPayment = {
        id: 1,
        orderId: 'ORDER123',
        paymentId: 'PAY123',
        status: 'PENDING',
        totalValue: 200.0,
        paymentMethod: 'CREDIT_CARD',
      };

      mockRepository.findOne.mockResolvedValue(mockPayment);
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(sut.updatePaymentStatus(paymentData)).rejects.toThrow(
        EntityError
      );
      await expect(sut.updatePaymentStatus(paymentData)).rejects.toThrow(
        'Database error'
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { orderId: paymentData.orderId },
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockPayment,
        status: paymentData.status,
      });
    });
  });

  describe('findPayment', () => {
    it('should return payment details when payment is found', async () => {
      const input = { paymentId: 'PAY123', orderId: 'ORDER123' };

      const mockPayment = {
        id: 1,
        paymentId: 'PAY123',
        status: 'PAID',
        totalValue: '200.0',
        paymentMethod: 'CREDIT_CARD',
        pixUrl: 'http://pix-url',
        pixCode: 'PIX123',
        expirationDate: new Date('2024-01-01T12:00:00Z'),
        clientId: 'CLIENT123',
        orderId: 'ORDER123',
      };

      // Mock do repositório
      mockRepository.findOne.mockResolvedValue(mockPayment);

      const result = await sut.findPayment(input);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { paymentId: input.paymentId, orderId: input.orderId },
      });

      expect(result).toEqual({
        id: mockPayment.id,
        paymentId: mockPayment.paymentId,
        status: mockPayment.status,
        totalValue: parseFloat(mockPayment.totalValue),
        paymentMethod: mockPayment.paymentMethod,
        pixUrl: mockPayment.pixUrl,
        pixCode: mockPayment.pixCode,
        expirationDate: mockPayment.expirationDate,
        clientId: mockPayment.clientId,
        orderId: mockPayment.orderId,
      });
    });

    it('should return undefined when payment is not found', async () => {
      const input = { paymentId: 'PAY456', orderId: 'ORDER456' };

      mockRepository.findOne.mockResolvedValue(null);

      const result = await sut.findPayment(input);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { paymentId: input.paymentId, orderId: input.orderId },
      });

      expect(result).toBeUndefined();
    });

    it('should throw an EntityError when there is an error in finding payment', async () => {
      const input = { paymentId: 'PAY789', orderId: 'ORDER789' };
      const errorMessage = 'Database error';

      mockRepository.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(sut.findPayment(input)).rejects.toThrow(EntityError);
      await expect(sut.findPayment(input)).rejects.toThrow(errorMessage);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { paymentId: input.paymentId, orderId: input.orderId },
      });
    });
  });

});
