import { Test, TestingModule } from '@nestjs/testing';
import { WorkingDaysController } from './working-days.controller';

describe('WorkingDaysController', () => {
  let controller: WorkingDaysController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkingDaysController],
    }).compile();

    controller = module.get<WorkingDaysController>(WorkingDaysController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
