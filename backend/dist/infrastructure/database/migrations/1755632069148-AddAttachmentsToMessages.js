"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddAttachmentsToMessages1755632069148 = void 0;
class AddAttachmentsToMessages1755632069148 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE "chat_messages" 
            ADD COLUMN "attachments" TEXT
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE "chat_messages" 
            DROP COLUMN "attachments"
        `);
    }
}
exports.AddAttachmentsToMessages1755632069148 = AddAttachmentsToMessages1755632069148;
//# sourceMappingURL=1755632069148-AddAttachmentsToMessages.js.map