import { MessageBroker } from '@/domain/contracts/message-broker';

export const setupMessageBrokerQueues = async (messageBroker: MessageBroker): Promise<void> => {
  await messageBroker.createChannel({
    channelName: 'payment',
    queueName: 'payment',
    arguments: {
      durable: true
    }
  }).then(() => void 0)

  await messageBroker.createChannel({
    channelName: 'kitchen',
    queueName: 'kitchen',
    arguments: {
      durable: true
    }
  }).then(() => void 0)

  await messageBroker.createChannel({
    channelName: 'webhook-status',
    queueName: 'webhook-status',
    arguments: {
      durable: true
    }
  }).then(() => void 0)
};

