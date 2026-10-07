import { Test, TestingModule } from '@nestjs/testing';
import { ChainsController } from './chains.controller.js';
import { ChainsService } from './chains.service.js';

describe('ChainsController', () => {
  let controller: ChainsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChainsController],
      providers: [ChainsService],
    }).compile();

    controller = module.get<ChainsController>(ChainsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
