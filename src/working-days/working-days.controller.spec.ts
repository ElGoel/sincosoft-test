import { Test, TestingModule } from '@nestjs/testing';
import { WorkingDaysController } from './working-days.controller';
import { WorkingDaysService } from './working-days.service'; // ⬅️ Add this import

describe('WorkingDaysController', () => {
  let controller: WorkingDaysController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkingDaysController],
      providers: [WorkingDaysService], // ⬅️ Add this line
    }).compile();

    controller = module.get<WorkingDaysController>(WorkingDaysController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
