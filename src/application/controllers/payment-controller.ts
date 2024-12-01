import { PaymentRepository } from '@/infra/repos/mysql';
import {
  ok,
  created,
  notFound,
  badRequest,
  HttpResponse,
  serverError,
} from '@/application/helpers';
import { PaymentGateway } from '@/infra/gateways';
import { Validator } from '@/application/validation';
import { EntityError, TransactionError } from '@/infra/errors';
import { PaymentService } from '@/domain/contracts/use-cases';
import { PaymentHttp } from '@/domain/contracts/gateways';
import { MessageBroker } from '@/domain/contracts/message-broker';
import { PaymentServiceError } from '@/domain/errors';

export class PaymentController {
  constructor(
    private readonly validator: Validator,
    private readonly paymentRepo: PaymentRepository,
    private readonly paymentService: PaymentService,
    private readonly paymentGateway: PaymentGateway,
    private readonly messageBroker: MessageBroker
  ) {}

  // POST /checkout
  async handleCreateCheckout(
    { paymentMethod, order }: PaymentHttp.CreateCheckoutInput
  ): Promise<HttpResponse<PaymentHttp.CreateCheckoutOutput | Error>> {
    await this.paymentRepo.prepareTransaction();

    if (
      !this.paymentService.validatePaymentMethodRule(paymentMethod)
    ) {
      return badRequest(
        new Error(
          `Cant not create payment with paymentMethod ${paymentMethod}`
        )
      );
    }

    if (
      !this.paymentService.validatePaymentStatusRule(order)
    ) {
      return badRequest(
        new Error(
          `Cant not create payment with order status ${order.status}`
        )
      );
    }

    await this.paymentRepo.openTransaction();

    try {
      // Cria a entidade de pagamento
      const paymentEntity = this.paymentRepo.getPaymentEntity()

      paymentEntity.totalValue = order.totalValue;
      paymentEntity.clientId = order.clientId;

      const pixGenerated = await this.paymentGateway.pixGenerate(order);

      if (pixGenerated ===  undefined) {
        throw new TransactionError(
          new Error(
            `Payment with order ID ${order.orderId} not perform successfull transaction`
          )
        );
      }

      const savedPayment = await this.paymentService.savePayment(
        Object.assign(paymentEntity, pixGenerated)
      );

      if (savedPayment ===  undefined) {
        throw new TransactionError(
          new Error(
            `Payment with order ID ${order.orderId} not perform successfull transaction`
          )
        );
      }

      await this.paymentRepo.commit();

      return created({
        orderId: order?.orderId,
        status: savedPayment?.status,
        paymentId: savedPayment.paymentId,
      });
    } catch (error) {
      console.log(error)
      if (error instanceof TransactionError) {
        await this.paymentRepo.rollback();
      }

      if (
        error instanceof PaymentServiceError ||
        error instanceof EntityError ||
        error instanceof TransactionError
      ) {
        return badRequest(new Error(error.message));
      }

      return serverError(error);
    } finally {
      await this.paymentRepo.closeTransaction();
    }
  }

  // POST /webhook
  async handleUpdatePaymentStatus(
    webhookPaymentData: PaymentHttp.UpdatePaymentStatusInput
  ): Promise<HttpResponse<PaymentHttp.UpdatePaymentStatusOutput | Error>> {
    await this.paymentRepo.prepareTransaction();

    await this.paymentRepo.openTransaction();

    try {
      const paymentData =
        this.paymentService.processPaymentWebhook(webhookPaymentData);

      if (!paymentData.orderId) {
        return badRequest(
          new Error('Cannot update payment status: orderId not found')
        );
      }

      if (!paymentData.status) {
        return badRequest(
          new Error('Cannot update payment status: status not found')
        );
      }

      await this.handleGetCheckout({ orderId: paymentData.orderId })
      .then(({ data }) => {
        if ((data instanceof  Error) || data === undefined) {
          throw new EntityError(`Payment with orderId ${paymentData.orderId} not found`)
        }
      }).catch(() => {
        throw new EntityError(`Payment with orderId ${paymentData.orderId} not found`)
      })

      const savedPayment = await this.paymentRepo.updatePaymentStatus(paymentData)
      .then(async (payment) => payment)
      .catch((error) => {
        throw new TransactionError(new Error(error.message))
      });

      if(savedPayment === undefined) throw new Error(`Cannot save payment with orderID: ${paymentData.orderId}`)


      const kitchenChannel = this.messageBroker.getChannel('kitchen')

      await this.messageBroker.sendToQueue(
        kitchenChannel,
        {
          queueName: 'kitchen',
          message: savedPayment
        }
      )

      await this.paymentRepo.commit();

      return created({
        paymentId: savedPayment.paymentId,
        status: savedPayment.status
      });
    } catch (error) {

      if (error instanceof TransactionError) {
        await this.paymentRepo.rollback();
      }

      if (
        error instanceof PaymentServiceError ||
        error instanceof EntityError ||
        error instanceof TransactionError
      ) {
        return badRequest(new Error(error.message));
      }

      return serverError(error);
    } finally {
      await this.paymentRepo.closeTransaction();
    }
  }

  async handleGetCheckout(
    httpRequest: PaymentHttp.GetPaymentInput
  ): Promise<HttpResponse<PaymentHttp.GetPaymentOutput | Error>> {
    try {
      const payment = await this.paymentRepo.findPayment({
        paymentId: httpRequest.paymentId,
        orderId: httpRequest.orderId
      });
      if (payment === undefined) return notFound();
      return ok(payment);
    } catch (error) {
      if (
        error instanceof EntityError
      ) {
        return badRequest(new Error(error.message));
      }
      return serverError(error);
    }
  }
}
