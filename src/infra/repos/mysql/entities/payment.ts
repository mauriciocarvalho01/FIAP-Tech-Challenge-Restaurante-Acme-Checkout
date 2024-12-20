import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
// import { OrderEntity } from '@/infra/repos/mysql/entities';
import { IsEnum, IsNumber, IsPositive, Min } from 'class-validator';
import { v4 as uuidv4 } from 'uuid';

export enum PaymentStatus {
  PENDENTE = 'Pendente',
  PROCESSANDO = 'Processando',
  CONCLUIDO = 'Concluido',
  CANCELADO = 'Cancelado',
}

@Entity({ name: 'pagamentos' })
export class PaymentEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id?: number;

  @Column({ name: 'id_pagamento', unique: true, default: uuidv4() })
  paymentId!: string;

  @Column({
    name: 'valor_total',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  @IsNumber({}, { message: 'O valor total deve ser um número' })
  @IsPositive({ message: 'O valor total deve ser positivo' })
  @Min(1.0, { message: 'O valor total deve ser pelo menos 1,00' })
  totalValue!: number;

  @Column({ name: 'forma_pagamento', default: 'Pix' })
  paymentMethod!: string;

  @Column({ name: 'status', default: PaymentStatus.PENDENTE })
  @IsEnum(PaymentStatus, {
    message:
      "O status do pagamento deve ser 'Pendente', 'Processando', 'Pronto' ou 'Cancelado'",
  })
  status!: PaymentStatus;

  @Column({ name: 'pix_url', default: '' })
  pixUrl?: string;

  @Column({ name: 'pix_code', default: '' })
  pixCode?: string;

  @Column({ name: 'validade', default: '' })
  expirationDate?: string;

  @Column({ name: 'id_cliente', default: '' })
  clientId?: string;

  @Column({ name: 'id_pedido' })
  orderId!: string;


  @CreateDateColumn({ name: 'data_cadastro', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'data_atualizacao', type: 'timestamp' })
  updatedAt!: Date;
}
