import { Test, TestingModule } from '@nestjs/testing';
import { McpAgentController } from './mcp-agent.controller.js';
import { McpAgentService } from './mcp-agent.service.js';

describe('McpAgentController', () => {
  let controller: McpAgentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpAgentController],
      providers: [McpAgentService],
    }).compile();

    controller = module.get<McpAgentController>(McpAgentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
