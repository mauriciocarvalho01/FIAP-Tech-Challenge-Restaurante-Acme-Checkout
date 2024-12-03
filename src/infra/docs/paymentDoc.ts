import { PaymentHttp } from '@/domain/contracts/gateways';
import {
  Route,
  Tags,
  Response,
  TsoaController,
  Get,
  Post,
  Body,
  Security,
  Query,
} from '.';
import { Example } from 'tsoa';

@Route('/checkout')
export class CreateCheckoutDoc extends TsoaController {
  /**
   * @summary Rota para criação do checkout
   */
  @Post()
  @Example({
    paymentMethod: 'PIX',
    order: {
      orderId: '0c76844d-3ec3-4ed6-8d61-1d415cf80c68',
      status: 'Recebido',
      totalValue: 55.40
    },
  })
  @Tags('Checkout')
  @Security('apiKey')
  @Response<PaymentHttp.CreateCheckoutOutput>(201, 'Created')
  CreatePayment(@Body() _body: PaymentHttp.CreateCheckoutInput): void {
    /* Documentation - Rout to create checkout */
  }
}

@Route('/checkout')
export class GetCheckoutDoc extends TsoaController {
  /**
   * @summary Rota para obter um checkout
   */
  @Get()
  @Tags('Checkout')
  @Security('apiKey')
  @Response<PaymentHttp.GetPaymentOutput>(200, 'Ok')
  FindPayment(@Query('paymentId') _paymentId?: string, @Query('orderId') orderId?: string): void {
    /* Documentation - Rout to get a checkout */
  }
}



@Route('/webhook')
export class UpdatePaymentStatusDoc extends TsoaController {
  /**
   * @summary Rota para atualizar o status do pagamento
   */
  @Post()
  @Example({
    id: 12345,
    live_mode: true,
    type: 'payment',
    date_created: '2015-03-25T10:04:58.396-04:00',
    user_id: 44444,
    api_version: 'v1',
    action: 'payment.created',
    data: {
      id: 'ecf24931-1486-49a2-9a64-8a623aecffc4',
    },
  })
  @Tags('Payment')
  @Response<PaymentHttp.UpdatePaymentStatusOutput>(200, 'Ok')
  UpdatePaymentStatus(@Body() _body: PaymentHttp.UpdatePaymentStatusInput): void {
    /* Documentation - Rout to update payment status */
  }
}
