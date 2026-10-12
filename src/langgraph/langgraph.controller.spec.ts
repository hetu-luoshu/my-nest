import { Test, TestingModule } from '@nestjs/testing';
import { LanggraphController } from './langgraph.controller.js';
import { LanggraphService } from './langgraph.service.js';

describe('LanggraphController', () => {
  let controller: LanggraphController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LanggraphController],
      providers: [LanggraphService],
    }).compile();

    controller = module.get<LanggraphController>(LanggraphController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
