import {
  adaptExpressGetCheckoutRoute as getCheckout,
  adaptExpressCreateCheckoutRoute as createCheckout,
  adaptExpressUpdatePaymentStatusRoute as updatePaymentStatus
} from '@/main/adapters';
import { makePaymentController } from '@/main/factories/application/controllers';

import { auth } from '@/main/middlewares';

import { Router } from 'express';

export default (router: Router): void => {
  router.get('/checkout', auth, getCheckout(makePaymentController()));
  router.post('/checkout', auth, createCheckout(makePaymentController()));
  router.post('/checkout/webhook', updatePaymentStatus(makePaymentController()));
};
