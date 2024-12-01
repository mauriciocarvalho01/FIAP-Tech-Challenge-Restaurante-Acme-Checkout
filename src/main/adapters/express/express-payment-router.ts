import { PaymentController } from '@/application/controllers';
import { RequestHandler } from 'express';

type PaymentAdapter = (controller: PaymentController) => RequestHandler;
type GenericType<T = any> = T;

const makeResponseHandler = (
  data: GenericType,
  statusCode: number,
  res: GenericType
) => {
  let errors = {};
  try {
    errors = { errors: JSON.parse(data.message) };
  } catch (error) {
    errors = { errors: data.message };
  }
  const json = [200, 201, 204].includes(statusCode) ? data : errors;
  res.status(statusCode).json(json);
};

export const adaptExpressGetCheckoutRoute: PaymentAdapter =
  (controller) => async (req, res) => {
    const { query, locals } = req;
    const { statusCode, data } = await controller.handleGetCheckout({
      ...locals,
      ...query,
    });

    makeResponseHandler(data, statusCode, res);
  };

export const adaptExpressCreateCheckoutRoute: PaymentAdapter =
  (controller) => async (req, res) => {
    const { body } = req;
    const { statusCode, data } = await controller.handleCreateCheckout({ httpOrigin: true, ...body });

    makeResponseHandler(data, statusCode, res);
  };

export const adaptExpressUpdatePaymentStatusRoute: PaymentAdapter =
  (controller) => async (req, res) => {
    const { body } = req;
    const { statusCode, data } =
      await controller.handleUpdatePaymentStatus({ httpOrigin: true, ...body });

    makeResponseHandler(data, statusCode, res);
  };
