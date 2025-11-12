import { Test, TestingModule } from '@nestjs/testing';
import { WorkingDaysService } from './working-days.service';

describe('WorkingDaysService', () => {
  let service: WorkingDaysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkingDaysService],
    }).compile();

    service = module.get<WorkingDaysService>(WorkingDaysService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('Example 1: Friday 5pm + 1h → Monday 9am', () => {
    const result = service.addWorkingDaysAndHours({
      hours: 1,
      date: '2025-04-11T22:00:00Z',
    });
    expect(result.date).toBe('2025-04-14T14:00:00Z');
  });

  it('Example 2: Saturday 2pm + 1h → Monday 9am', () => {
    const result = service.addWorkingDaysAndHours({
      hours: 1,
      date: '2025-04-12T19:00:00Z',
    });
    expect(result.date).toBe('2025-04-14T14:00:00Z');
  });

  it('Example 3: Tuesday 3pm + 1d4h → Thursday 10am', () => {
    const result = service.addWorkingDaysAndHours({
      days: 1,
      hours: 4,
      date: '2025-04-08T20:00:00Z',
    });
    expect(result.date).toBe('2025-04-10T15:00:00Z');
  });

  it('Example 4: Sunday 6pm + 1d → Monday 5pm', () => {
    const result = service.addWorkingDaysAndHours({
      days: 1,
      date: '2025-04-13T23:00:00Z',
    });
    expect(result.date).toBe('2025-04-14T22:00:00Z');
  });

  it('Example 5: Workday 8am + 8h → 5pm', () => {
    const result = service.addWorkingDaysAndHours({
      hours: 8,
      date: '2025-04-08T13:00:00Z',
    });
    expect(result.date).toBe('2025-04-08T22:00:00Z');
  });

  it('Example 6: Workday 8am + 1d → next day 8am', () => {
    const result = service.addWorkingDaysAndHours({
      days: 1,
      date: '2025-04-08T13:00:00Z',
    });
    expect(result.date).toBe('2025-04-09T13:00:00Z');
  });

  it('Example 7: Workday 12:30pm + 1d → next day 12pm', () => {
    const result = service.addWorkingDaysAndHours({
      days: 1,
      date: '2025-04-08T17:30:00Z',
    });
    expect(result.date).toBe('2025-04-09T17:00:00Z');
  });

  it('Example 8: Workday 11:30am + 3h → same day 3:30pm', () => {
    const result = service.addWorkingDaysAndHours({
      hours: 3,
      date: '2025-04-08T16:30:00Z',
    });
    expect(result.date).toBe('2025-04-08T20:30:00Z');
  });

  it('Example 9: April 10th + 5d4h (holidays) → April 21st 3pm', () => {
    const result = service.addWorkingDaysAndHours({
      days: 5,
      hours: 4,
      date: '2025-04-10T15:00:00Z',
    });
    expect(result.date).toBe('2025-04-21T20:00:00Z');
  });
});
