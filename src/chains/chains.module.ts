import { Module } from '@nestjs/common';
import { ChainsService } from './chains.service.js';
import { ChainsController } from './chains.controller.js';

@Module({
  controllers: [ChainsController],
  providers: [ChainsService],
})
export class ChainsModule {}
