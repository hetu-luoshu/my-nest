import { Module } from '@nestjs/common';
import { McpAgentService } from './mcp-agent.service.js';
import { McpAgentController } from './mcp-agent.controller.js';

@Module({
  controllers: [McpAgentController],
  providers: [McpAgentService],
})
export class McpAgentModule {}
