import { PaymentServiceError } from '@/domain/errors';
import { TokenHandler } from '@/application/helpers';
import { PaymentService } from '@/domain/contracts/use-cases';
import { PaymentRepository } from '@/infra/repos/mysql';
import { Payment } from '@/domain/contracts/repos';


// Classe PaymentManager para encapsular a lógica de negócios relacionada ao processamento de pagamentos
export class PaymentManager implements PaymentService {
  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly tokenHandler: TokenHandler
  ) {}

  //https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks#editor_10
  // Função para processar o webhook e retornar os dados do pagamento
  // invoice.created	Ocorre sempre que uma fatura é criada.
  // invoice.updated	Ocorre sempre que uma fatura é atualizada.
  // invoice.paid	Ocorre sempre que uma fatura é paga.
  // invoice.payment_failed	Ocorre sempre que o pagamento de uma fatura falha.
  // invoice.canceled	Ocorre sempre que uma fatura é cancelada
  // enum PaymentStatus {
  //   PENDENTE = 'Pendente',
  //   PROCESSANDO = 'Processando',
  //   CONCLUIDO = 'Concluido',
  //   CANCELADO = 'Cancelado',
  // }
  processPaymentWebhook(
    webhook: PaymentService.PaymentWebhookInput
  ): PaymentService.GenericType {
    const paymentData = { orderId: webhook.data.code, status: Payment.PaymentStatus.PENDENTE };
    switch (webhook.type) {
      case 'invoice.created':
        paymentData.status = Payment.PaymentStatus.PENDENTE;
        break;
      case 'invoice.updated':
        paymentData.status = Payment.PaymentStatus.PROCESSANDO;
        break;
      case 'invoice.paid':
        paymentData.status = Payment.PaymentStatus.CONCLUIDO;
        break;
      case 'invoice.payment_failed':
      case 'invoice.canceled':
        paymentData.status = Payment.PaymentStatus.CANCELADO;
        break;
      default:
        throw new PaymentServiceError(new Error(`Unknow webhook type: ${webhook.type}`));
    }

    // Lógica adicional para preencher outras propriedades, se necessário
    return paymentData;
  }

  // Forma de pagamento: Pix
  validatePaymentMethodRule(paymentMethod: string): boolean {
    const paymentMethods = ['pix'];
    return paymentMethods.includes(paymentMethod.toLowerCase());
  }

  validatePaymentStatusRule(order: Payment.Order): boolean {
    // Apenas 'Recebido' é o status do pedido permitidos no pagamento
    if (order.status !== 'Recebido') {
      return false;
    }
    return true;
  }

  async savePayment(
    paymentData: Payment.InsertPaymentInput
  ): Promise<Payment.InsertPaymentOutput> {
    if (!paymentData.paymentId)
      paymentData.paymentId = this.tokenHandler.generateUuid();
    const payment = await this.paymentRepo.savePayment(paymentData);
    if (payment === undefined) throw new Error('Cant insert payment');
    return payment;
  }
}
