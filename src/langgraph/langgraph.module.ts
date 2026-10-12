import { Module } from '@nestjs/common';
import { LanggraphService } from './langgraph.service.js';
import { LanggraphController } from './langgraph.controller.js';

@Module({
  controllers: [LanggraphController],
  providers: [LanggraphService],
})
export class LanggraphModule {}
