import { TokenHandler } from '@/application/helpers';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateData1683634567892 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tokenHandler = new TokenHandler();

    // Criação do banco de dados caso não exista
    await queryRunner.query(`
      CREATE DATABASE IF NOT EXISTS restaurante_acme_pagamentos;
    `);

    // Selecionar o banco de dados
    await queryRunner.query(`
      USE restaurante_acme_pagamentos;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
