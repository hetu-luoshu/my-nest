import { Module } from '@nestjs/common';
import { RagService } from './rag.service.js';
import { RagController } from './rag.controller.js';

@Module({
  controllers: [RagController],
  providers: [RagService],
})
export class RagModule {}
