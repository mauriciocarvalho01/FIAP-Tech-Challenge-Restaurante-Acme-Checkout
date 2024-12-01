
import './config/module-alias';
import { env } from '@/main/config/env';
import { logger } from '@/infra/helpers';
import { MySQLConnection } from '@/infra/repos/mysql/helpers';
import { setupSubscribers } from '@/main/config/subscribers';
import { makeMessageBroker } from '@/main/factories/infra/message-broker';

import 'reflect-metadata';

MySQLConnection.getInstance()
  .initialize()
  .then(async () => {
    logger.info(`Loading application configuration...`)
    const { app } = await import('@/main/config/app');
    app.listen(env.port, () =>
      logger.log(`Server running at http://localhost:${env.port}`)
    );
    await setupSubscribers(makeMessageBroker())
    .then(() => void 0)
    .catch((error) => {
      logger.error(error.message)
    })
  })
  .catch((error) => {
    console.log(error)
    logger.error(`Mysql connection error: ${error.message} ${JSON.stringify(env.database.mysql)}`);
    process.exit(1)
  });
