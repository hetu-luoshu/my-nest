import { Module } from '@nestjs/common';
import { FunctionCallingService } from './function-calling.service.js';
import { FunctionCallingController } from './function-calling.controller.js';

@Module({
  controllers: [FunctionCallingController],
  providers: [FunctionCallingService],
})
export class FunctionCallingModule {}
