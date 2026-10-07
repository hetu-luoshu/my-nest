import { Module } from '@nestjs/common';
import { PromptsService } from './prompts.service.js';
import { PromptsController } from './prompts.controller.js';

@Module({
  controllers: [PromptsController],
  providers: [PromptsService],
})
export class PromptsModule {}
