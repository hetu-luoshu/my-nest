import { Module } from '@nestjs/common';
import { McpClientService } from './mcp-client.service.js';
import { McpClientController } from './mcp-client.controller.js';

@Module({
  controllers: [McpClientController],
  providers: [McpClientService],
})
export class McpClientModule {}
