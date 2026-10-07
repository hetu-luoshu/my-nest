import { Body, Controller, Post } from '@nestjs/common';
import { AgentsService } from './agents.service.js';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) { }

  @Post('run')
  async run(@Body() { prompt }: { prompt: string }) {
    return this.agentsService.runAgent(prompt);
  }
}
