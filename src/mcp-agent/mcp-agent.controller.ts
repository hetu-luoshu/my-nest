import { Controller } from '@nestjs/common';
import { McpAgentService } from './mcp-agent.service.js';

@Controller('mcp-agent')
export class McpAgentController {
  constructor(private readonly mcpAgentService: McpAgentService) {}
}
