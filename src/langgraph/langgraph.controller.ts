import { Controller } from '@nestjs/common';
import { LanggraphService } from './langgraph.service.js';

@Controller('langgraph')
export class LanggraphController {
  constructor(private readonly langgraphService: LanggraphService) {}
}
