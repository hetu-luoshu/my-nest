import { Module } from '@nestjs/common';
import { RagDbService } from './rag-db.service.js';
import { RagDbController } from './rag-db.controller.js';

@Module({
  controllers: [RagDbController],
  providers: [RagDbService],
})
export class RagDbModule {}
