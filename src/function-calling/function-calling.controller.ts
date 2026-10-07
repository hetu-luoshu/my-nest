import { Body, Controller, Post } from '@nestjs/common';
import { FunctionCallingService } from './function-calling.service.js';

@Controller('function-calling')
export class FunctionCallingController {
  constructor(private readonly functionCallingService: FunctionCallingService) { }

  @Post('run')
  async run(@Body() body: { prompt: string }) {
    return this.functionCallingService.runFunctionCalling(body.prompt);
  }
}
