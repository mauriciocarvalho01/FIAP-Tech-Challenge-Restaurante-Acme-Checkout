import { MySQLRepository } from '@/infra/repos/mysql/repository';
import { Payment } from '@/domain/contracts/repos';
import { EntityError } from '@/infra/errors';

export class PaymentRepository extends MySQLRepository implements Payment {
  constructor(
    private readonly paymentEntity: Payment.GenericType
  ) {
    super();
  }

  getPaymentEntity = () => new this.paymentEntity();

  getPaymentStatus = () => this.paymentEntity.PaymentStatus

  async savePayment(
    paymentData: Payment.InsertPaymentInput
  ): Promise<Payment.InsertPaymentOutput> {
    try {
      const paymentRepo = this.getRepository(this.paymentEntity);

      const payment = await paymentRepo.findOne({
        where: { orderId: paymentData.orderId }
      });

      const saveResult = await paymentRepo.save({ id: payment?.id, ...paymentData });

      if (saveResult !== null) {
        return {
          id: saveResult.id,
          status: paymentData.status,
          paymentId: paymentData.paymentId,
          totalValue: paymentData.totalValue,
        };
      }
    } catch (error: any) {
      throw new EntityError(error.message);
    }
  }

  async updatePaymentStatus(
    paymentData: Payment.UpdatePaymentStatusInput
  ): Promise<Payment.UpdatePaymentStatusOutput> {
    try {
      const paymentRepo = this.getRepository(this.paymentEntity);

      const payment = await paymentRepo.findOne({
        where: { orderId: paymentData.orderId }
      });

      if (!payment) throw new EntityError('Payment not found');

      const paymentStatus = paymentData.status;

      payment.status = paymentStatus;
      const savedPayment = await paymentRepo.save(payment);
      if (savedPayment !== null) {
        return {
          paymentId: payment.paymentId,
          status: payment.status,
        };
      }
    } catch (error: any) {
      throw new EntityError(error.message);
    }
  }

  async findPayment({
    paymentId,
    orderId
  }: Payment.FindPaymentInput): Promise<Payment.FindPaymentOutput> {
    try {
      const paymentRepo = this.getRepository(this.paymentEntity);

      const paymentPayment = await paymentRepo.findOne({
        where: { paymentId: paymentId, orderId: orderId }
      });

      if (paymentPayment !== null) {
        return {
          id: paymentPayment.id,
          paymentId: paymentPayment.paymentId,
          status: paymentPayment.status,
          totalValue: parseFloat(paymentPayment.totalValue),
          paymentMethod: paymentPayment.paymentMethod,
          pixUrl: paymentPayment.pixUrl,
          pixCode: paymentPayment.pixCode,
          expirationDate: paymentPayment.expirationDate,
          clientId: paymentPayment.clientId,
          orderId: paymentPayment.orderId,
        };
      }
    } catch (error: any) {
      throw new EntityError(error.message);
    }
  }
}
