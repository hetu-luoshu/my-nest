import { Test, TestingModule } from '@nestjs/testing';
import { ReasoningAgentService } from './reasoning-agent.service';

describe('ReasoningAgentService', () => {
  let service: ReasoningAgentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReasoningAgentService],
    }).compile();

    service = module.get<ReasoningAgentService>(ReasoningAgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
