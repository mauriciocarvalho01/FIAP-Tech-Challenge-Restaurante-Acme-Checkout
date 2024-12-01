import { makePaymentController } from '@/main/factories/application/controllers';
import { MessageBroker } from '@/domain/contracts/message-broker';
import { setupMessageBrokerQueues } from '@/main/config/queues';
import { logger } from '@/infra/helpers';

export const setupSubscribers = async (
  messageBroker: MessageBroker
): Promise<void> => {
  await setupMessageBrokerQueues(messageBroker);

  const paymentChannel = messageBroker.getChannel('payment');

  const paymentConsumeQueueOptions = {
    channel: paymentChannel,
    queueName: 'payment',
    queuePrefetch: 1,
    messages: [],
    performOptions: {
      mode: 'normal',
    },
  };

  const paymentController = makePaymentController();
  await messageBroker.consumeQueue(
    paymentConsumeQueueOptions,
    async (consumeResult: MessageBroker.ConsumeQueueOptions) => {
      for (const message of consumeResult.messages) {
        const { statusCode, data } = await paymentController.handleCreateCheckout(
          message.payload
        );

        if (statusCode === 201) {
          logger.log(`Checkout created: ${JSON.stringify(data)}`)
          await messageBroker.ack(paymentChannel, message.buffer);
          continue;
        }
        logger.error(`Error creating checkout: ${JSON.stringify((data as Error).message)} with code ${statusCode}`)
        if (statusCode === 400) {
          await messageBroker.rejectAck(paymentChannel, message.buffer);
        }
        if (statusCode === 500) {
          await messageBroker.noAck(paymentChannel, message.buffer);
        }
      }
    }
  );


  const webhookChannel = messageBroker.getChannel('webhook-status');

  const webhookConsumeQueueOptions = {
    channel: webhookChannel,
    queueName: 'webhook-status',
    queuePrefetch: 1,
    messages: [],
    performOptions: {
      mode: 'normal',
    },
  };

  await messageBroker.consumeQueue(
    webhookConsumeQueueOptions,
    async (consumeResult: MessageBroker.ConsumeQueueOptions) => {
      for (const message of consumeResult.messages) {
        const { statusCode, data } = await paymentController.handleUpdatePaymentStatus(
          message.payload
        );

        if (statusCode === 201) {
          logger.log(`Checkout updated: ${JSON.stringify(data)}`)
          await messageBroker.ack(webhookChannel, message.buffer);
          continue;
        }
        logger.error(`Error updating checkout: ${JSON.stringify((data as Error).message)} with code ${statusCode}`)
        if (statusCode === 400) {
          await messageBroker.rejectAck(webhookChannel, message.buffer);
        }
        if (statusCode === 500) {
          await messageBroker.noAck(webhookChannel, message.buffer);
        }
      }
    }
  );

};
