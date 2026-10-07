import { Test, TestingModule } from '@nestjs/testing';
import { FunctionCallingController } from './function-calling.controller.js';
import { FunctionCallingService } from './function-calling.service.js';

describe('FunctionCallingController', () => {
  let controller: FunctionCallingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FunctionCallingController],
      providers: [FunctionCallingService],
    }).compile();

    controller = module.get<FunctionCallingController>(FunctionCallingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
