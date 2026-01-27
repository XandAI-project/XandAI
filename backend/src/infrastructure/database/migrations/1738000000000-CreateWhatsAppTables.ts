import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateWhatsAppTables1738000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tabela de sessões WhatsApp
    await queryRunner.createTable(
      new Table({
        name: 'whatsapp_sessions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'user_id',
            type: 'varchar',
          },
          {
            name: 'phoneNumber',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'disconnected'",
          },
          {
            name: 'qrCode',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'autoReplyEnabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isPaused',
            type: 'boolean',
            default: false,
          },
          {
            name: 'sessionData',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'persona',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'lastActiveAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'connectedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'disconnectedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Foreign key para users
    await queryRunner.createForeignKey(
      'whatsapp_sessions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Tabela de mensagens WhatsApp
    await queryRunner.createTable(
      new Table({
        name: 'whatsapp_messages',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'session_id',
            type: 'varchar',
          },
          {
            name: 'whatsappMessageId',
            type: 'varchar',
          },
          {
            name: 'chatId',
            type: 'varchar',
          },
          {
            name: 'contactName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'contactNumber',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'direction',
            type: 'varchar',
            default: "'incoming'",
          },
          {
            name: 'type',
            type: 'varchar',
            default: "'text'",
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'pending'",
          },
          {
            name: 'isAIGenerated',
            type: 'boolean',
            default: false,
          },
          {
            name: 'wasProcessed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'aiResponseId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'inReplyToId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'receivedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'sentAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'processedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Foreign key para whatsapp_sessions
    await queryRunner.createForeignKey(
      'whatsapp_messages',
      new TableForeignKey({
        columnNames: ['session_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'whatsapp_sessions',
        onDelete: 'CASCADE',
      }),
    );

    // Index para busca rápida
    await queryRunner.query(
      'CREATE INDEX idx_whatsapp_messages_session_chat ON whatsapp_messages(session_id, chatId)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_whatsapp_messages_whatsapp_id ON whatsapp_messages(whatsappMessageId)',
    );

    // Tabela de configurações WhatsApp
    await queryRunner.createTable(
      new Table({
        name: 'whatsapp_configs',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'user_id',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'tone',
            type: 'varchar',
            default: "'friendly'",
          },
          {
            name: 'style',
            type: 'varchar',
            default: "'conversational'",
          },
          {
            name: 'customInstructions',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'language',
            type: 'varchar',
            default: "'pt-BR'",
          },
          {
            name: 'autoReplyEnabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'responseDelayMs',
            type: 'integer',
            default: 2000,
          },
          {
            name: 'maxResponseDelayMs',
            type: 'integer',
            default: 10000,
          },
          {
            name: 'useTypingIndicator',
            type: 'boolean',
            default: true,
          },
          {
            name: 'blockedContacts',
            type: 'text',
            default: "'[]'",
          },
          {
            name: 'allowedContacts',
            type: 'text',
            default: "'[]'",
          },
          {
            name: 'whitelistMode',
            type: 'boolean',
            default: false,
          },
          {
            name: 'blockedKeywords',
            type: 'text',
            default: "'[]'",
          },
          {
            name: 'ignoreGroups',
            type: 'boolean',
            default: true,
          },
          {
            name: 'ignoreMedia',
            type: 'boolean',
            default: true,
          },
          {
            name: 'maxMessagesPerHour',
            type: 'integer',
            default: 30,
          },
          {
            name: 'maxMessagesPerChatPerHour',
            type: 'integer',
            default: 5,
          },
          {
            name: 'defaultModel',
            type: 'varchar',
            default: "'llama3.2'",
          },
          {
            name: 'temperature',
            type: 'real',
            default: 0.7,
          },
          {
            name: 'maxTokens',
            type: 'integer',
            default: 500,
          },
          {
            name: 'conversationContextLimit',
            type: 'integer',
            default: 10,
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Foreign key para users
    await queryRunner.createForeignKey(
      'whatsapp_configs',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('whatsapp_configs');
    await queryRunner.dropTable('whatsapp_messages');
    await queryRunner.dropTable('whatsapp_sessions');
  }
}
